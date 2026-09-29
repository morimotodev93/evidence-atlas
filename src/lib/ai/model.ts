import { google } from "@ai-sdk/google";

export const researchModel = google("gemini-3.6-flash");

export const embeddingModel = google.embedding("gemini-embedding-001");
