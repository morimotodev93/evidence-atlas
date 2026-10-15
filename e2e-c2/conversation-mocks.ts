import type { BrowserContext, Route } from "@playwright/test";
import { C2_ORIGIN, RESEARCH_PATH, fixture, refuse } from "../scripts/c2-playwright-policy.ts";

// Only exact C2 fixture Chat endpoints are mocked. They are installed after
// the normal fail-closed network boundary and never call route.fetch/continue.
export const CONVERSATIONS_URL = `${C2_ORIGIN}${RESEARCH_PATH}/chat/conversations`;
export const CONVERSATION_DETAIL_PATTERN = `${CONVERSATIONS_URL}/*`;
export const CHAT_URL = `${C2_ORIGIN}${RESEARCH_PATH}/chat`;
export const STREAM_USER_MESSAGE = "Summarize the synthetic research fixture.";
export const STREAM_AI_REPLY = "This is a deterministic local test response.";
export const HISTORY_CONVERSATION_ID = "c2-mock-history-1";
export const HISTORY_PREVIEW = "Synthetic fixture question";
export const HISTORY_USER_MESSAGE = "What does this synthetic fixture show?";
export const HISTORY_AI_MESSAGE = "It shows one deterministic research finding.";
const CREATED_AT = "2026-01-01T00:00:00.000Z";
const RESEARCH_ID = String(fixture.research.id);

type ConversationSummary = {
  id: string;
  researchId: string;
  createdAt: string;
  updatedAt: string;
  preview: string;
};
type ConversationMessage = {
  id: string;
  conversationId: string;
  authorType: "USER" | "AI";
  content: string;
  createdAt: string;
};
type ConversationRecord = { summary: ConversationSummary; messages: ConversationMessage[] };

export type ConversationMocks = {
  seedHistory: () => void;
  enableStreaming: () => void;
  enableSendFailure: () => void;
  assert: () => void;
  dispose: () => Promise<void>;
};

