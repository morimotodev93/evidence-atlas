import { streamText, type ModelMessage } from "ai";

import { auth } from "@/auth";
import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { isPublicDemoMode } from "@/lib/deployment-mode";

import { getChatRateLimit } from "@/lib/ai/chat-rate-limit";
import {
  RESEARCH_MODEL_ID,
  RESEARCH_MODEL_PROVIDER,
  researchModel,
} from "@/lib/ai/model";
import { buildResearchContext } from "@/lib/ai/research-context";
import { retrieveWorkspaceContext } from "@/lib/ai/retrieve-workspace-context";
import { validateSourceCitations } from "@/lib/ai/source-citations";
import { db } from "@/prisma/db";

import { buildChatSystemPrompt } from "@/lib/ai/chat-system-prompt";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  if (isPublicDemoMode()) return new Response(null, { status: 404 });

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

  const rateLimit = await getChatRateLimit().limit(
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

    system: buildChatSystemPrompt(context, retrievalContext),

    messages: conversationMessages,

    async onFinish({ text, finishReason, totalUsage }) {
      await db.orm.public.AiUsageEvent.create({
        workspaceId: research.workspaceId,
        userId: session.user.id,
        researchId: research.id,
        conversationId,
        operation: "CHAT",
        provider: RESEARCH_MODEL_PROVIDER,
        model: RESEARCH_MODEL_ID,
        inputTokens: totalUsage.inputTokens ?? null,
        outputTokens: totalUsage.outputTokens ?? null,
        totalTokens: totalUsage.totalTokens ?? null,
        finishReason,
      });

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
