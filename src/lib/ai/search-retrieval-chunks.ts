import { db } from "@/prisma/db";

const DEFAULT_LIMIT = 5;

export async function searchRetrievalChunks(
  workspaceId: string,
  queryEmbedding: number[],
  limit = DEFAULT_LIMIT,
) {
  const plan = db.sql.public.retrievalChunk
    .select(
      "id",
      "workspaceId",
      "researchId",
      "sourceType",
      "sourceId",
      "chunkIndex",
      "content",
    )
    .select("distance", (fields, fns) =>
      fns.cosineDistance(fields.embedding, queryEmbedding),
    )
    .where((fields, fns) => fns.eq(fields.workspaceId, workspaceId))
    .orderBy(
      (fields, fns) => fns.cosineDistance(fields.embedding, queryEmbedding),
      { direction: "asc" },
    )
    .limit(limit)
    .build();

  return db.runtime().query(plan);
}
