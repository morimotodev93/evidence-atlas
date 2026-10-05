import { google } from "@ai-sdk/google";

export const RESEARCH_MODEL_PROVIDER = "google";
export const RESEARCH_MODEL_ID = "gemini-3.6-flash";

export const researchModel = google(RESEARCH_MODEL_ID);

export const embeddingModel = google.embedding("gemini-embedding-001");
