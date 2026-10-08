import "temporal-polyfill/full/global";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getConversation } from "@/app/research/[id]/chat/conversations/[conversationId]/route";
import {
  POST as createConversation,
  GET as getConversations,
} from "@/app/research/[id]/chat/conversations/route";
import { POST as sendChatMessage } from "@/app/research/[id]/chat/route";

const mocks = vi.hoisted(() => {
  class ResearchAccessError extends Error {
    constructor() {
      super("Research access denied");
      this.name = "ResearchAccessError";
    }
  }

  const conversationQuery: {
    first: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    include: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  } = {
    first: vi.fn(),
    update: vi.fn(),
    include: vi.fn(),
    orderBy: vi.fn(),
    all: vi.fn(),
  };

  conversationQuery.include.mockImplementation(() => conversationQuery);
  conversationQuery.orderBy.mockImplementation(() => conversationQuery);

  const messageQuery: {
    orderBy: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  } = {
    orderBy: vi.fn(),
    all: vi.fn(),
  };

  messageQuery.orderBy.mockImplementation(() => messageQuery);

  return {
    ResearchAccessError,
    auth: vi.fn(),
    requireResearchAccess: vi.fn(),

    chatRateLimit: {
      limit: vi.fn(),
    },

    conversationWhere: vi.fn(() => conversationQuery),
    conversationCreate: vi.fn(),
    conversationQuery,

    messageWhere: vi.fn(() => messageQuery),
    messageCreate: vi.fn(),
    messageQuery,

    aiUsageEventCreate: vi.fn(),

    buildResearchContext: vi.fn(),
    retrieveWorkspaceContext: vi.fn(),
    resolveWorkspaceSources: vi.fn(),
    parseSourceCitations: vi.fn(),
    validateSourceCitations: vi.fn(),

    streamText: vi.fn(),
  };
});

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/auth/requireResearchAccess", () => ({
  requireResearchAccess: mocks.requireResearchAccess,
  ResearchAccessError: mocks.ResearchAccessError,
}));

vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        Conversation: {
          where: mocks.conversationWhere,
          create: mocks.conversationCreate,
        },
        Message: {
          where: mocks.messageWhere,
          create: mocks.messageCreate,
        },
        AiUsageEvent: {
          create: mocks.aiUsageEventCreate,
        },
      },
    },
  },
}));

vi.mock("@/lib/ai/chat-rate-limit", () => ({
  chatRateLimit: mocks.chatRateLimit,
}));

vi.mock("@/lib/ai/model", () => ({
  RESEARCH_MODEL_PROVIDER: "google",
  RESEARCH_MODEL_ID: "gemini-3.6-flash",
  researchModel: {},
}));

vi.mock("@/lib/ai/research-context", () => ({
  buildResearchContext: mocks.buildResearchContext,
}));

vi.mock("@/lib/ai/retrieve-workspace-context", () => ({
  retrieveWorkspaceContext: mocks.retrieveWorkspaceContext,
}));

vi.mock("@/lib/ai/resolve-workspace-sources", () => ({
  resolveWorkspaceSources: mocks.resolveWorkspaceSources,
}));

vi.mock("@/lib/ai/source-citations", () => ({
  parseSourceCitations: mocks.parseSourceCitations,
  validateSourceCitations: mocks.validateSourceCitations,
}));

vi.mock("ai", () => ({
  streamText: mocks.streamText,
}));

const researchId = "research-id";
const workspaceId = "workspace-id";
const conversationId = "conversation-id";
const userId = "user-id";

function routeContext() {
  return {
    params: Promise.resolve({
      id: researchId,
    }),
  };
}

function conversationRouteContext() {
  return {
    params: Promise.resolve({
      id: researchId,
      conversationId,
    }),
  };
}

