import { embedQuery } from "@/lib/ai/embed-texts";
import { searchRetrievalChunks } from "@/lib/ai/search-retrieval-chunks";
import { db } from "@/prisma/db";

const RETRIEVAL_CANDIDATE_LIMIT = 10;
const RETRIEVAL_RESULT_LIMIT = 5;
const MAX_RETRIEVAL_DISTANCE = 0.35;

export async function retrieveWorkspaceContext(
  workspaceId: string,
  query: string,
) {
  const queryEmbedding = await embedQuery(query);

  const candidates = await searchRetrievalChunks(
    workspaceId,
    queryEmbedding,
    RETRIEVAL_CANDIDATE_LIMIT,
  );

  const seen = new Set<string>();

  const chunks = candidates
    .filter((candidate) => {
      if (candidate.distance > MAX_RETRIEVAL_DISTANCE) {
        return false;
      }

      const key = `${candidate.sourceType}:${candidate.sourceId}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, RETRIEVAL_RESULT_LIMIT);

  const results = [];

  for (const chunk of chunks) {
    if (chunk.sourceType === "FINDING") {
      const finding = await db.orm.public.Finding.where({
        id: chunk.sourceId,
        researchId: chunk.researchId,
      })
        .include("research")
        .include("sources", (findingSource) => findingSource.include("source"))
        .first();

      if (!finding) {
        continue;
      }

      results.push({
        type: "FINDING" as const,
        researchId: finding.researchId,
        researchTitle: finding.research.title,
        findingId: finding.id,
        content: chunk.content,
        distance: chunk.distance,
        sources: finding.sources.map(({ source }) => ({
          id: source.id,
          title: source.title,
          url: source.url,
        })),
      });

      continue;
    }

    const research = await db.orm.public.Research.where({
      id: chunk.researchId,
      workspaceId,
    }).first();

    if (!research) {
      continue;
    }

    if (chunk.sourceType === "CONCLUSION") {
      results.push({
        type: "CONCLUSION" as const,
        researchId: research.id,
        researchTitle: research.title,
        content: chunk.content,
        distance: chunk.distance,
        sources: [],
      });

      continue;
    }

    results.push({
      type: "RESEARCH" as const,
      researchId: research.id,
      researchTitle: research.title,
      content: chunk.content,
      distance: chunk.distance,
      sources: [],
    });
  }

  return {
    results,
  };
}

export type WorkspaceRetrievalContext = Awaited<
  ReturnType<typeof retrieveWorkspaceContext>
>;
