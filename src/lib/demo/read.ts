import "server-only";

import { db } from "@/prisma/db";

// IDs choose the publication scope. Names only guard against misconfiguration.
async function resolveDemoWorkspace() {
  const id = process.env.DEMO_WORKSPACE_ID?.trim();
  if (!id) return null;

  const workspace = await db.orm.public.Workspace.where({ id })
    .select("id", "name", "description")
    .include("organization", (organization) => organization.select("id", "name"))
    .first();

  const organization = workspace?.organization;
  if (!workspace || !organization || workspace.name !== "AI-Assisted Software Development" ||
    organization.name !== "Evidence Atlas Demo") return null;

  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    organization: { id: organization.id, name: organization.name },
  };
}

async function readTags(researchId: string, workspaceId: string) {
  const links = await db.orm.public.ResearchTag.where({ researchId })
    .include("tag", (tag) => tag.select("id", "name", "workspaceId"))
    .all();
  return links.flatMap(({ tag }) => tag?.workspaceId === workspaceId
    ? [{ id: tag.id, name: tag.name }] : []);
}

export async function getDemoWorkspace() {
  const workspace = await resolveDemoWorkspace();
  if (!workspace) return null;

  const researches = await db.orm.public.Research.where({ workspaceId: workspace.id })
    .select("id", "title", "description", "status", "createdAt")
    .orderBy((research) => research.createdAt.asc())
    .all();

  const items = await Promise.all(researches.map(async (research) => ({
    id: research.id,
    title: research.title,
    description: research.description,
    status: research.status,
    createdAt: research.createdAt,
    tags: await readTags(research.id, workspace.id),
  })));
  return { ...workspace, researches: items };
}

export async function getDemoResearch(researchId: string) {
  const workspace = await resolveDemoWorkspace();
  if (!workspace) return null;

  const research = await db.orm.public.Research.where({ id: researchId, workspaceId: workspace.id })
    .select("id", "title", "description", "status", "conclusion", "createdAt", "updatedAt")
    .first();
  if (!research) return null;

  // No child query runs until the parent has passed the public Workspace boundary.
  const [sources, findings, comments, tags] = await Promise.all([
    db.orm.public.Source.where({ researchId: research.id })
      .select("id", "title", "url", "updatedAt").all(),
    db.orm.public.Finding.where({ researchId: research.id })
      .select("id", "content", "displayStyle", "updatedAt")
      .include("sources", (link) => link.select("sourceId")
        .include("source", (source) => source.select("id", "researchId", "title", "url", "updatedAt")))
      .all(),
    db.orm.public.Comment.where({ researchId: research.id })
      .select("id", "content", "createdAt", "updatedAt")
      .include("user", (user) => user.select("name", "username"))
      .all(),
    readTags(research.id, workspace.id),
  ]);

  return {
    research: {
      id: research.id, title: research.title, description: research.description,
      status: research.status, conclusion: research.conclusion,
      createdAt: research.createdAt, updatedAt: research.updatedAt,
    },
    sources: sources.map((source) => ({
      id: source.id, title: source.title, url: source.url, updatedAt: source.updatedAt,
    })),
    findings: findings.map((finding) => ({
      id: finding.id, content: finding.content, displayStyle: finding.displayStyle,
      updatedAt: finding.updatedAt,
      sources: finding.sources.flatMap(({ sourceId, source }) => source?.researchId === research.id
        ? [{
          sourceId, source: {
            id: source.id, title: source.title, url: source.url, updatedAt: source.updatedAt,
          }
        }] : []),
    })),
    comments: comments.map((comment) => ({
      id: comment.id, content: comment.content,
      authorName: comment.user?.name ?? comment.user?.username ?? "Unknown user",
      createdAt: comment.createdAt, updatedAt: comment.updatedAt,
    })),
    tags,
  };
}
