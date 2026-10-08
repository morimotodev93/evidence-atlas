import { auth } from "@/auth";
import { isPublicDemoMode } from "@/lib/deployment-mode";
import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";

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
  if (isPublicDemoMode()) return new Response(null, { status: 404 });

  const { id: researchId, conversationId } = await params;

  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let research;

  try {
    research = await requireResearchAccess(session.user.id, researchId);
  } catch (error) {
    if (error instanceof ResearchAccessError) {
      return Response.json({ error: "Research not found." }, { status: 404 });
    }

    throw error;
  }

  const conversation = await db.orm.public.Conversation.where({
    id: conversationId,
    researchId: research.id,
  }).first();

  if (!conversation) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
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
