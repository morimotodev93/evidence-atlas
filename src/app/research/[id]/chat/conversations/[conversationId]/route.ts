import { resolveWorkspaceSources } from "@/lib/ai/resolve-workspace-sources";
import { parseSourceCitations } from "@/lib/ai/source-citations";
import { db } from "@/prisma/db";

type RouteContext = {
  params: Promise<{
    id: string;
    conversationId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id, conversationId } = await params;

  const conversation = await db.orm.public.Conversation.where({
    id: conversationId,
    researchId: id,
  }).first();

  if (!conversation) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }

  const research = await db.orm.public.Research.where({
    id: conversation.researchId,
  }).first();

  if (!research) {
    return Response.json({ error: "Research not found." }, { status: 404 });
  }

  const messages = await db.orm.public.Message.where({
    conversationId: conversation.id,
  })
    .orderBy((message) => message.createdAt.asc())
    .all();

  const citedSourceIds = [
    ...new Set(
      messages
        .filter((message) => message.authorType === "AI")
        .flatMap((message) => parseSourceCitations(message.content).sourceIds),
    ),
  ];

  const sources = await resolveWorkspaceSources(
    research.workspaceId,
    citedSourceIds,
  );

  return Response.json({
    id: conversation.id,
    researchId: conversation.researchId,
    createdAt: conversation.createdAt,
    messages,
    sources,
  });
}
