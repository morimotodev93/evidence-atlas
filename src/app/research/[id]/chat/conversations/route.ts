import { db } from "@/prisma/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const research = await db.orm.public.Research.first({ id });

  if (!research) {
    return Response.json({ error: "Research not found." }, { status: 404 });
  }

  const conversations = await db.orm.public.Conversation.where({
    researchId: research.id,
  })
    .include("messages", (messages) =>
      messages
        .where({
          authorType: "USER",
        })
        .orderBy((message) => message.createdAt.asc())
        .limit(1),
    )
    .orderBy((conversation) => conversation.updatedAt.desc())
    .all();

  return Response.json(
    conversations.map((conversation) => ({
      id: conversation.id,
      researchId: conversation.researchId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      preview: conversation.messages[0]?.content ?? "New conversation",
    })),
  );
}

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const research = await db.orm.public.Research.first({ id });

  if (!research) {
    return Response.json({ error: "Research not found." }, { status: 404 });
  }

  const conversation = await db.orm.public.Conversation.create({
    researchId: research.id,
  });

  return Response.json(
    {
      id: conversation.id,
      researchId: conversation.researchId,
      createdAt: conversation.createdAt,
    },
    { status: 201 },
  );
}
