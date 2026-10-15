import type { BrowserContext, Route } from "@playwright/test";
import { C2_ORIGIN, RESEARCH_PATH, fixture, refuse } from "../scripts/c2-playwright-policy.ts";

// Only browser-fetch requests to this one C2 fixture endpoint are intercepted.
// Other URLs/methods remain subject to the existing fail-closed C2 boundary.
export const CONVERSATIONS_URL = `${C2_ORIGIN}${RESEARCH_PATH}/chat/conversations`;
const CREATED_AT = "2026-01-01T00:00:00.000Z";
const RESEARCH_ID = String(fixture.research.id);

type Conversation = {
  id: string;
  researchId: string;
  createdAt: string;
  updatedAt: string;
  preview: string;
};

export type ConversationMocks = {
  assert: () => void;
  dispose: () => Promise<void>;
};

export async function installConversationMocks(context: BrowserContext): Promise<ConversationMocks> {
  const conversations: Conversation[] = [];
  let sequence = 0;
  let refused = false;

  const handle = async (route: Route) => {
    const request = route.request();
    const method = request.method();
    // This handler is registered *after* the normal C2 boundary and takes
    // precedence for its exact URL. It must enforce its own narrow contract.
    if (request.url() !== CONVERSATIONS_URL ||
        request.resourceType() !== "fetch" ||
        request.isNavigationRequest() ||
        (method !== "GET" && method !== "POST")) {
      refused = true;
      await route.abort("blockedbyclient").catch(() => {});
      return;
    }

    try {
      if (method === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", headers: { "cache-control": "no-store" }, body: JSON.stringify(conversations) });
        return;
      }

      const id = `c2-mock-conversation-${++sequence}`;
      const conversation: Conversation = { id, researchId: RESEARCH_ID, createdAt: CREATED_AT, updatedAt: CREATED_AT, preview: "New conversation" };
      // Mutation is only in-memory within this fresh test context; never DB.
      conversations.unshift(conversation);
      await route.fulfill({ status: 201, contentType: "application/json", headers: { "cache-control": "no-store" }, body: JSON.stringify({ id, researchId: RESEARCH_ID, createdAt: CREATED_AT }) });
    } catch {
      refused = true;
      await route.abort("failed").catch(() => {});
    }
  };

  await context.route(CONVERSATIONS_URL, handle);
  return {
    assert() { if (refused) refuse("chat-mock"); },
    async dispose() { await context.unroute(CONVERSATIONS_URL, handle); },
  };
}
