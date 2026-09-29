import type { GoogleEmbeddingModelOptions } from "@ai-sdk/google";
import { embedMany } from "ai";

import { embeddingModel } from "@/lib/ai/model";

const EMBEDDING_DIMENSIONS = 768;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: "RETRIEVAL_DOCUMENT",
      } satisfies GoogleEmbeddingModelOptions,
    },
  });

  return embeddings;
}
