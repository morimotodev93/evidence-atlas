import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { BrowserContext, Request, Route } from "@playwright/test";
import {
  CONVERSATIONS_URL, CONVERSATION_DETAIL_PATTERN, HISTORY_CONVERSATION_ID,
  HISTORY_PREVIEW, HISTORY_USER_MESSAGE, HISTORY_AI_MESSAGE, installConversationMocks,
} from "../e2e-c2/conversation-mocks.ts";
import { RESEARCH_PATH, C2_ORIGIN, fixture } from "./c2-playwright-policy.ts";

function fakeContext() {
  const handlers = new Map<string, (route: Route) => Promise<void>>();
  const register = vi.fn(async (pattern: string, listener: (route: Route) => Promise<void>) => { handlers.set(pattern, listener); });
  const unregister = vi.fn(async (pattern: string, listener: (route: Route) => Promise<void>) => {
    if (handlers.get(pattern) === listener) handlers.delete(pattern);
  });
  const context = { route: register, unroute: unregister } as unknown as BrowserContext;
  function send(method: string, url = CONVERSATIONS_URL, resource = "fetch", navigation = false) {
    const request = { url: () => url, method: () => method, resourceType: () => resource, isNavigationRequest: () => navigation } as unknown as Request;
    const fulfill = vi.fn(async (_options: unknown) => {});
    const abort = vi.fn(async (_reason: string) => {});
    const fetch = vi.fn(async () => { throw new Error("Forbidden outbound fetch"); });
    const route = { request: () => request, fulfill, abort, fetch } as unknown as Route;
    return { invoke: () => {
      // Exercise the exact collection or detail handler without a browser.
      // Explicitly invoke the detail handler for malformed URLs so its
      // metadata gate is tested even when Playwright would not match them.
      const pattern = url === CONVERSATIONS_URL ? CONVERSATIONS_URL : CONVERSATION_DETAIL_PATTERN;
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
  it("installs only the exact fixture URL, separately from normal smoke tests", async () => {
    const h = fakeContext();
    const mock = await installConversationMocks(h.context);
    expect(CONVERSATIONS_URL).toBe(`${C2_ORIGIN}${RESEARCH_PATH}/chat/conversations`);
    expect(h.register).toHaveBeenCalledTimes(2);
    expect(h.register.mock.calls.map(([pattern]) => pattern)).toEqual([CONVERSATIONS_URL, CONVERSATION_DETAIL_PATTERN]);
    mock.assert();
    await mock.dispose();
    expect(h.unregister).toHaveBeenCalledTimes(2);
    expect(h.unregister.mock.calls.map(([pattern]) => pattern)).toEqual([CONVERSATION_DETAIL_PATTERN, CONVERSATIONS_URL]);
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

  it("keeps the original four C2 cases on test, with Chat mocked only by chatTest", () => {
    const fixtures = readFileSync(new URL("../e2e-c2/fixtures.ts", import.meta.url), "utf8");
    const smoke = readFileSync(new URL("../e2e-c2/authenticated-smoke.spec.ts", import.meta.url), "utf8");
    const config = readFileSync(new URL("../playwright.c2.config.ts", import.meta.url), "utf8");
    expect(fixtures).toContain("export const chatTest = test.extend");
    expect(smoke).toContain('import { test } from "./fixtures.ts"');
    expect(config).toContain('testMatch: "authenticated-smoke.spec.ts"');
  });
});