export async function installConversationMocks(context: BrowserContext): Promise<ConversationMocks> {
  const conversations: ConversationRecord[] = [];
  let sequence = 0;
  let refused = false;
  let sendMode: "disabled" | "success" | "failure" = "disabled";
  let failureServed = false;
  const json = (body: unknown, status = 200) => ({
    status, contentType: "application/json", headers: { "cache-control": "no-store" }, body: JSON.stringify(body),
  });
  const abort = async (route: Route, reason: "blockedbyclient" | "failed") => {
    refused = true;
    await route.abort(reason).catch(() => {});
  };
  const isFetch = (route: Route) => route.request().resourceType() === "fetch" && !route.request().isNavigationRequest();

  // Creating and listing conversations do not contact the C2 service or DB.
  const collectionHandler = async (route: Route) => {
    const request = route.request();
    const method = request.method();
    if (request.url() !== CONVERSATIONS_URL || !isFetch(route) || (method !== "GET" && method !== "POST")) {
      await abort(route, "blockedbyclient");
      return;
    }
    try {
      if (method === "GET") {
        await route.fulfill(json(conversations.map((item) => item.summary)));
        return;
      }
      const id = `c2-mock-conversation-${++sequence}`;
      const summary: ConversationSummary = { id, researchId: RESEARCH_ID, createdAt: CREATED_AT, updatedAt: CREATED_AT, preview: "New conversation" };
      // The mutation exists only in this test's fresh in-memory context.
      conversations.unshift({ summary, messages: [] });
      await route.fulfill(json({ id, researchId: RESEARCH_ID, createdAt: CREATED_AT }, 201));
    } catch {
      await abort(route, "failed");
    }
  };

  const detailHandler = async (route: Route) => {
    const request = route.request();
    // Compare the complete URL against an ID actually present in this context:
    // unknown IDs, queries, alternate origins and methods all fail closed.
    const conversation = conversations.find((item) => request.url() === `${CONVERSATIONS_URL}/${item.summary.id}`);
    if (!conversation || request.method() !== "GET" || !isFetch(route)) {
      await abort(route, "blockedbyclient");
      return;
    }
    try {
      await route.fulfill(json({
        id: conversation.summary.id,
        researchId: conversation.summary.researchId,
        createdAt: conversation.summary.createdAt,
        messages: conversation.messages,
        sources: [],
      }));
    } catch {
      await abort(route, "failed");
    }
  };

  // Playwright's route.fulfill supplies a complete text/plain body. Browser
  // fetch exposes it through response.body.getReader(), but chunk boundaries
  // and progressive delivery are not guaranteed by this mock.
  const chatHandler = async (route: Route) => {
    try {
      const request = route.request();
      if (sendMode === "disabled" || request.url() !== CHAT_URL || request.method() !== "POST" ||
          !isFetch(route) || request.headers()["content-type"] !== "application/json") {
        await abort(route, "blockedbyclient");
        return;
      }
      const raw = request.postData();
      if (!raw || raw.length > 512) { await abort(route, "blockedbyclient"); return; }
      let body: unknown;
      try { body = JSON.parse(raw); }
      catch { await abort(route, "blockedbyclient"); return; }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        await abort(route, "blockedbyclient"); return;
      }
      const fields = body as Record<string, unknown>;
      if (Object.keys(fields).length !== 2 || typeof fields.conversationId !== "string" ||
          fields.message !== STREAM_USER_MESSAGE ||
          raw !== JSON.stringify({ conversationId: fields.conversationId, message: STREAM_USER_MESSAGE })) {
        await abort(route, "blockedbyclient"); return;
      }
      const conversation = conversations.find((entry) => entry.summary.id === fields.conversationId);
      // One synthetic response per fresh conversation. No arbitrary user text,
      // unknown ID, provider request or database mutation is allowed.
      if (!conversation || conversation.messages.length !== 0 || (sendMode === "failure" && failureServed)) {
        await abort(route, "blockedbyclient"); return;
      }
      if (sendMode === "failure") {
        // Deliberately return a synthetic HTTP failure through the same exact
        // local route; never abort the network (which would mark the boundary
        // as violated). The UI must roll back optimistic messages itself.
        failureServed = true;
        await route.fulfill(json({ error: "Synthetic Chat send failure." }, 503));
        return;
      }
      const messages: ConversationMessage[] = [
        { id: `c2-mock-stream-user-${sequence}`, conversationId: conversation.summary.id,
          authorType: "USER", content: STREAM_USER_MESSAGE, createdAt: CREATED_AT },
        { id: `c2-mock-stream-ai-${sequence}`, conversationId: conversation.summary.id,
          authorType: "AI", content: STREAM_AI_REPLY, createdAt: CREATED_AT },
      ];
      const oldPreview = conversation.summary.preview;
      // Populate before fulfillment so the UI's immediate detail GET sees the
      // response. Roll back the in-memory change if fulfillment fails.
      conversation.messages.push(...messages);
      conversation.summary.preview = STREAM_USER_MESSAGE;
      try {
        await route.fulfill({
          status: 200, contentType: "text/plain; charset=utf-8",
          headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
          body: STREAM_AI_REPLY,
        });
      } catch {
        conversation.messages.splice(0, conversation.messages.length);
        conversation.summary.preview = oldPreview;
        throw new Error("Local mock fulfillment failed");
      }
    } catch {
      await abort(route, "failed");
    }
  };

  await context.route(CONVERSATIONS_URL, collectionHandler);
  let detailInstalled = false;
  try {
    await context.route(CONVERSATION_DETAIL_PATTERN, detailHandler);
    detailInstalled = true;
    await context.route(CHAT_URL, chatHandler);
  } catch {
    if (detailInstalled) await context.unroute(CONVERSATION_DETAIL_PATTERN, detailHandler).catch(() => {});
    await context.unroute(CONVERSATIONS_URL, collectionHandler).catch(() => {});
    refuse("chat-mock-setup");
  }
  return {
    enableStreaming() {
      if (sendMode !== "disabled") refuse("chat-mock-mode");
      sendMode = "success";
    },
    enableSendFailure() {
      if (sendMode !== "disabled") refuse("chat-mock-mode");
      sendMode = "failure";
    },
    seedHistory() {
      if (conversations.some((item) => item.summary.id === HISTORY_CONVERSATION_ID)) refuse("chat-mock-seed");
      conversations.unshift({
        summary: { id: HISTORY_CONVERSATION_ID, researchId: RESEARCH_ID, createdAt: CREATED_AT, updatedAt: CREATED_AT, preview: HISTORY_PREVIEW },
        messages: [
          { id: "c2-mock-message-user-1", conversationId: HISTORY_CONVERSATION_ID, authorType: "USER", content: HISTORY_USER_MESSAGE, createdAt: CREATED_AT },
          { id: "c2-mock-message-ai-1", conversationId: HISTORY_CONVERSATION_ID, authorType: "AI", content: HISTORY_AI_MESSAGE, createdAt: CREATED_AT },
        ],
      });
    },
    assert() { if (refused) refuse("chat-mock"); },
    async dispose() {
      // Remove the later (more specific) intercept first. Context closes after
      // the test, but both handlers must be cleaned up explicitly.
      try { await context.unroute(CHAT_URL, chatHandler); }
      finally {
        try { await context.unroute(CONVERSATION_DETAIL_PATTERN, detailHandler); }
        finally { await context.unroute(CONVERSATIONS_URL, collectionHandler); }
      }
    },
  };
}
