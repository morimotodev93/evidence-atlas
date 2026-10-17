import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { BrowserContext, Request, Route } from "@playwright/test";
import {
  CONVERSATIONS_URL, CONVERSATION_DETAIL_PATTERN, CHAT_URL, STREAM_USER_MESSAGE, STREAM_AI_REPLY, HISTORY_CONVERSATION_ID,
  HISTORY_PREVIEW, HISTORY_USER_MESSAGE, HISTORY_AI_MESSAGE, CITATION_SOURCE, CITATION_AI_TEXT, CITATION_AI_REPLY, installConversationMocks,
} from "../e2e-c2/conversation-mocks.ts";
import { RESEARCH_PATH, C2_ORIGIN, fixture } from "./c2-playwright-policy.ts";
import { parseSourceCitations } from "../src/lib/ai/source-citations.ts";

function fakeContext() {
  const handlers = new Map<string, (route: Route) => Promise<void>>();
  const register = vi.fn(async (pattern: string, listener: (route: Route) => Promise<void>) => { handlers.set(pattern, listener); });
  const unregister = vi.fn(async (pattern: string, listener: (route: Route) => Promise<void>) => {
    if (handlers.get(pattern) === listener) handlers.delete(pattern);
  });
  const context = { route: register, unroute: unregister } as unknown as BrowserContext;
  function send(method: string, url = CONVERSATIONS_URL, resource = "fetch", navigation = false,
    data?: unknown, contentType = "application/json", forcePattern?: string) {
    const request = {
      url: () => url, method: () => method, resourceType: () => resource, isNavigationRequest: () => navigation,
      headers: () => ({ "content-type": contentType }),
      postData: () => data === undefined ? null : typeof data === "string" ? data : JSON.stringify(data),
    } as unknown as Request;
    const fulfill = vi.fn(async (_options: unknown) => {});
    const abort = vi.fn(async (_reason: string) => {});
    const fetch = vi.fn(async () => { throw new Error("Forbidden outbound fetch"); });
    const route = { request: () => request, fulfill, abort, fetch } as unknown as Route;
    return { invoke: () => {
      // Exercise the exact collection or detail handler without a browser.
      // Explicitly invoke the detail handler for malformed URLs so its
      // metadata gate is tested even when Playwright would not match them.
      const pattern = forcePattern ?? (url === CONVERSATIONS_URL ? CONVERSATIONS_URL : url === CHAT_URL ? CHAT_URL : CONVERSATION_DETAIL_PATTERN);
      const handler = handlers.get(pattern);
      if (!handler) throw new Error("No route installed");
      return handler(route);
    }, fulfill, abort, fetch };
  }
  return { context, register, unregister, send };
}

function payload(options: unknown): { status: number; contentType: string; headers: Record<string, string>; body: string } {
  return options as { status: number; contentType: string; headers: Record<string, string>; body: string };
}

