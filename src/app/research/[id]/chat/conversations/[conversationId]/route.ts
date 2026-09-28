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

  const messages = await db.orm.public.Message.where({
    conversationId: conversation.id,
  })
    .orderBy((message) => message.createdAt.asc())
    .all();

  return Response.json({
    id: conversation.id,
    researchId: conversation.researchId,
    createdAt: conversation.createdAt,
    messages,
  });
}
