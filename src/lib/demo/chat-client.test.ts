import { describe, expect, it, vi } from "vitest";
import { createDemoChatClient, parseDemoChatAnswer } from "./chat-client";

const source = { id: "source-1", title: "Stored source", url: "https://example.com/evidence" };
const answer = { answer: "Evidence-based answer", sources: [source], insufficientEvidence: false,
  contextTruncated: false, evidenceNotice: "Stored metadata does not verify accuracy." };
const threadId = "t".repeat(43);
function setup(enabled = true, researchId = "public-research") {
  const fetcher = vi.fn<typeof fetch>();
  const client = createDemoChatClient(enabled, researchId, [source], fetcher);
  return { client, fetcher };
}
async function ready() {
  const value = setup();
  value.fetcher.mockResolvedValueOnce(Response.json({ threadId }, { status: 201 }));
  await value.client.verified(value.client.beginVerification()!, "token");
  return value;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("Demo-only client transport and state", () => {
  it("never starts verification or sends requests while disabled", async () => {
    const { client, fetcher } = setup(false);
    expect(client.beginVerification()).toBeUndefined();
    await client.verified(1, "token");
    await client.question("Question");
    expect(client.getSnapshot()).toEqual({ status: "disabled" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires an explicit start and valid attempt before session establishment", async () => {
    const { client, fetcher } = setup();
    await client.verified(0, "token");
    await client.question("Question");
    expect(client.getSnapshot().status).toBe("idle");
    expect(fetcher).not.toHaveBeenCalled();
    const attempt = client.beginVerification()!;
    expect(client.getSnapshot().status).toBe("verifying");
    fetcher.mockResolvedValueOnce(Response.json({ threadId }, { status: 201 }));
    await client.verified(attempt, "token");
    expect(client.getSnapshot()).toEqual({ status: "ready", threadId });
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("/api/demo/chat", expect.objectContaining({
      method: "POST", credentials: "same-origin", mode: "same-origin", redirect: "error", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "session", researchId: "public-research", turnstileToken: "token" }),
    }));
    await client.verified(attempt, "token");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])("handles Turnstile failure/expiry (%s) and requires a fresh attempt", async (expired) => {
    const { client, fetcher } = setup();
    const first = client.beginVerification()!;
    client.verificationFailed(first, expired);
    expect(client.getSnapshot()).toMatchObject({ status: "error", notice: expect.stringContaining(expired ? "expired" : "failed") });
    const second = client.beginVerification()!;
    await client.verified(first, "old-token");
    expect(fetcher).not.toHaveBeenCalled();
    expect(second).not.toBe(first);
  });
  it.each([400, 401, 403, 404, 408, 413, 415, 429, 503])("classifies session HTTP %s without retry", async (status) => {
    const { client, fetcher } = setup();
    fetcher.mockResolvedValueOnce(Response.json({ error: "Demo Chat unavailable." }, { status }));
    await client.verified(client.beginVerification()!, "token");
    expect(client.getSnapshot()).toMatchObject({ status: status === 429 ? "limited" : "error", notice: expect.any(String) });
    expect(client.getSnapshot().threadId).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("sends one independent question using the bound Research/thread and no Operation ID/history", async () => {
    const { client, fetcher } = await ready();
    fetcher.mockResolvedValueOnce(Response.json(answer));
    await client.question("Question");
    expect(JSON.parse(fetcher.mock.calls[1][1]!.body as string)).toEqual({ operation: "question", researchId: "public-research", threadId, message: "Question" });
    expect(client.getSnapshot()).toMatchObject({ status: "answered", question: "Question", answer });
  });
  it("synchronously prevents duplicate session starts and question submissions", async () => {
    const { client, fetcher } = setup();
    const session = deferred<Response>();
    fetcher.mockReturnValueOnce(session.promise);
    const id = client.beginVerification()!;
    const first = client.verified(id, "token");
    client.beginVerification();
    await client.verified(id, "token");
    client.verificationFailed(id, true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    session.resolve(Response.json({ threadId }, { status: 201 }));
    await first;
    const response = deferred<Response>();
    fetcher.mockReturnValueOnce(response.promise);
    const question = client.question("First");
    expect(client.getSnapshot().status).toBe("sending");
    await client.question("Duplicate");
    expect(fetcher).toHaveBeenCalledTimes(2);
    response.resolve(Response.json(answer));
    await question;
  });
  it.each([401, 403, 404, 429, 503])("handles question HTTP %s with no automatic resend", async (status) => {
    const { client, fetcher } = await ready();
    fetcher.mockResolvedValueOnce(Response.json({ error: "untrusted detail" }, { status }));
    await client.question("Question");
    expect(client.getSnapshot().status).toBe(status === 429 ? "limited" : "error");
    expect(client.getSnapshot().notice).not.toContain("untrusted detail");
    expect(client.getSnapshot().threadId).toBe([401, 403, 404].includes(status) ? undefined : threadId);
    if (status === 429) { await client.question("Again"); expect(client.beginVerification()).toBeUndefined(); }
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each(["", " ", "x".repeat(501), "\ud800"])("rejects invalid question locally", async (message) => {
    const { client, fetcher } = await ready();
    await client.question(message);
    expect(client.getSnapshot().status).toBe("error");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("counts Unicode code points rather than UTF-16 units", async () => {
    const { client, fetcher } = await ready();
    fetcher.mockResolvedValueOnce(Response.json(answer));
    await client.question("😀".repeat(500));
    expect(client.getSnapshot().status).toBe("answered");
  });
  it.each(["network", "json", "session"])("fails closed on invalid %s response, without retry", async (kind) => {
    const { client, fetcher } = setup();
    if (kind === "network") fetcher.mockRejectedValueOnce(new Error("private details"));
    else fetcher.mockResolvedValueOnce(kind === "json" ? new Response("invalid", { status: 201 }) : Response.json({ threadId: "bad" }, { status: 201 }));
    await client.verified(client.beginVerification()!, "token");
    expect(client.getSnapshot()).toMatchObject({ status: "error", notice: expect.stringContaining("Nothing was retried") });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects an empty answer rather than showing a successful empty conversation", async () => {
    const { client, fetcher } = await ready();
    fetcher.mockResolvedValueOnce(Response.json({ ...answer, answer: " " }));
    await client.question("Question");
    expect(client.getSnapshot().status).toBe("error");
    expect(client.getSnapshot().answer).toBeUndefined();
  });
  it.each(["session", "question"])("aborts old %s on scope cleanup and ignores late results", async (operation) => {
    const { client, fetcher } = operation === "question" ? await ready() : setup();
    const response = deferred<Response>();
    fetcher.mockReturnValueOnce(response.promise);
    const pending = operation === "question" ? client.question("Old Research question") : client.verified(client.beginVerification()!, "token");
    const signal = fetcher.mock.lastCall![1]!.signal!;
    client.reset();
    const other = setup(true, "other-public-research");
    expect(signal.aborted).toBe(true);
    response.resolve(Response.json(operation === "question" ? answer : { threadId }, { status: operation === "question" ? 200 : 201 }));
    await pending;
    expect(client.getSnapshot()).toEqual({ status: "idle" });
    expect(other.client.getSnapshot()).toEqual({ status: "idle" });
    expect(other.fetcher).not.toHaveBeenCalled();
  });
});

describe("Demo answer and public Source transport boundary", () => {
  it("accepts stored Sources and evidence/truncation notices", () => {
    expect(parseDemoChatAnswer(answer, [source])).toEqual(answer);
    expect(parseDemoChatAnswer({ ...answer, sources: [], insufficientEvidence: true, contextTruncated: true }, [])).toMatchObject({ insufficientEvidence: true, contextTruncated: true });
  });
  it.each([
    null, {}, { ...answer, answer: "" }, { ...answer, sources: [] },
    { ...answer, sourceIds: [source.id] }, { ...answer, insufficientEvidence: true },
    { ...answer, sources: [source, source] },
    { ...answer, sources: [{ ...source, id: "foreign-source" }] },
    { ...answer, sources: [{ ...source, title: "Invented title" }] },
    { ...answer, sources: [{ ...source, url: "https://other.example/" }] },
    { ...answer, sources: [{ ...source, url: "javascript:alert(1)" }] },
  ])("rejects malformed or unauthorized response %#", (value) => {
    expect(() => parseDemoChatAnswer(value, [source])).toThrow();
  });
  it.each(["javascript:alert(1)", "https://user:pass@example.com/", "//example.com"])("refuses unsafe stored URL %s too", (url) => {
    const unsafe = { ...source, url };
    expect(() => parseDemoChatAnswer({ ...answer, sources: [unsafe] }, [unsafe])).toThrow();
  });
  it("matches the server's 160-code-point Source title projection", () => {
    const stored = { ...source, title: "😀".repeat(170) };
    expect(parseDemoChatAnswer({ ...answer, sources: [{ ...stored, title: "😀".repeat(160) }] }, [stored]).sources[0].title).toBe("😀".repeat(160));
  });
});
