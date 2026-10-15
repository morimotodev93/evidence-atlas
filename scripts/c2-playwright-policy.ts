import { C2_ORIGIN } from "./c2-app-target.ts";
import { IDS, fixtureEntries } from "./c2-fixture-plan.ts";

export { C2_ORIGIN };
export const C2_AUTH_PATH = "playwright/.auth/c2-user.json";
export const RESEARCH_PATH = `/research/${IDS.research}`;
export const fixture = Object.fromEntries(fixtureEntries("unused-offline-identity").map((entry) => [entry.table, entry.row]));

export function parseHarnessCommand(args: readonly string[]) {
  const mode = args[0];
  if (!["preflight", "bootstrap", "bootstrap-edge", "run", "chat"].includes(mode) || args.length !== 2 ||
    args[1] !== (mode === "bootstrap" ? "--allow-c2-auth-bootstrap" :
      mode === "bootstrap-edge" ? "--allow-c2-edge-auth-bootstrap" :
      mode === "chat" ? "--allow-c2-chat-mock" : "--allow-c2-readonly")) refuse("command-opt-in");
  return mode as "preflight" | "bootstrap" | "bootstrap-edge" | "run" | "chat";
}

export function refuse(code: string): never {
  // Callers use fixed codes only, never response data/URLs/errors.
  throw new Error(`C2 E2E refused: ${code}. Details suppressed.`);
}

// Pure, fixed selection: no arbitrary executable, profile, proxy or launch args.
// Only the separately opted-in bootstrap-edge command selects installed Edge.
export function bootstrapBrowserLaunchOptions(mode: "bootstrap" | "bootstrap-edge") {
  if (mode === "bootstrap") return { headless: false } as const;
  if (mode === "bootstrap-edge") return { headless: false, channel: "msedge" } as const;
  return refuse("command-opt-in");
}

export function requireC2Url(value: string): URL {
  try {
    const url = new URL(value);
    if (url.origin !== C2_ORIGIN || url.username || url.password || url.hash) refuse("origin");
    return url;
  } catch { return refuse("origin"); }
}
export function requireHarnessEnvironment(env: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;
    if (/^PW_TEST_/i.test(key)) refuse("environment-pw-test");
    if (/^(NODE_OPTIONS|NODE_PATH)$/i.test(key)) refuse("environment-node-preload");
    if (/^(DEBUG|PWDEBUG)$/i.test(key)) refuse("environment-debug");
    if (/^(HTTPS?_PROXY|ALL_PROXY)$/i.test(key)) refuse("environment-proxy");
    if (/^E2E_BASE_URL$/i.test(key) ||
      (/^PUBLIC_DEMO_MODE$/i.test(key) && value !== "false") ||
      (/^C2_RUNTIME_MODE$/i.test(key) && value !== "local") ||
      (/^AUTH_URL$/i.test(key) && value !== C2_ORIGIN)) refuse("environment");
  }
}
export function requireExpectedUser(env: Record<string, string | undefined>) {
  const id = env.C2_FIXTURE_USER_ID;
  const email = env.C2_FIXTURE_USER_EMAIL;
  if (!id || !email || [id, email].some((v) => v !== v.trim() || /[\r\n\0]/.test(v))) refuse("user-selection");
  return { id, email };
}

export type Cookie = { name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: "Strict" | "Lax" | "None" };
export type State = { cookies: Cookie[]; origins: [] };
export type SavedState = { version: 1; origin: string; capturedAt: string; sessionExpiresAt: string; storageState: State };
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function keysOnly(value: Record<string, unknown>, keys: string[]) { return Object.keys(value).length === keys.length && keys.every((key) => key in value); }
function validCookie(value: unknown, now: number): value is Cookie {
  return record(value) && keysOnly(value, ["name", "value", "domain", "path", "expires", "httpOnly", "secure", "sameSite"]) &&
    value.name === "authjs.session-token" && typeof value.value === "string" && value.value.length > 0 && value.value.length <= 4096 && !/[\s\x00-\x1f\x7f]/.test(value.value) &&
    value.domain === "localhost" && value.path === "/" && value.httpOnly === true && value.secure === false && value.sameSite === "Lax" &&
    typeof value.expires === "number" && Number.isFinite(value.expires) && value.expires * 1000 > now;
}
export function requireSession(value: unknown, expected: { id: string; email: string }, now = Date.now()): string {
  if (!record(value) || !record(value.user) || value.user.id !== expected.id || value.user.email !== expected.email ||
      typeof value.expires !== "string" || !Number.isFinite(Date.parse(value.expires)) || Date.parse(value.expires) <= now) refuse("session");
  return value.expires;
}
export function captureAppState(raw: unknown, currentUrl: string, session: unknown, expected: { id: string; email: string }, now = Date.now()): SavedState {
  const url = requireC2Url(currentUrl);
  if (!["/", "/research", RESEARCH_PATH].includes(url.pathname) || url.search) refuse("auth-return");
  const expires = requireSession(session, expected, now);
  if (!record(raw) || !Array.isArray(raw.cookies)) refuse("state");
  // Deliberately discard Google/other cookies and all localStorage/IndexedDB.
  const cookies = raw.cookies.filter((cookie) => record(cookie) && cookie.name === "authjs.session-token" && cookie.domain === "localhost");
  if (cookies.length !== 1 || !validCookie(cookies[0], now)) refuse("state-cookie");
  return { version: 1, origin: C2_ORIGIN, capturedAt: new Date(now).toISOString(), sessionExpiresAt: expires, storageState: { cookies: [{ ...cookies[0] }], origins: [] } };
}
export function validateSavedState(value: unknown, now = Date.now()): SavedState {
  if (!record(value) || !keysOnly(value, ["version", "origin", "capturedAt", "sessionExpiresAt", "storageState"]) || value.version !== 1 || value.origin !== C2_ORIGIN ||
      typeof value.capturedAt !== "string" || typeof value.sessionExpiresAt !== "string" ||
      !Number.isFinite(Date.parse(value.capturedAt)) || Date.parse(value.capturedAt) > now + 60_000 || now - Date.parse(value.capturedAt) > 12 * 60 * 60 * 1000 ||
      !Number.isFinite(Date.parse(value.sessionExpiresAt)) || Date.parse(value.sessionExpiresAt) <= now ||
      !record(value.storageState) || !keysOnly(value.storageState, ["cookies", "origins"]) ||
      !Array.isArray(value.storageState.cookies) || value.storageState.cookies.length !== 1 || !validCookie(value.storageState.cookies[0], now) ||
      !Array.isArray(value.storageState.origins) || value.storageState.origins.length !== 0) refuse("state-untrusted-or-expired");
  return value as SavedState;
}

