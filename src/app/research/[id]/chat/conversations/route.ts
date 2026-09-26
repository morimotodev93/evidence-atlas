import { db } from "@/prisma/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
