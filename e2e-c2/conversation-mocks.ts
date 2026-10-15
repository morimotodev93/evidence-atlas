import type { BrowserContext, Route } from "@playwright/test";
import { C2_ORIGIN, RESEARCH_PATH, fixture, refuse } from "../scripts/c2-playwright-policy.ts";

// Only exact C2 fixture Chat endpoints are mocked. They are installed after
// the normal fail-closed network boundary and never call route.fetch/continue.
export const CONVERSATIONS_URL = `${C2_ORIGIN}${RESEARCH_PATH}/chat/conversations`;
export const CONVERSATION_DETAIL_PATTERN = `${CONVERSATIONS_URL}/*`;
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
  assert: () => void;
  dispose: () => Promise<void>;
};

export async function installConversationMocks(context: BrowserContext): Promise<ConversationMocks> {
  const conversations: ConversationRecord[] = [];
  let sequence = 0;
  let refused = false;
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

  await context.route(CONVERSATIONS_URL, collectionHandler);
  try { await context.route(CONVERSATION_DETAIL_PATTERN, detailHandler); }
  catch {
    await context.unroute(CONVERSATIONS_URL, collectionHandler).catch(() => {});
    refuse("chat-mock-setup");
  }
  return {
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
      try { await context.unroute(CONVERSATION_DETAIL_PATTERN, detailHandler); }
      finally { await context.unroute(CONVERSATIONS_URL, collectionHandler); }
    },
  };
}