export type Decision = "allow" | "method" | "origin" | "path" | "query";
export function testRequestDecision(method: string, rawUrl: string): Decision {
  if (method !== "GET") return "method";
  let url: URL;
  try { url = requireC2Url(rawUrl); } catch { return "origin"; }
  // Narrow read-only surface: never auth signin/callback, onboarding, Chat, edits.
  if (!["/", "/research", RESEARCH_PATH, "/api/auth/session", "/api/auth/providers", "/api/inngest", "/favicon.ico"].includes(url.pathname) &&
      !/^\/_next\/static\/[A-Za-z0-9_./%~-]+$/.test(url.pathname)) return "path";
  if ([...url.searchParams.keys()].some((key) => key !== "_rsc") || (url.search && !url.searchParams.has("_rsc"))) return "query";
  return "allow";
}
export function bootstrapRequestAllowed(method: string, rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.username || url.password) return false;
    if (url.origin === C2_ORIGIN) {
      if (method === "POST") return url.pathname === "/api/auth/signin/google";
      return method === "GET" && (testRequestDecision(method, rawUrl) === "allow" ||
        ["/api/auth/signin", "/api/auth/signin/google", "/api/auth/csrf", "/api/auth/callback/google", "/api/auth/error"].includes(url.pathname));
    }
    return ["GET", "POST"].includes(method) && url.protocol === "https:" && url.port === "" &&
      ["google.com", "gstatic.com", "googleusercontent.com"].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch { return false; }
}

export interface ReadResponse { status(): number; url(): string; headers(): Record<string, string>; json(): Promise<unknown>; text(): Promise<string>; }
export interface ReadRequest { get(url: string, options: { maxRedirects: number; timeout: number }): Promise<ReadResponse>; }
export async function checkedGet(request: ReadRequest, path: string, expectedStatus: number): Promise<ReadResponse> {
  const target = `${C2_ORIGIN}${path}`;
  if (testRequestDecision("GET", target) !== "allow") refuse("preflight-path");
  let response: ReadResponse;
  try { response = await request.get(target, { maxRedirects: 0, timeout: 15_000 }); }
  catch { return refuse("http"); }
  if (response.status() !== expectedStatus || response.headers().location || response.url() !== target) refuse("http-status-or-redirect");
  requireC2Url(response.url());
  return response;
}
export async function preflight(request: ReadRequest, expected: { id: string; email: string }, authenticated = true): Promise<string | undefined> {
  try {
    const inngest = await checkedGet(request, "/api/inngest", 503);
    const disabled = await inngest.json();
    if (!record(disabled) || disabled.error !== "Service disabled in C2 runtime." || !/no-store/.test(inngest.headers()["cache-control"] ?? "")) refuse("service-policy");
    const providers = await (await checkedGet(request, "/api/auth/providers", 200)).json();
    if (!record(providers) || Object.keys(providers).length !== 1 || !record(providers.google) || providers.google.id !== "google" || providers.google.type !== "oidc" ||
      providers.google.signinUrl !== `${C2_ORIGIN}/api/auth/signin/google` || providers.google.callbackUrl !== `${C2_ORIGIN}/api/auth/callback/google`) refuse("auth-config");
    const session = await (await checkedGet(request, "/api/auth/session", 200)).json();
    if (!authenticated) {
      if (session !== null && (!record(session) || Object.keys(session).length !== 0)) refuse("bootstrap-not-fresh");
      return;
    }
    const expires = requireSession(session, expected);
    const root = await checkedGet(request, "/", 200);
    const html = await root.text();
    if (!html.includes(String(fixture.workspace.name)) || html.includes("Read-only demo")) refuse("workspace-or-demo");
    return expires;
  } catch { return refuse("preflight"); }
}
