import "dotenv/config";
import "temporal-polyfill/full/global";

import { embedQuery } from "@/lib/ai/embed-texts";
import { searchRetrievalChunks } from "@/lib/ai/search-retrieval-chunks";

const workspaceId = process.argv[2];
const question = process.argv.slice(3).join(" ").trim();

if (!workspaceId || !question) {
  throw new Error(
    'Usage: pnpm exec tsx scripts/test-vector-search.ts <workspace-id> "question"',
  );
}

const queryEmbedding = await embedQuery(question);

console.log("Query embedding dimensions:", queryEmbedding.length);

const results = await searchRetrievalChunks(workspaceId, queryEmbedding);

console.log(
  results.map((result) => ({
    distance: result.distance,
    sourceType: result.sourceType,
    sourceId: result.sourceId,
    researchId: result.researchId,
    content: result.content,
  })),
);
