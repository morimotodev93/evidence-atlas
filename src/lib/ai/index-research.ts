import { db } from "@/prisma/db";

import { chunkText } from "@/lib/ai/chunk-text";
import { embedTexts } from "@/lib/ai/embed-texts";
import { buildResearchIndexLockPlan } from "@/lib/ai/research-index-lock";
import * as Sentry from "@sentry/nextjs";

type RetrievalCandidate = {
  workspaceId: string;
  researchId: string;
  sourceType: "FINDING" | "CONCLUSION" | "RESEARCH";
  sourceId: string;
  content: string;
};

type RetrievalChunkInput = RetrievalCandidate & {
  chunkIndex: number;
  content: string;
};

export async function indexResearch(researchId: string) {
  return await Sentry.startSpan(
    {
      name: "index research",
      op: "ai.indexing",
    },
    async (span) => {
      const research = await db.orm.public.Research.where({
        id: researchId,
      }).first();

      if (!research) {
        return null;
      }

      const findings = await db.orm.public.Finding.where({
        researchId,
      }).all();

      const candidates: RetrievalCandidate[] = [];

      for (const finding of findings) {
        if (!finding.content.trim()) {
          continue;
        }

        candidates.push({
          workspaceId: research.workspaceId,
          researchId: research.id,
          sourceType: "FINDING",
          sourceId: finding.id,
          content: finding.content,
        });
      }

      if (research.conclusion?.trim()) {
        candidates.push({
          workspaceId: research.workspaceId,
          researchId: research.id,
          sourceType: "CONCLUSION",
          sourceId: research.id,
          content: research.conclusion,
        });
      }

      const researchContent = [research.title, research.description]
        .filter((value): value is string => Boolean(value?.trim()))
        .join("\n\n");

      if (researchContent) {
        candidates.push({
          workspaceId: research.workspaceId,
          researchId: research.id,
          sourceType: "RESEARCH",
          sourceId: research.id,
          content: researchContent,
        });
      }

      const chunks = candidates.flatMap<RetrievalChunkInput>((candidate) =>
        chunkText(candidate.content).map((content, chunkIndex) => ({
          ...candidate,
          chunkIndex,
          content,
        })),
      );

      const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));

      if (embeddings.length !== chunks.length) {
        throw new Error(
          `Embedding count mismatch: expected ${chunks.length}, received ${embeddings.length}`,
        );
      }

      const lockPlan = buildResearchIndexLockPlan(researchId);

      await db.transaction(async (tx) => {
        await tx.query(lockPlan);

        await tx.orm.public.RetrievalChunk.where({
          researchId,
        }).delete();

        for (let index = 0; index < chunks.length; index++) {
          const chunk = chunks[index];
          const embedding = embeddings[index];

          await tx.orm.public.RetrievalChunk.upsert({
            create: {
              id: crypto.randomUUID(),
              workspaceId: chunk.workspaceId,
              researchId: chunk.researchId,
              sourceType: chunk.sourceType,
              sourceId: chunk.sourceId,
              chunkIndex: chunk.chunkIndex,
              content: chunk.content,
              embedding,
            },

            update: {
              workspaceId: chunk.workspaceId,
              researchId: chunk.researchId,
              content: chunk.content,
              embedding,
            },

            conflictOn: {
              sourceType: chunk.sourceType,
              sourceId: chunk.sourceId,
              chunkIndex: chunk.chunkIndex,
            },
          });
        }
      });

      span.setAttribute(
        "evidence_atlas.index.candidate_count",
        candidates.length,
      );

      span.setAttribute("evidence_atlas.index.chunk_count", chunks.length);

      return {
        researchId,
        candidateCount: candidates.length,
        chunkCount: chunks.length,
      };
    },
  );
}
