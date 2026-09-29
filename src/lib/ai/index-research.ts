import { db } from "@/prisma/db";

import { chunkText } from "@/lib/ai/chunk-text";
import { embedTexts } from "@/lib/ai/embed-texts";

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

  await db.transaction(async (tx) => {
    await tx.orm.public.RetrievalChunk.where({
      researchId,
    }).delete();

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const embedding = embeddings[index];

      await tx.orm.public.RetrievalChunk.create({
        id: crypto.randomUUID(),
        workspaceId: chunk.workspaceId,
        researchId: chunk.researchId,
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding,
      });
    }
  });

  return {
    researchId,
    candidateCount: candidates.length,
    chunkCount: chunks.length,
  };
}