describe("C2 Chat conversation mocks (offline only)", () => {
  it("installs only the exact fixture Chat endpoints, separately from normal smoke tests", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    expect(CONVERSATIONS_URL).toBe(`${C2_ORIGIN}${RESEARCH_PATH}/chat/conversations`);
    expect(h.register).toHaveBeenCalledTimes(3);
    expect(h.register.mock.calls.map(([pattern]) => pattern)).toEqual([CONVERSATIONS_URL, CONVERSATION_DETAIL_PATTERN, CHAT_URL]);
    mock.assert();
    await mock.dispose();
    expect(h.unregister).toHaveBeenCalledTimes(3);
    expect(h.unregister.mock.calls.map(([pattern]) => pattern)).toEqual([CHAT_URL, CONVERSATION_DETAIL_PATTERN, CONVERSATIONS_URL]);
  });

  it("returns a local empty list, creates synthetic conversations, then lists newest first", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const empty = h.send("GET");
    await empty.invoke();
    expect(JSON.parse(payload(empty.fulfill.mock.calls[0][0]).body)).toEqual([]);
    for (let index = 1; index <= 2; index++) {
      const post = h.send("POST");
      await post.invoke();
      const response = payload(post.fulfill.mock.calls[0][0]);
      expect(response.status).toBe(201);
      expect(response.contentType).toBe("application/json");
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(JSON.parse(response.body)).toEqual({ id: `c2-mock-conversation-${index}`, researchId: fixture.research.id, createdAt: "2026-01-01T00:00:00.000Z" });
      expect(post.abort).not.toHaveBeenCalled();
      expect(post.fetch).not.toHaveBeenCalled();
    }
    const list = h.send("GET");
    await list.invoke();
    const response = payload(list.fulfill.mock.calls[0][0]);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const conversations = JSON.parse(response.body) as { id: string; preview: string; researchId: string }[];
    expect(conversations.map((c) => c.id)).toEqual(["c2-mock-conversation-2", "c2-mock-conversation-1"]);
    expect(conversations.every((c) => c.preview === "New conversation" && c.researchId === fixture.research.id)).toBe(true);
    expect(list.fetch).not.toHaveBeenCalled();
    mock.assert();
    await mock.dispose();
  });

  it.each([
    ["DELETE", CONVERSATIONS_URL, "fetch", false],
    ["PATCH", CONVERSATIONS_URL, "fetch", false],
    ["POST", `${CONVERSATIONS_URL}?next=1`, "fetch", false],
    ["GET", CONVERSATIONS_URL.replace("localhost:3001", "localhost:3000"), "fetch", false],
    ["GET", CONVERSATIONS_URL, "document", true],
    ["GET", CONVERSATIONS_URL, "xhr", false],
    ["POST", `${CONVERSATIONS_URL}/${HISTORY_CONVERSATION_ID}`, "fetch", false],
    ["GET", `${CONVERSATIONS_URL}/${HISTORY_CONVERSATION_ID}?extra=1`, "fetch", false],
    ["GET", `${CONVERSATIONS_URL}/unrecognized`, "fetch", false],
    ["GET", `${CONVERSATIONS_URL}/${HISTORY_CONVERSATION_ID}`, "document", true],
    ["GET", `${CONVERSATIONS_URL}/${HISTORY_CONVERSATION_ID}`, "xhr", false],
    ["GET", `${CONVERSATIONS_URL.replace("localhost:3001", "localhost:3000")}/${HISTORY_CONVERSATION_ID}`, "fetch", false],
  ] as const)("fails closed for a disallowed chat request", async (method, url, resource, navigation) => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const attempt = h.send(method, url, resource, navigation);
    await attempt.invoke();
    expect(attempt.fulfill).not.toHaveBeenCalled();
    expect(attempt.fetch).not.toHaveBeenCalled();
    expect(attempt.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(() => mock.assert()).toThrow("chat-mock");
    await mock.dispose();
  });

  it("restores a seeded conversation through exact local detail GET with two synthetic messages", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    mock.seedHistory();
    const list = h.send("GET");
    await list.invoke();
    const summaries = JSON.parse(payload(list.fulfill.mock.calls[0][0]).body) as { id: string; preview: string; messages?: unknown }[];
    expect(summaries).toEqual([{
      id: HISTORY_CONVERSATION_ID, researchId: fixture.research.id,
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", preview: HISTORY_PREVIEW,
    }]);
    expect(summaries[0]).not.toHaveProperty("messages");

    const detail = h.send("GET", `${CONVERSATIONS_URL}/${HISTORY_CONVERSATION_ID}`);
    await detail.invoke();
    const response = payload(detail.fulfill.mock.calls[0][0]);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const body = JSON.parse(response.body) as {
      id: string; researchId: string; messages: { authorType: string; content: string; conversationId: string }[]; sources: unknown[];
    };
    expect(body.id).toBe(HISTORY_CONVERSATION_ID);
    expect(body.researchId).toBe(fixture.research.id);
    expect(body.messages.map((message) => [message.authorType, message.content])).toEqual([
      ["USER", HISTORY_USER_MESSAGE], ["AI", HISTORY_AI_MESSAGE],
    ]);
    expect(body.messages.every((message) => message.conversationId === HISTORY_CONVERSATION_ID)).toBe(true);
    expect(body.sources).toEqual([]);
    expect(detail.fetch).not.toHaveBeenCalled();
    expect(detail.abort).not.toHaveBeenCalled();
    mock.assert();
    await mock.dispose();
  });

  it("returns an empty detail for a locally created conversation, without seeding messages", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const created = h.send("POST");
    await created.invoke();
    const id = (JSON.parse(payload(created.fulfill.mock.calls[0][0]).body) as { id: string }).id;
    const detail = h.send("GET", `${CONVERSATIONS_URL}/${id}`);
    await detail.invoke();
    const value = JSON.parse(payload(detail.fulfill.mock.calls[0][0]).body) as { id: string; messages: unknown[]; sources: unknown[] };
    expect(value.id).toBe(id);
    expect(value.messages).toEqual([]);
    expect(value.sources).toEqual([]);
    expect(detail.fetch).not.toHaveBeenCalled();
    mock.assert();
    await mock.dispose();
  });

  it("requires exactly one explicit history seed, never importing private state", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    mock.seedHistory();
    expect(() => mock.seedHistory()).toThrow("chat-mock-seed");
    const detail = h.send("GET", `${CONVERSATIONS_URL}/${HISTORY_CONVERSATION_ID}`);
    await detail.invoke();
    expect(detail.fetch).not.toHaveBeenCalled();
    mock.assert();
    await mock.dispose();
  });

  it("refuses a failed detail fulfillment without any outbound request", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    mock.seedHistory();
    const detail = h.send("GET", `${CONVERSATIONS_URL}/${HISTORY_CONVERSATION_ID}`);
    detail.fulfill.mockRejectedValueOnce(new Error("Synthetic private body"));
    await detail.invoke();
    expect(detail.fetch).not.toHaveBeenCalled();
    expect(detail.abort).toHaveBeenCalledWith("failed");
    expect(() => mock.assert()).toThrow("chat-mock");
    await mock.dispose();
  });

  it("rolls back the collection handler if detail route registration fails", async () => {
    const h = fakeContext();
    h.register.mockImplementationOnce(async () => {});
    h.register.mockRejectedValueOnce(new Error("Synthetic private failure"));
    await expect(installConversationMocks(h.context)).rejects.toThrow("chat-mock-setup");
    expect(h.unregister.mock.calls.map(([pattern]) => pattern)).toEqual([CONVERSATIONS_URL]);
  });

  it("refuses locally on failed fulfillment without sending a network request", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const attempt = h.send("POST");
    attempt.fulfill.mockRejectedValueOnce(new Error("Synthetic private value"));
    await attempt.invoke();
    expect(attempt.fetch).not.toHaveBeenCalled();
    expect(attempt.abort).toHaveBeenCalledWith("failed");
    expect(() => mock.assert()).toThrow("chat-mock");
    await mock.dispose();
  });

  it("returns one synthetic stream-compatible text reply and stores it for the local detail GET", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const create = h.send("POST");
    await create.invoke();
    const id = (JSON.parse(payload(create.fulfill.mock.calls[0][0]).body) as { id: string }).id;
    mock.enableStreaming();
    const reply = h.send("POST", CHAT_URL, "fetch", false, { conversationId: id, message: STREAM_USER_MESSAGE });
    await reply.invoke();
    const result = payload(reply.fulfill.mock.calls[0][0]);
    expect(result.status).toBe(200);
    expect(result.contentType).toBe("text/plain; charset=utf-8");
    expect(result.headers).toMatchObject({ "cache-control": "no-store", "x-content-type-options": "nosniff" });
    // Reproduce the UI's getReader()/TextDecoder consumption. This checks the
    // stream API path, not controlled network chunk timing in Chromium.
    const reader = new Response(result.body).body!.getReader();
    const decoder = new TextDecoder();
    let responseText = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      responseText += decoder.decode(value, { stream: true });
    }
    responseText += decoder.decode();
    expect(responseText).toBe(STREAM_AI_REPLY);
    expect(reply.fetch).not.toHaveBeenCalled();
    expect(reply.abort).not.toHaveBeenCalled();
    const detail = h.send("GET", `${CONVERSATIONS_URL}/${id}`);
    await detail.invoke();
    const messages = (JSON.parse(payload(detail.fulfill.mock.calls[0][0]).body) as { messages: { content: string; authorType: string }[] }).messages;
    expect(messages.map((m) => [m.authorType, m.content])).toEqual([["USER", STREAM_USER_MESSAGE], ["AI", STREAM_AI_REPLY]]);
    const list = h.send("GET");
    await list.invoke();
    expect((JSON.parse(payload(list.fulfill.mock.calls[0][0]).body) as { preview: string }[])[0].preview).toBe(STREAM_USER_MESSAGE);
    mock.assert();
    await mock.dispose();
  });

  it.each([
    ["POST", CHAT_URL, "fetch", false, { conversationId: "c2-mock-conversation-1", message: STREAM_USER_MESSAGE }, "application/json", false],
    ["GET", CHAT_URL, "fetch", false, {}, "application/json", true],
    ["POST", `${CHAT_URL}?other=1`, "fetch", false, {}, "application/json", true],
    ["POST", CHAT_URL.replace("localhost:3001", "localhost:3000"), "fetch", false, {}, "application/json", true],
    ["POST", CHAT_URL, "xhr", false, {}, "application/json", true],
    ["POST", CHAT_URL, "document", true, {}, "application/json", true],
    ["POST", CHAT_URL, "fetch", false, {}, "text/plain", true],
    ["POST", CHAT_URL, "fetch", false, "{bad", "application/json", true],
    ["POST", CHAT_URL, "fetch", false, undefined, "application/json", true],
    ["POST", CHAT_URL, "fetch", false, '{"conversationId":"c2-mock-conversation-1", "message":"Summarize the synthetic research fixture."}', "application/json", true],
    ["POST", CHAT_URL, "fetch", false, { conversationId: "unknown", message: STREAM_USER_MESSAGE }, "application/json", true],
    ["POST", CHAT_URL, "fetch", false, { conversationId: "c2-mock-conversation-1", message: "arbitrary private message" }, "application/json", true],
    ["POST", CHAT_URL, "fetch", false, { conversationId: "c2-mock-conversation-1", message: STREAM_USER_MESSAGE, extra: "unsafe" }, "application/json", true],
    ["POST", CHAT_URL, "fetch", false, { conversationId: "c2-mock-conversation-1", message: "x".repeat(1024) }, "application/json", true],
  ] as const)("blocks an unexpected Chat send locally without ever fetching upstream", async (method, url, resource, navigation, data, contentType, enabled) => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const create = h.send("POST");
    await create.invoke();
    if (enabled) mock.enableStreaming();
    const reply = h.send(method, url, resource, navigation, data, contentType, CHAT_URL);
    await reply.invoke();
    expect(reply.fulfill).not.toHaveBeenCalled();
    expect(reply.fetch).not.toHaveBeenCalled();
    expect(reply.abort).toHaveBeenCalled();
    expect(() => mock.assert()).toThrow("chat-mock");
    await mock.dispose();
  });

  it("fulfills an explicitly enabled synthetic 503 without upstream I/O or stored messages", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const created = h.send("POST");
    await created.invoke();
    const id = (JSON.parse(payload(created.fulfill.mock.calls[0][0]).body) as { id: string }).id;
    mock.enableSendFailure();
    const failure = h.send("POST", CHAT_URL, "fetch", false, { conversationId: id, message: STREAM_USER_MESSAGE });
    await failure.invoke();
    expect(payload(failure.fulfill.mock.calls[0][0])).toEqual({
      status: 503, contentType: "application/json", headers: { "cache-control": "no-store" },
      body: JSON.stringify({ error: "Synthetic Chat send failure." }),
    });
    expect(failure.fetch).not.toHaveBeenCalled();
    expect(failure.abort).not.toHaveBeenCalled();
    const detail = h.send("GET", `${CONVERSATIONS_URL}/${id}`);
    await detail.invoke();
    const response = JSON.parse(payload(detail.fulfill.mock.calls[0][0]).body) as { messages: unknown[] };
    expect(response.messages).toEqual([]);
    const list = h.send("GET");
    await list.invoke();
    expect((JSON.parse(payload(list.fulfill.mock.calls[0][0]).body) as { preview: string }[])[0].preview).toBe("New conversation");
    mock.assert();
    await mock.dispose();
  });

  it("keeps send-success and send-failure modes mutually exclusive", async () => {
    for (const first of ["enableStreaming", "enableSendFailure"] as const) {
      const h = fakeContext();
      const mock = await installConversationMocks(h.context);
      mock[first]();
      const second = first === "enableStreaming" ? "enableSendFailure" : "enableStreaming";
      expect(() => mock[second]()).toThrow("chat-mock-mode");
      mock.assert();
      await mock.dispose();
    }
  });

  it("rejects an unexpected prompt in failure mode instead of sending it upstream", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const create = h.send("POST");
    await create.invoke();
    const id = (JSON.parse(payload(create.fulfill.mock.calls[0][0]).body) as { id: string }).id;
    mock.enableSendFailure();
    const unexpected = h.send("POST", CHAT_URL, "fetch", false, { conversationId: id, message: "unapproved prompt" });
    await unexpected.invoke();
    expect(unexpected.fulfill).not.toHaveBeenCalled();
    expect(unexpected.fetch).not.toHaveBeenCalled();
    expect(unexpected.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(() => mock.assert()).toThrow("chat-mock");
    await mock.dispose();
  });

  it("refuses duplicate synthetic failures and keeps the mock fail-closed", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const create = h.send("POST");
    await create.invoke();
    const id = (JSON.parse(payload(create.fulfill.mock.calls[0][0]).body) as { id: string }).id;
    mock.enableSendFailure();
    const send = () => h.send("POST", CHAT_URL, "fetch", false, { conversationId: id, message: STREAM_USER_MESSAGE });
    const first = send(); await first.invoke();
    const second = send(); await second.invoke();
    expect(first.fulfill).toHaveBeenCalledOnce();
    expect(second.fulfill).not.toHaveBeenCalled();
    expect(second.fetch).not.toHaveBeenCalled();
    expect(second.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(() => mock.assert()).toThrow("chat-mock");
    await mock.dispose();
  });

  it("rolls back synthetic messages if local response fulfillment fails", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const create = h.send("POST");
    await create.invoke();
    const id = (JSON.parse(payload(create.fulfill.mock.calls[0][0]).body) as { id: string }).id;
    mock.enableStreaming();
    const reply = h.send("POST", CHAT_URL, "fetch", false, { conversationId: id, message: STREAM_USER_MESSAGE });
    reply.fulfill.mockRejectedValueOnce(new Error("Synthetic private token"));
    await reply.invoke();
    expect(reply.fetch).not.toHaveBeenCalled();
    expect(reply.abort).toHaveBeenCalledWith("failed");
    const detail = h.send("GET", `${CONVERSATIONS_URL}/${id}`);
    await detail.invoke();
    expect((JSON.parse(payload(detail.fulfill.mock.calls[0][0]).body) as { messages: unknown[] }).messages).toEqual([]);
    expect(() => mock.assert()).toThrow("chat-mock");
    await mock.dispose();
  });

  it("refuses a duplicate response for the same context-local conversation", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const create = h.send("POST");
    await create.invoke();
    const id = (JSON.parse(payload(create.fulfill.mock.calls[0][0]).body) as { id: string }).id;
    mock.enableStreaming();
    const send = () => h.send("POST", CHAT_URL, "fetch", false, { conversationId: id, message: STREAM_USER_MESSAGE });
    const first = send(); await first.invoke();
    const second = send(); await second.invoke();
    expect(second.fulfill).not.toHaveBeenCalled();
    expect(second.fetch).not.toHaveBeenCalled();
    expect(second.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(() => mock.assert()).toThrow("chat-mock");
    await mock.dispose();
  });

  it("parses exactly one citation marker using the application's actual citation parser", () => {
    expect(parseSourceCitations(CITATION_AI_REPLY)).toEqual({
      text: CITATION_AI_TEXT, sourceIds: [CITATION_SOURCE.id],
    });
    expect(CITATION_SOURCE.url).toBe("https://example.invalid/c2-synthetic-evidence");
  });

  it("serves a citation reply and matching metadata only through the synthetic conversation detail", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const create = h.send("POST");
    await create.invoke();
    const id = (JSON.parse(payload(create.fulfill.mock.calls[0][0]).body) as { id: string }).id;
    mock.enableCitations();
    const post = h.send("POST", CHAT_URL, "fetch", false, { conversationId: id, message: STREAM_USER_MESSAGE });
    await post.invoke();
    const result = payload(post.fulfill.mock.calls[0][0]);
    expect(result.status).toBe(200);
    expect(result.contentType).toBe("text/plain; charset=utf-8");
    expect(result.body).toBe(CITATION_AI_REPLY);
    expect(post.fetch).not.toHaveBeenCalled();
    expect(post.abort).not.toHaveBeenCalled();

    const detail = h.send("GET", `${CONVERSATIONS_URL}/${id}`);
    await detail.invoke();
    const body = JSON.parse(payload(detail.fulfill.mock.calls[0][0]).body) as {
      messages: { authorType: string; content: string }[]; sources: { id: string; title: string; url: string }[];
    };
    expect(body.messages.map(({ authorType, content }) => [authorType, content])).toEqual([
      ["USER", STREAM_USER_MESSAGE], ["AI", CITATION_AI_REPLY],
    ]);
    expect(body.sources).toEqual([CITATION_SOURCE]);
    expect(detail.fetch).not.toHaveBeenCalled();
    mock.assert();
    await mock.dispose();
  });

  it("keeps citation mode exclusive with success and failure and refuses repeated sends", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const create = h.send("POST"); await create.invoke();
    const id = (JSON.parse(payload(create.fulfill.mock.calls[0][0]).body) as { id: string }).id;
    mock.enableCitations();
    expect(() => mock.enableStreaming()).toThrow("chat-mock-mode");
    expect(() => mock.enableSendFailure()).toThrow("chat-mock-mode");
    expect(() => mock.enableCitations()).toThrow("chat-mock-mode");
    const post = () => h.send("POST", CHAT_URL, "fetch", false, { conversationId: id, message: STREAM_USER_MESSAGE });
    await post().invoke();
    const duplicate = post(); await duplicate.invoke();
    expect(duplicate.fulfill).not.toHaveBeenCalled();
    expect(duplicate.fetch).not.toHaveBeenCalled();
    expect(duplicate.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(() => mock.assert()).toThrow("chat-mock");
    await mock.dispose();
  });

  it("removes citation state if the locally fulfilled AI reply fails", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    const create = h.send("POST"); await create.invoke();
    const id = (JSON.parse(payload(create.fulfill.mock.calls[0][0]).body) as { id: string }).id;
    mock.enableCitations();
    const reply = h.send("POST", CHAT_URL, "fetch", false, { conversationId: id, message: STREAM_USER_MESSAGE });
    reply.fulfill.mockRejectedValueOnce(new Error("Synthetic private citation token"));
    await reply.invoke();
    expect(reply.fetch).not.toHaveBeenCalled();
    expect(reply.abort).toHaveBeenCalledWith("failed");
    const detail = h.send("GET", `${CONVERSATIONS_URL}/${id}`);
    await detail.invoke();
    const body = JSON.parse(payload(detail.fulfill.mock.calls[0][0]).body) as { messages: unknown[]; sources: unknown[] };
    expect(body.messages).toEqual([]);
    expect(body.sources).toEqual([]);
    expect(() => mock.assert()).toThrow("chat-mock");
    await mock.dispose();
  });

  it("keeps the original four C2 cases on test, with Chat mocked only by chatTest", () => {
    const fixtures = readFileSync(new URL("../e2e-c2/fixtures.ts", import.meta.url), "utf8");
    const smoke = readFileSync(new URL("../e2e-c2/authenticated-smoke.spec.ts", import.meta.url), "utf8");
    const config = readFileSync(new URL("../playwright.c2.config.ts", import.meta.url), "utf8");
    expect(fixtures).toContain("export const chatTest = test.extend");
    expect(smoke).toContain('import { test } from "./fixtures.ts"');
    expect(config).toContain('testMatch: "authenticated-smoke.spec.ts"');
  });
});
