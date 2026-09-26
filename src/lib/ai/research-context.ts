import { db } from "@/prisma/db";

export async function buildResearchContext(researchId: string) {
  const research = await db.orm.public.Research.where({
    id: researchId,
  }).first();

  if (!research) {
    return null;
  }

  const sources = await db.orm.public.Source.where({
    researchId,
  }).all();

  const findings = await db.orm.public.Finding.where({
    researchId,
  })
    .include("sources", (findingSource) => findingSource.include("source"))
    .all();

  return {
    research: {
      id: research.id,
      title: research.title,
      description: research.description,
      conclusion: research.conclusion,
    },
    findings: findings.map((finding) => ({
      id: finding.id,
      content: finding.content,
      sources: finding.sources.map(({ source }) => ({
        id: source.id,
        title: source.title,
        url: source.url,
      })),
    })),
    sources: sources.map((source) => ({
      id: source.id,
      title: source.title,
      url: source.url,
    })),
  };
}

export type ResearchContext = NonNullable<
  Awaited<ReturnType<typeof buildResearchContext>>
>;
