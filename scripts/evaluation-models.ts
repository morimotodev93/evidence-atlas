import { groq } from "@ai-sdk/groq";

import { RESEARCH_MODEL_ID, researchModel } from "../src/lib/ai/model";

export const GROQ_EVALUATION_MODEL_ID = "openai/gpt-oss-120b";

export type EvaluationProvider = "gemini" | "groq";

export function getEvaluationModel(provider: EvaluationProvider) {
  if (provider === "groq") {
    return {
      model: groq(GROQ_EVALUATION_MODEL_ID),
      modelId: GROQ_EVALUATION_MODEL_ID,
      apiKeyName: "GROQ_API_KEY",
    };
  }

  return {
    model: researchModel,
    modelId: RESEARCH_MODEL_ID,
    apiKeyName: "GOOGLE_GENERATIVE_AI_API_KEY",
  };
}
