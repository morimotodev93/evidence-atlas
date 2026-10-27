import "server-only";

import { createGroq } from "@ai-sdk/groq";

import { DEMO_CHAT_MODEL_ID, requireDemoChatEnabled } from "./chat-config";

// Lazy, uncached construction rechecks the emergency switch on every call.
// No browser/request model selector and no GROQ_API_KEY fallback.
// Construction does not generate text or contact the provider.
export function getDemoChatModel() {
  requireDemoChatEnabled();
  return createGroq({ apiKey: process.env.DEMO_GROQ_API_KEY!.trim() })(DEMO_CHAT_MODEL_ID);
}
