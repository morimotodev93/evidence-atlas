import { google } from "@ai-sdk/google";
import { isC2Runtime, requireExternalServiceEnabled } from "@/lib/c2/service-policy";

export const RESEARCH_MODEL_PROVIDER = "google";
export const RESEARCH_MODEL_ID = "gemini-3.6-flash";

function blockedModel<T extends object>(): T {
  return new Proxy({} as T, { get() {
    requireExternalServiceEnabled();
    throw new Error("C2 model cannot be used outside its initialization mode.");
  } });
}
export const researchModel = isC2Runtime()
  ? blockedModel<ReturnType<typeof google>>() : google(RESEARCH_MODEL_ID);

export const embeddingModel = isC2Runtime()
  ? blockedModel<ReturnType<typeof google.embedding>>() : google.embedding("gemini-embedding-001");
