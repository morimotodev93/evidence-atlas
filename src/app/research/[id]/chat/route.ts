import { streamText, type ModelMessage } from "ai";

import { researchModel } from "@/lib/ai/model";
import { buildResearchContext } from "@/lib/ai/research-context";
import { db } from "@/prisma/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body: unknown = await request.json();

  if (
    typeof body !== "object" ||
    body === null ||
    !("conversationId" in body) ||
    typeof body.conversationId !== "string" ||
    body.conversationId.trim().length === 0 ||
    !("message" in body) ||
    typeof body.message !== "string" ||
    body.message.trim().length === 0
  ) {
    return Response.json(
      { error: "A conversationId and non-empty message are required." },
      { status: 400 },
    );
  }

  const conversationId = body.conversationId.trim();
  const message = body.message.trim();

  const conversation = await db.orm.public.Conversation.where({
    id: conversationId,
    researchId: id,
  }).first();

  if (!conversation) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }

  const context = await buildResearchContext(id);

  if (!context) {
    return Response.json({ error: "Research not found." }, { status: 404 });
  }

  const previousMessages = await db.orm.public.Message.where({
    conversationId,
  })
    .orderBy((message) => message.createdAt.asc())
    .all();

  await db.orm.public.Message.create({
    conversationId,
    authorType: "USER",
    content: message,
  });

  const conversationMessages: ModelMessage[] = [
    ...previousMessages.map(
      (previousMessage): ModelMessage => ({
        role: previousMessage.authorType === "USER" ? "user" : "assistant",
        content: previousMessage.content,
      }),
    ),
    {
      role: "user",
      content: message,
    },
  ];

  const result = streamText({
    model: researchModel,

    system: `You are an AI research assistant inside Evidence Atlas.

Answer the user's question using only the supplied research context.

Rules:
- Treat the research context as the available evidence.
- Do not invent facts that are not supported by the context.
- If the context is insufficient, say so clearly.
- Distinguish findings from source metadata.
- Source titles and URLs identify supporting evidence; they do not imply that you have read the source contents.
- Be concise and evidence-oriented.

Research context:
${JSON.stringify(context, null, 2)}`,

    messages: conversationMessages,

    async onFinish({ text, finishReason }) {
      if (finishReason !== "stop" || text.trim().length === 0) {
        return;
      }

      await db.orm.public.Message.create({
        conversationId,
        authorType: "AI",
        content: text,
      });
    },
  });

  return result.toTextStreamResponse();
}