function chatRequest() {
  return new Request(`http://localhost/research/${researchId}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      conversationId,
      message: "What does the evidence show?",
    }),
  });
}

describe("Public Demo deployment chat lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PUBLIC_DEMO_MODE", "true");
    mocks.auth.mockResolvedValue({ user: { id: "existing-session-user" } });
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    { name: "chat POST", handler: sendChatMessage },
    { name: "conversation list GET", handler: getConversations },
    { name: "conversation create POST", handler: createConversation },
    { name: "conversation detail GET", handler: getConversation },
  ])("rejects $name before session, DB, rate limit, or AI work", async ({ handler }) => {
    const response = await handler(new Request("https://example.test/research/research-id/chat"), {
      params: Promise.resolve({ id: "research-id", conversationId: "conversation-id" }),
    });
    expect(response.status).toBe(404);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.requireResearchAccess).not.toHaveBeenCalled();
    expect(mocks.conversationWhere).not.toHaveBeenCalled();
    expect(mocks.conversationCreate).not.toHaveBeenCalled();
    expect(mocks.messageWhere).not.toHaveBeenCalled();
    expect(mocks.messageCreate).not.toHaveBeenCalled();
    expect(mocks.aiUsageEventCreate).not.toHaveBeenCalled();
    expect(mocks.chatRateLimit.limit).not.toHaveBeenCalled();
    expect(mocks.buildResearchContext).not.toHaveBeenCalled();
    expect(mocks.retrieveWorkspaceContext).not.toHaveBeenCalled();
    expect(mocks.resolveWorkspaceSources).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
  });
});

describe("research chat route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.auth.mockResolvedValue({
      user: {
        id: userId,
      },
    });

    mocks.requireResearchAccess.mockResolvedValue({
      id: researchId,
      workspaceId,
    });

    mocks.conversationQuery.first.mockResolvedValue({
      id: conversationId,
      researchId,
    });

    mocks.conversationQuery.all.mockResolvedValue([]);

    mocks.conversationCreate.mockResolvedValue({
      id: conversationId,
      researchId,
      createdAt: "2026-10-03T00:00:00.000Z",
    });

    mocks.chatRateLimit.limit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    mocks.messageQuery.all.mockResolvedValue([]);

    mocks.buildResearchContext.mockResolvedValue({
      findings: [],
    });

    mocks.retrieveWorkspaceContext.mockResolvedValue({
      results: [],
    });

    mocks.validateSourceCitations.mockImplementation((text: string) => text);

    mocks.streamText.mockImplementation(() => ({
      toTextStreamResponse: () => new Response("stream"),
    }));

    mocks.parseSourceCitations.mockReturnValue({
      sourceIds: [],
    });

    mocks.resolveWorkspaceSources.mockResolvedValue([]);
  });

  it("returns 401 for an unauthenticated conversation list request", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await getConversations(
      new Request(`http://localhost/research/${researchId}/chat/conversations`),
      routeContext(),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized.",
    });

    expect(mocks.requireResearchAccess).not.toHaveBeenCalled();
    expect(mocks.conversationWhere).not.toHaveBeenCalled();
    expect(mocks.chatRateLimit.limit).not.toHaveBeenCalled();
  });

  it("returns 404 for a conversation list when the user cannot access the research", async () => {
    mocks.requireResearchAccess.mockRejectedValue(
      new mocks.ResearchAccessError(),
    );

    const response = await getConversations(
      new Request(`http://localhost/research/${researchId}/chat/conversations`),
      routeContext(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Research not found.",
    });

    expect(mocks.requireResearchAccess).toHaveBeenCalledWith(
      userId,
      researchId,
    );
    expect(mocks.conversationWhere).not.toHaveBeenCalled();
  });

  it("lists conversations only after confirming research access", async () => {
    mocks.conversationQuery.all.mockResolvedValue([]);

    const response = await getConversations(
      new Request(`http://localhost/research/${researchId}/chat/conversations`),
      routeContext(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);

    expect(mocks.requireResearchAccess).toHaveBeenCalledWith(
      userId,
      researchId,
    );
    expect(mocks.conversationWhere).toHaveBeenCalledWith({
      researchId,
    });
  });

  it("returns 429 when the AI chat rate limit is exceeded", async () => {
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);

    mocks.chatRateLimit.limit.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: 1_030_000,
    });

    const response = await sendChatMessage(chatRequest(), routeContext());

    expect(response.status).toBe(429);

    await expect(response.json()).resolves.toEqual({
      error: "Too many AI requests. Please try again shortly.",
    });

    expect(response.headers.get("Retry-After")).toBe("30");

    expect(mocks.chatRateLimit.limit).toHaveBeenCalledWith(
      `${workspaceId}:${userId}`,
    );

    expect(mocks.buildResearchContext).not.toHaveBeenCalled();
    expect(mocks.retrieveWorkspaceContext).not.toHaveBeenCalled();
    expect(mocks.messageCreate).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();

    dateNowSpy.mockRestore();
  });

  it("does not consume the rate limit for an invalid chat request", async () => {
    const request = new Request(
      `http://localhost/research/${researchId}/chat`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          message: "",
        }),
      },
    );

    const response = await sendChatMessage(request, routeContext());

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      error: "A conversationId and non-empty message are required.",
    });

    expect(mocks.chatRateLimit.limit).not.toHaveBeenCalled();
    expect(mocks.conversationWhere).not.toHaveBeenCalled();
    expect(mocks.retrieveWorkspaceContext).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
  });

  it("does not create a conversation when the user cannot access the research", async () => {
    mocks.requireResearchAccess.mockRejectedValue(
      new mocks.ResearchAccessError(),
    );

    const response = await createConversation(
      new Request(
        `http://localhost/research/${researchId}/chat/conversations`,
        {
          method: "POST",
        },
      ),
      routeContext(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Research not found.",
    });

    expect(mocks.conversationCreate).not.toHaveBeenCalled();
  });

  it("creates a conversation for an authorized research member", async () => {
    const response = await createConversation(
      new Request(
        `http://localhost/research/${researchId}/chat/conversations`,
        {
          method: "POST",
        },
      ),
      routeContext(),
    );

    expect(response.status).toBe(201);

    expect(mocks.requireResearchAccess).toHaveBeenCalledWith(
      userId,
      researchId,
    );
    expect(mocks.conversationCreate).toHaveBeenCalledWith({
      researchId,
    });
  });

  it("returns 404 before loading a conversation detail when research access is denied", async () => {
    mocks.requireResearchAccess.mockRejectedValue(
      new mocks.ResearchAccessError(),
    );

    const response = await getConversation(
      new Request(
        `http://localhost/research/${researchId}/chat/conversations/${conversationId}`,
      ),
      conversationRouteContext(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Research not found.",
    });

    expect(mocks.conversationWhere).not.toHaveBeenCalled();
    expect(mocks.messageWhere).not.toHaveBeenCalled();
    expect(mocks.resolveWorkspaceSources).not.toHaveBeenCalled();
  });

  it("returns 404 when the conversation does not belong to the authorized research", async () => {
    mocks.conversationQuery.first.mockResolvedValue(null);

    const response = await getConversation(
      new Request(
        `http://localhost/research/${researchId}/chat/conversations/${conversationId}`,
      ),
      conversationRouteContext(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Conversation not found.",
    });

    expect(mocks.conversationWhere).toHaveBeenCalledWith({
      id: conversationId,
      researchId,
    });
    expect(mocks.messageWhere).not.toHaveBeenCalled();
    expect(mocks.resolveWorkspaceSources).not.toHaveBeenCalled();
  });

  it("loads conversation detail from the authorized research workspace", async () => {
    mocks.messageQuery.all.mockResolvedValue([
      {
        id: "message-id",
        conversationId,
        authorType: "AI",
        content: "Supported answer [source:source-id]",
      },
    ]);

    mocks.parseSourceCitations.mockReturnValue({
      sourceIds: ["source-id"],
    });

    mocks.resolveWorkspaceSources.mockResolvedValue([
      {
        id: "source-id",
        title: "Source",
        url: "https://example.com",
      },
    ]);

    const response = await getConversation(
      new Request(
        `http://localhost/research/${researchId}/chat/conversations/${conversationId}`,
      ),
      conversationRouteContext(),
    );

    expect(response.status).toBe(200);

    expect(mocks.conversationWhere).toHaveBeenCalledWith({
      id: conversationId,
      researchId,
    });

    expect(mocks.messageWhere).toHaveBeenCalledWith({
      conversationId,
    });

    expect(mocks.resolveWorkspaceSources).toHaveBeenCalledWith(workspaceId, [
      "source-id",
    ]);
  });

  it("returns 401 for an unauthenticated chat message request without writing", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await sendChatMessage(chatRequest(), routeContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized.",
    });

    expect(mocks.requireResearchAccess).not.toHaveBeenCalled();
    expect(mocks.messageCreate).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
    expect(mocks.chatRateLimit.limit).not.toHaveBeenCalled();
  });

  it("returns 404 for an inaccessible research without writing or invoking AI", async () => {
    mocks.requireResearchAccess.mockRejectedValue(
      new mocks.ResearchAccessError(),
    );

    const response = await sendChatMessage(chatRequest(), routeContext());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Research not found.",
    });

    expect(mocks.conversationWhere).not.toHaveBeenCalled();
    expect(mocks.messageCreate).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
    expect(mocks.chatRateLimit.limit).not.toHaveBeenCalled();
  });

  it("returns 404 when the conversation does not belong to the authorized research", async () => {
    mocks.conversationQuery.first.mockResolvedValue(null);

    const response = await sendChatMessage(chatRequest(), routeContext());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Conversation not found.",
    });

    expect(mocks.conversationWhere).toHaveBeenCalledWith({
      id: conversationId,
      researchId,
    });

    expect(mocks.chatRateLimit.limit).not.toHaveBeenCalled();

    expect(mocks.messageCreate).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
  });

  it("records AI usage and persists a completed AI message", async () => {
    const response = await sendChatMessage(chatRequest(), routeContext());

    expect(response.status).toBe(200);
    expect(mocks.streamText).toHaveBeenCalledOnce();

    const streamOptions = mocks.streamText.mock.calls[0]?.[0] as {
      onFinish: (result: {
        text: string;
        finishReason: string;
        totalUsage: {
          inputTokens?: number;
          outputTokens?: number;
          totalTokens?: number;
        };
      }) => Promise<void>;
    };

    await streamOptions.onFinish({
      text: "The evidence supports this conclusion.",
      finishReason: "stop",
      totalUsage: {
        inputTokens: 120,
        outputTokens: 40,
        totalTokens: 160,
      },
    });

    expect(mocks.aiUsageEventCreate).toHaveBeenCalledWith({
      workspaceId,
      userId,
      researchId,
      conversationId,
      operation: "CHAT",
      provider: "google",
      model: "gemini-3.6-flash",
      inputTokens: 120,
      outputTokens: 40,
      totalTokens: 160,
      finishReason: "stop",
    });

    expect(mocks.validateSourceCitations).toHaveBeenCalledWith(
      "The evidence supports this conclusion.",
      expect.any(Set),
    );

    expect(mocks.messageCreate).toHaveBeenNthCalledWith(1, {
      conversationId,
      authorType: "USER",
      content: "What does the evidence show?",
    });

    expect(mocks.messageCreate).toHaveBeenNthCalledWith(2, {
      conversationId,
      authorType: "AI",
      content: "The evidence supports this conclusion.",
    });
  });

  it("records AI usage but does not persist an incomplete AI message", async () => {
    const response = await sendChatMessage(chatRequest(), routeContext());

    expect(response.status).toBe(200);

    const streamOptions = mocks.streamText.mock.calls[0]?.[0] as {
      onFinish: (result: {
        text: string;
        finishReason: string;
        totalUsage: {
          inputTokens?: number;
          outputTokens?: number;
          totalTokens?: number;
        };
      }) => Promise<void>;
    };

    await streamOptions.onFinish({
      text: "Partial generated response",
      finishReason: "length",
      totalUsage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },
    });

    expect(mocks.aiUsageEventCreate).toHaveBeenCalledWith({
      workspaceId,
      userId,
      researchId,
      conversationId,
      operation: "CHAT",
      provider: "google",
      model: "gemini-3.6-flash",
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      finishReason: "length",
    });

    expect(mocks.validateSourceCitations).not.toHaveBeenCalled();

    expect(mocks.messageCreate).toHaveBeenCalledTimes(1);
    expect(mocks.messageCreate).toHaveBeenCalledWith({
      conversationId,
      authorType: "USER",
      content: "What does the evidence show?",
    });
  });

  it("stores null for unavailable token usage values", async () => {
    await sendChatMessage(chatRequest(), routeContext());

    const streamOptions = mocks.streamText.mock.calls[0]?.[0] as {
      onFinish: (result: {
        text: string;
        finishReason: string;
        totalUsage: {
          inputTokens?: number;
          outputTokens?: number;
          totalTokens?: number;
        };
      }) => Promise<void>;
    };

    await streamOptions.onFinish({
      text: "Completed response",
      finishReason: "stop",
      totalUsage: {},
    });

    expect(mocks.aiUsageEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      }),
    );
  });
});
