import "server-only";

import { DEMO_CHAT_LIMITS, DEMO_CHAT_TURNSTILE, requireDemoChatEnabled } from "./chat-config";

export const DEMO_CHAT_COOKIE = "__Host-ea-demo-chat";
export const DEMO_CHAT_BODY_BYTES = 8_192;
export const DEMO_CHAT_SESSION_SECONDS = DEMO_CHAT_LIMITS.anonymousSessionWindowSeconds;
export const DEMO_CHAT_LEASE_MS = 60_000;
export const demoChatId = /^[A-Za-z0-9_-]{43}$/; // 256 random bits, base64url

export class DemoChatError extends Error {
  constructor(public readonly status: number) {
    super("Demo Chat request refused.");
  }
}

function allowedDemoOrigins(): URL[] {
  const values = process.env.DEMO_CHAT_ALLOWED_ORIGINS?.split(",").map((s) => s.trim());
  if (!values?.length || values.some((s) => !s)) throw new DemoChatError(503);
  return values.map((value) => {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.origin !== value || url.username || url.password) {
        throw new Error();
      }
      return url;
    } catch { throw new DemoChatError(503); }
  });
}

export function requireDemoChatOrigin(request: Request): string {
  requireDemoChatEnabled();
  const origin = request.headers.get("origin");
  const allowed = allowedDemoOrigins().find((url) => url.origin === origin);
  // Do not derive either trust boundary from Host, Forwarded or the request URL.
  if (!allowed) throw new DemoChatError(403);
  return allowed.hostname;
}

export type DemoChatInput =
  | { operation: "session"; researchId: string; turnstileToken: string }
  | { operation: "question"; researchId: string; threadId: string; message: string };

export async function readDemoChatInput(request: Request): Promise<DemoChatInput> {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "")) {
    throw new DemoChatError(415);
  }
  if (request.headers.has("content-encoding")) throw new DemoChatError(415);
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > DEMO_CHAT_BODY_BYTES)) {
    throw new DemoChatError(413);
  }
  if (!request.body) throw new DemoChatError(400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let expired = false;
  const timer = setTimeout(() => { expired = true; void reader.cancel().catch(() => {}); }, 5_000);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > DEMO_CHAT_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        throw new DemoChatError(413);
      }
      chunks.push(value);
    }
    if (expired) throw new DemoChatError(408);
  } finally { clearTimeout(timer); reader.releaseLock(); }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } catch { throw new DemoChatError(400); }
  if (!body || typeof body !== "object" || Array.isArray(body)
    || typeof body.researchId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(body.researchId)) {
    throw new DemoChatError(400);
  }
  const keys = Object.keys(body).sort().join(",");
  if (body.operation === "session" && keys === "operation,researchId,turnstileToken"
    && validTurnstileToken(body.turnstileToken)) return body as DemoChatInput;
  if (body.operation === "question" && keys === "message,operation,researchId,threadId"
    && typeof body.threadId === "string" && demoChatId.test(body.threadId)
    && typeof body.message === "string" && body.message.trim().length > 0
    // Unicode code points, before trimming; combining sequences count separately.
    && Array.from(body.message).length <= DEMO_CHAT_LIMITS.maxInputCharacters
    && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(body.message)) {
    return body as DemoChatInput;
  }
  throw new DemoChatError(400);
}

export function validTurnstileToken(token: unknown): token is string {
  return typeof token === "string" && token.length > 0 && token.length <= 2048
    && /^[A-Za-z0-9._-]+$/.test(token);
}

export async function verifyDemoTurnstile(token: string, hostname: string, fetcher = fetch) {
  requireDemoChatEnabled();
  if (!allowedDemoOrigins().some((url) => url.hostname === hostname)) throw new DemoChatError(403);
  if (!validTurnstileToken(token) || !process.env.DEMO_TURNSTILE_SECRET_KEY?.trim()) {
    throw new DemoChatError(403);
  }
  try {
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5_000),
      body: new URLSearchParams({ secret: process.env.DEMO_TURNSTILE_SECRET_KEY.trim(), response: token }),
    });
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (result?.success !== true || result.hostname !== hostname
      || result.action !== DEMO_CHAT_TURNSTILE.expectedAction) throw new Error();
    // Siteverify enforces its single-use, 300-second token lifetime. No retries.
  } catch { throw new DemoChatError(403); }
}

export function readDemoSession(request: Request): string {
  const values = (request.headers.get("cookie") ?? "").split(";")
    .map((part) => part.trim()).filter((part) => part.startsWith(`${DEMO_CHAT_COOKIE}=`));
  const value = values[0]?.slice(DEMO_CHAT_COOKIE.length + 1);
  if (values.length !== 1 || !value || !demoChatId.test(value)) throw new DemoChatError(401);
  return value;
}

export function demoSessionCookie(id: string) {
  if (!demoChatId.test(id)) throw new DemoChatError(503);
  return `${DEMO_CHAT_COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DEMO_CHAT_SESSION_SECONDS}`;
}
