import { searchRetrievalChunks } from "@/lib/ai/search-retrieval-chunks";
import { embedQuery } from "../src/lib/ai/embed-texts";

const workspaceId = process.argv[2];

if (!workspaceId) {
  console.error(
    "Usage: pnpm exec tsx scripts/evaluate-retrieval.ts <workspaceId>",
  );
  process.exit(1);
}

const queries = [
  "Prisma 8のドキュメントについて",
  "Prisma ORM 8をNestJSで使う方法",
  "Prisma Computeへのデプロイ方法",
  "RAGアーキテクチャについて",
];

for (const query of queries) {
  const queryEmbedding = await embedQuery(query);

  const results = await searchRetrievalChunks(workspaceId, queryEmbedding);

  console.log("\n========================================");
  console.log(`Query: ${query}`);
  console.log("========================================");

  for (const [index, result] of results.entries()) {
    console.log({
      rank: index + 1,
      distance: result.distance,
      sourceType: result.sourceType,
      sourceId: result.sourceId,
      researchId: result.researchId,
      content: result.content,
    });
  }
}
