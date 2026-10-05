import { streamText, type ModelMessage } from "ai";

import { auth } from "@/auth";
import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";

import { chatRateLimit } from "@/lib/ai/chat-rate-limit";
import { researchModel } from "@/lib/ai/model";
import { buildResearchContext } from "@/lib/ai/research-context";
import { retrieveWorkspaceContext } from "@/lib/ai/retrieve-workspace-context";
import { validateSourceCitations } from "@/lib/ai/source-citations";
import { db } from "@/prisma/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id: researchId } = await params;

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
    researchId: research.id,
  }).first();

  if (!conversation) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }

  const rateLimit = await chatRateLimit.limit(
    `${research.workspaceId}:${session.user.id}`,
  );

  if (!rateLimit.success) {
    return Response.json(
      {
        error: "Too many AI requests. Please try again shortly.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000)),
          ),
        },
      },
    );
  }

  const context = await buildResearchContext(research.id);

  if (!context) {
    return Response.json({ error: "Research not found." }, { status: 404 });
  }

  const retrievalContext = await retrieveWorkspaceContext(
    research.workspaceId,
    message,
  );

  const allowedSourceIds = new Set([
    ...context.findings.flatMap((finding) =>
      finding.sources.map((source) => source.id),
    ),
    ...retrievalContext.results.flatMap((result) =>
      result.type === "FINDING"
        ? result.sources.map((source) => source.id)
        : [],
    ),
  ]);

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

  await db.orm.public.Conversation.where({
    id: conversationId,
    researchId: research.id,
  }).update({
    updatedAt: Temporal.Now.instant(),
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

    Answer the user's question using only the supplied current research context and workspace retrieval context.

    Evidence rules:
    - Treat the current research context and workspace retrieval context as the available knowledge.
    - Do not invent facts that are not supported by the supplied context.
    - If the supplied context is insufficient, say so clearly.
    - Base factual claims primarily on Findings and Research conclusions.
    - Retrieved FINDING results are evidence from the workspace.
    - Retrieved CONCLUSION results are synthesized conclusions from previous Research. They may be used as accumulated knowledge, but they do not have direct Source citations unless supporting Findings are supplied.
    - Retrieved RESEARCH results are discovery/context metadata. Do not treat a Research title or description as equivalent to a supported Finding.
    - Existing knowledge may be reused, extended, or challenged. Do not assume previous Research is automatically correct or authoritative.

    Source rules:
    - Source titles and URLs identify supporting evidence; they do not imply that you have read the source contents.
    - Cite a Source only when it is linked to a Finding that supports the claim.
    - When citing a Source, use exactly this format: [source:<source-id>].
    - Use only Source IDs present in the supplied contexts.
    - Never invent or modify a Source ID.
    - Do not reproduce Source URLs in the answer.
    - If a Finding has no linked Source, you may use the Finding but do not fabricate a citation.
    - Do not cite Sources from unrelated Findings merely because they exist in the current Research or workspace.
    - Do not claim that a cited Source directly states something unless that information is present in the supplied context.
    - Be concise and evidence-oriented.

    Current research context:
    ${JSON.stringify(context, null, 2)}

    Workspace retrieval context:
    ${JSON.stringify(retrievalContext, null, 2)}`,

    messages: conversationMessages,

    async onFinish({ text, finishReason }) {
      if (finishReason !== "stop" || text.trim().length === 0) {
        return;
      }

      const validatedText = validateSourceCitations(text, allowedSourceIds);

      await db.orm.public.Message.create({
        conversationId,
        authorType: "AI",
        content: validatedText,
      });
    },
  });

  return result.toTextStreamResponse();
}
