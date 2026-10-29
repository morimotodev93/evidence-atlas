import { z } from "zod";

export type DemoChatSource = { id: string; title: string; url: string };
const sourceSchema = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/), title: z.string().max(320), url: z.string().max(2048) }).strict();
const answerSchema = z.object({
  answer: z.string().min(1).max(8000).refine((s) => s.trim().length > 0 && Array.from(s).length <= 4000),
  sources: z.array(sourceSchema).max(10), insufficientEvidence: z.boolean(),
  contextTruncated: z.boolean(), evidenceNotice: z.string().min(1).max(1000),
}).strict();
export type DemoChatAnswer = z.infer<typeof answerSchema>;

// The API already validates model output. Also reject malformed transport data
// and references that do not match this page's public Source metadata.
export function parseDemoChatAnswer(value: unknown, allowed: DemoChatSource[]): DemoChatAnswer {
  const answer = answerSchema.parse(value);
  if ((answer.insufficientEvidence && answer.sources.length !== 0)
    || (!answer.insufficientEvidence && answer.sources.length === 0)
    || new Set(answer.sources.map((s) => s.id)).size !== answer.sources.length) throw new Error("Invalid answer");
  for (const source of answer.sources) {
    const stored = allowed.find((s) => s.id === source.id);
    const url = new URL(source.url);
    if (!stored || stored.url !== source.url || Array.from(stored.title).slice(0, 160).join("") !== source.title
      || !["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid Source");
  }
  return answer;
}

export type DemoChatStatus = "disabled" | "idle" | "verifying" | "ready" | "sending" | "answered" | "error" | "limited";
export type DemoChatState = {
  status: DemoChatStatus; threadId?: string; question?: string; answer?: DemoChatAnswer; notice?: string;
};
class HttpError extends Error { constructor(readonly status: number) { super(); } }

export function demoChatErrorMessage(status: number): string {
  if (status === 429) return "Demo usage or capacity limit reached. Availability may not recover automatically. No question was retried.";
  if (status === 401) return "Your session has expired. Start a new verified session to continue.";
  if (status === 403) return "Chat authorization or verification failed. Start a new verified session to continue.";
  if (status === 404) return "Chat or this public Research is unavailable.";
  if ([400, 408, 413, 415].includes(status)) return "The request was refused. Check your question before submitting again.";
  return "Chat could not complete the request. Its outcome may be uncertain and a question may have been counted. Nothing was retried automatically.";
}

// One in-memory controller per mounted Research. No history, tokens or cookies
// are persisted. Status guards run synchronously, before React rerenders.
export function createDemoChatClient(enabled: boolean, researchId: string, sources: DemoChatSource[], fetcher: typeof fetch = fetch) {
  const initial: DemoChatState = { status: enabled ? "idle" : "disabled" };
  let state = initial;
  let pending: AbortController | undefined;
  let version = 0;
  let attempt = 0;
  const listeners = new Set<() => void>();
  const publish = (next: DemoChatState) => { state = next; listeners.forEach((listener) => listener()); };
  const post = async (body: object, signal: AbortSignal, expected: number) => {
    const response = await fetcher("/api/demo/chat", {
      method: "POST", credentials: "same-origin", mode: "same-origin", cache: "no-store", redirect: "error",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal,
    });
    if (response.status !== expected) throw new HttpError(response.ok ? 503 : response.status);
    return response.json() as Promise<unknown>;
  };
  const fail = (error: unknown) => {
    const status = error instanceof HttpError ? error.status : 503;
    publish({ ...state, status: status === 429 ? "limited" : "error",
      threadId: [401, 403, 404].includes(status) ? undefined : state.threadId,
      notice: demoChatErrorMessage(status) });
  };
  return {
    getSnapshot: () => state,
    getServerSnapshot: () => initial,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    beginVerification() {
      if (!enabled || pending || state.threadId || !["idle", "error"].includes(state.status)) return;
      attempt++;
      publish({ status: "verifying" });
      return attempt;
    },
    verificationFailed(id: number, expired = false) {
      if (id !== attempt || state.status !== "verifying" || pending) return;
      publish({ status: "error", notice: expired ? "Verification expired. Start again with a new challenge." : "Verification failed. Start again with a new challenge." });
    },
    async verified(id: number, token: string) {
      if (!enabled || id !== attempt || state.status !== "verifying" || pending) return;
      pending = new AbortController();
      const current = version;
      try {
        const value = await post({ operation: "session", researchId, turnstileToken: token }, pending.signal, 201);
        const session = z.object({ threadId: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict().parse(value);
        if (current === version) publish({ status: "ready", threadId: session.threadId });
      } catch (error) { if (current === version) fail(error); }
      finally { if (current === version) pending = undefined; }
    },
    async question(message: string) {
      if (!enabled || pending || !state.threadId || !["ready", "answered", "error"].includes(state.status)) return;
      if (!message.trim() || Array.from(message).length > 500
        || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(message)) {
        publish({ ...state, status: "error", notice: "Enter a question of 1–500 Unicode characters." }); return;
      }
      pending = new AbortController();
      const current = version;
      const threadId = state.threadId;
      publish({ status: "sending", threadId, question: message });
      try {
        const answer = parseDemoChatAnswer(await post({ operation: "question", researchId, threadId, message }, pending.signal, 200), sources);
        if (current === version) publish({ status: "answered", threadId, question: message, answer });
      } catch (error) { if (current === version) fail(error); }
      finally { if (current === version) pending = undefined; }
    },
    reset() {
      version++; attempt++; pending?.abort(); pending = undefined;
      publish(initial);
    },
  };
}
