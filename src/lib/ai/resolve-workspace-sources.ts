import { db } from "@/prisma/db";

export async function resolveWorkspaceSources(
  workspaceId: string,
  sourceIds: string[],
) {
  const uniqueSourceIds = [...new Set(sourceIds)];

  if (uniqueSourceIds.length === 0) {
    return [];
  }

  const research = await db.orm.public.Research.where({
    workspaceId,
  }).all();

  const researchIds = research.map((item) => item.id);

  if (researchIds.length === 0) {
    return [];
  }

  const sources = await db.orm.public.Source.where((source) =>
    source.id.in(uniqueSourceIds),
  )
    .where((source) => source.researchId.in(researchIds))
    .all();

  return sources.map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
  }));
}
