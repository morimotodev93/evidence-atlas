import "temporal-polyfill/full/global";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getConversation } from "@/app/research/[id]/chat/conversations/[conversationId]/route";
import {
  POST as createConversation,
  GET as getConversations,
} from "@/app/research/[id]/chat/conversations/route";
import { POST as sendChatMessage } from "@/app/research/[id]/chat/route";
import { buildChatSystemPrompt } from "@/lib/ai/chat-system-prompt";
import type { ResearchContext } from "@/lib/ai/research-context";
import type { WorkspaceRetrievalContext } from "@/lib/ai/retrieve-workspace-context";

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
  getChatRateLimit: () => mocks.chatRateLimit,
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

function expectNoChatWrites() {
  expect(mocks.conversationCreate).not.toHaveBeenCalled();
  expect(mocks.conversationQuery.update).not.toHaveBeenCalled();
  expect(mocks.messageCreate).not.toHaveBeenCalled();
  expect(mocks.aiUsageEventCreate).not.toHaveBeenCalled();
}

function completionCallback() {
  expect(mocks.streamText).toHaveBeenCalledOnce();
  const options = mocks.streamText.mock.calls[0][0] as {
    onFinish: (result: {
      text: string;
      finishReason: string;
      totalUsage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
    }) => Promise<void>;
  };
  return options.onFinish;
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
  ])(
    "rejects $name before session, DB, rate limit, or AI work",
    async ({ handler }) => {
      const response = await handler(
        new Request("https://example.test/research/research-id/chat"),
        {
          params: Promise.resolve({
            id: "research-id",
            conversationId: "conversation-id",
          }),
        },
      );
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
    },
  );
});

describe("research chat route authorization", () => {
  beforeEach(async () => {
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

    const { parseSourceCitations } = await vi.importActual<
      typeof import("@/lib/ai/source-citations")
    >("@/lib/ai/source-citations");
    mocks.parseSourceCitations.mockImplementation(parseSourceCitations);

    mocks.resolveWorkspaceSources.mockResolvedValue([]);
  });

  const routes = [
    { name: "chat POST", run: () => sendChatMessage(chatRequest(), routeContext()) },
    { name: "conversation list GET", run: () => getConversations(new Request("http://localhost/chat/conversations"), routeContext()) },
    { name: "conversation create POST", run: () => createConversation(new Request("http://localhost/chat/conversations", { method: "POST" }), routeContext()) },
    { name: "conversation detail GET", run: () => getConversation(new Request("http://localhost/chat/conversations/detail"), conversationRouteContext()) },
  ];

  it.each(routes)("propagates unexpected authentication failures in $name", async ({ run }) => {
    const error = new Error("Synthetic private session failure");
    mocks.auth.mockRejectedValueOnce(error);

    await expect(run()).rejects.toBe(error);
    expect(mocks.requireResearchAccess).not.toHaveBeenCalled();
    expect(mocks.conversationWhere).not.toHaveBeenCalled();
    expect(mocks.chatRateLimit.limit).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
    expectNoChatWrites();
  });

  it.each(routes)("propagates unexpected access lookup failures in $name instead of returning 404", async ({ run }) => {
    const error = new Error("Synthetic private database failure");
    mocks.requireResearchAccess.mockRejectedValueOnce(error);

    await expect(run()).rejects.toBe(error);
    expect(mocks.conversationWhere).not.toHaveBeenCalled();
    expect(mocks.messageWhere).not.toHaveBeenCalled();
    expect(mocks.chatRateLimit.limit).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
    expectNoChatWrites();
  });

  it.each(routes.slice(2))("returns 401 for unauthenticated $name without reading or writing", async ({ run }) => {
    mocks.auth.mockResolvedValueOnce(null);

    const response = await run();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(mocks.requireResearchAccess).not.toHaveBeenCalled();
    expect(mocks.conversationWhere).not.toHaveBeenCalled();
    expect(mocks.messageWhere).not.toHaveBeenCalled();
    expect(mocks.resolveWorkspaceSources).not.toHaveBeenCalled();
    expectNoChatWrites();
  });

  it("propagates Conversation lookup failure without returning a not-found or successful chat response", async () => {
    const error = new Error("Synthetic private Conversation failure");
    mocks.conversationQuery.first.mockRejectedValueOnce(error);

    await expect(sendChatMessage(chatRequest(), routeContext())).rejects.toBe(error);
    expect(mocks.chatRateLimit.limit).not.toHaveBeenCalled();
    expect(mocks.buildResearchContext).not.toHaveBeenCalled();
    expect(mocks.messageWhere).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
    expectNoChatWrites();
  });

  it("propagates Conversation creation failure instead of returning 201", async () => {
    const error = new Error("Synthetic private Conversation write failure");
    mocks.conversationCreate.mockRejectedValueOnce(error);

    await expect(routes[2].run()).rejects.toBe(error);
    expect(mocks.conversationCreate).toHaveBeenCalledExactlyOnceWith({ researchId });
    expect(mocks.conversationQuery.update).not.toHaveBeenCalled();
    expect(mocks.messageCreate).not.toHaveBeenCalled();
    expect(mocks.aiUsageEventCreate).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
  });

  it("propagates Conversation list read failure instead of returning a successful empty list", async () => {
    const error = new Error("Synthetic Conversation list failure");
    mocks.conversationQuery.all.mockRejectedValueOnce(error);

    await expect(getConversations(new Request("http://localhost/chat/conversations"), routeContext())).rejects.toBe(error);
    expect(mocks.conversationWhere).toHaveBeenCalledExactlyOnceWith({ researchId });
    expect(mocks.messageWhere).not.toHaveBeenCalled();
    expect(mocks.resolveWorkspaceSources).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
    expectNoChatWrites();
  });

  it.each(["Conversation", "Message", "Source resolution"])("propagates detail %s failure instead of returning 404 or partial success", async (stage) => {
    const error = new Error("Synthetic Conversation detail failure");
    if (stage === "Conversation") mocks.conversationQuery.first.mockRejectedValueOnce(error);
    if (stage === "Message") mocks.messageQuery.all.mockRejectedValueOnce(error);
    if (stage === "Source resolution") mocks.resolveWorkspaceSources.mockRejectedValueOnce(error);

    await expect(getConversation(new Request("http://localhost/chat/conversations/detail"), conversationRouteContext())).rejects.toBe(error);
    expect(mocks.conversationWhere).toHaveBeenCalledExactlyOnceWith({ id: conversationId, researchId });
    if (stage === "Conversation") expect(mocks.messageWhere).not.toHaveBeenCalled();
    if (stage !== "Source resolution") expect(mocks.resolveWorkspaceSources).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
    expectNoChatWrites();
  });

  it.each(["rate limit", "Research context"])("propagates %s failure before writes or generation", async (stage) => {
    const error = new Error("Synthetic internal service failure");
    (stage === "rate limit" ? mocks.chatRateLimit.limit : mocks.buildResearchContext).mockRejectedValueOnce(error);

    await expect(sendChatMessage(chatRequest(), routeContext())).rejects.toBe(error);
    expect(mocks.retrieveWorkspaceContext).not.toHaveBeenCalled();
    expect(mocks.messageWhere).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
    expectNoChatWrites();
  });

  it("returns 404 when Research context disappears before retrieval or persistence", async () => {
    mocks.buildResearchContext.mockResolvedValueOnce(null);

    const response = await sendChatMessage(chatRequest(), routeContext());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Research not found." });
    expect(mocks.retrieveWorkspaceContext).not.toHaveBeenCalled();
    expect(mocks.messageWhere).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
    expectNoChatWrites();
  });

  it("does not convert unexpected request-body read failures to 400", async () => {
    const request = chatRequest();
    const error = new Error("Synthetic request stream failure");
    vi.spyOn(request, "json").mockRejectedValueOnce(error);

    await expect(sendChatMessage(request, routeContext())).rejects.toBe(error);
    expect(mocks.conversationWhere).not.toHaveBeenCalled();
    expect(mocks.chatRateLimit.limit).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
    expectNoChatWrites();
  });

  it.each(["{", ""])("returns the existing 400 contract for malformed JSON %j without side effects", async (body) => {
    const request = new Request(`http://localhost/research/${researchId}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });

    const response = await sendChatMessage(request, routeContext());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "A conversationId and non-empty message are required.",
    });
    expect(mocks.conversationWhere).not.toHaveBeenCalled();
    expect(mocks.chatRateLimit.limit).not.toHaveBeenCalled();
    expect(mocks.buildResearchContext).not.toHaveBeenCalled();
    expect(mocks.retrieveWorkspaceContext).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
    expectNoChatWrites();
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
    expectNoChatWrites();
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
    expectNoChatWrites();
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

    expectNoChatWrites();
    dateNowSpy.mockRestore();
  });

  it.each([
    { conversationId, message: "" },
    { conversationId: " \t ", message: "Question" },
    { conversationId, message: 42 },
    null,
  ])("does not consume the rate limit or write for invalid chat input %j", async (body) => {
    const request = new Request(
      `http://localhost/research/${researchId}/chat`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
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
    expectNoChatWrites();
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
    expectNoChatWrites();
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
    expectNoChatWrites();
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
    expectNoChatWrites();
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
    expectNoChatWrites();
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
    expectNoChatWrites();
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
    expectNoChatWrites();
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
    expect(mocks.messageCreate.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.streamText.mock.invocationCallOrder[0]);
    expect(mocks.aiUsageEventCreate.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.validateSourceCitations.mock.invocationCallOrder[0]);
    expect(mocks.validateSourceCitations.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.messageCreate.mock.invocationCallOrder[1]);
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
    expect(mocks.messageCreate.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.streamText.mock.invocationCallOrder[0]);
    expect(mocks.streamText.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.aiUsageEventCreate.mock.invocationCallOrder[0]);
  });

  it("passes ordered history with exact role mapping and the real context-built prompt", async () => {
    const currentContext: ResearchContext = {
      research: {
        id: researchId,
        workspaceId,
        title: "Current research",
        description: "Current context",
        conclusion: null,
      },
      findings: [{ id: "current-finding", content: "Current observation", sources: [] }],
      sources: [],
    };
    const retrievalContext: WorkspaceRetrievalContext = {
      results: [{
        type: "CONCLUSION",
        researchId: "earlier-research",
        researchTitle: "Earlier research",
        content: "Retrieved context",
        distance: 0.2,
        sources: [],
      }],
    };
    const history = [
      { authorType: "USER", content: "Older question", createdAt: "2026-10-10T00:00:00Z" },
      { authorType: "AI", content: "Older answer [source:historic-source]", createdAt: "2026-10-10T00:01:00Z" },
      { authorType: "USER", content: "Newer question", createdAt: "2026-10-10T00:02:00Z" },
      { authorType: "AI", content: "Newer answer", createdAt: "2026-10-10T00:03:00Z" },
    ];
    mocks.buildResearchContext.mockResolvedValue(currentContext);
    mocks.retrieveWorkspaceContext.mockResolvedValue(retrievalContext);
    mocks.messageQuery.all.mockResolvedValue(history);

    const response = await sendChatMessage(chatRequest(), routeContext());
    expect(response.status).toBe(200);
    expect(mocks.messageWhere).toHaveBeenCalledOnce();
    expect(mocks.messageWhere).toHaveBeenCalledWith({ conversationId });
    expect(mocks.messageQuery.orderBy).toHaveBeenCalledOnce();
    const asc = vi.fn(() => "ascending");
    const orderBy = mocks.messageQuery.orderBy.mock.calls[0][0];
    expect(orderBy({ createdAt: { asc } })).toBe("ascending");
    expect(asc).toHaveBeenCalledOnce();
    expect(mocks.buildResearchContext).toHaveBeenCalledWith(researchId);
    expect(mocks.retrieveWorkspaceContext).toHaveBeenCalledWith(workspaceId, "What does the evidence show?");
    expect(mocks.streamText).toHaveBeenCalledOnce();
    expect(mocks.streamText).toHaveBeenCalledWith(expect.objectContaining({
      system: buildChatSystemPrompt(currentContext, retrievalContext),
      messages: [
        { role: "user", content: "Older question" },
        { role: "assistant", content: "Older answer [source:historic-source]" },
        { role: "user", content: "Newer question" },
        { role: "assistant", content: "Newer answer" },
        { role: "user", content: "What does the evidence show?" },
      ],
    }));
    expect(mocks.messageCreate.mock.calls).toEqual([[{
      conversationId,
      authorType: "USER",
      content: "What does the evidence show?",
    }]]);
    expect(mocks.messageQuery.all.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.messageCreate.mock.invocationCallOrder[0]);
    expect(mocks.messageCreate.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.conversationQuery.update.mock.invocationCallOrder[0]);
    expect(mocks.conversationQuery.update.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.streamText.mock.invocationCallOrder[0]);
  });

  it.each(["", " \t\n "])("records usage for blank stopped output %j without persisting AI text", async (text) => {
    await sendChatMessage(chatRequest(), routeContext());
    await completionCallback()({
      text,
      finishReason: "stop",
      totalUsage: { inputTokens: 10, outputTokens: 0, totalTokens: 10 },
    });

    expect(mocks.aiUsageEventCreate.mock.calls).toEqual([[{
      workspaceId,
      userId,
      researchId,
      conversationId,
      operation: "CHAT",
      provider: "google",
      model: "gemini-3.6-flash",
      inputTokens: 10,
      outputTokens: 0,
      totalTokens: 10,
      finishReason: "stop",
    }]]);
    expect(mocks.messageCreate.mock.calls).toEqual([[{
      conversationId,
      authorType: "USER",
      content: "What does the evidence show?",
    }]]);
    expect(mocks.validateSourceCitations).not.toHaveBeenCalled();
    expect(mocks.conversationQuery.update).toHaveBeenCalledOnce();
  });

  it("propagates retrieval failure before history reads, user persistence, or generation", async () => {
    const failure = new Error("Synthetic retrieval failure");
    mocks.retrieveWorkspaceContext.mockRejectedValueOnce(failure);

    await expect(sendChatMessage(chatRequest(), routeContext())).rejects.toBe(failure);
    expect(mocks.messageWhere).not.toHaveBeenCalled();
    expect(mocks.messageCreate).not.toHaveBeenCalled();
    expect(mocks.conversationQuery.update).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
    expect(mocks.aiUsageEventCreate).not.toHaveBeenCalled();
  });

  it("propagates generation startup failure after retaining the user write and conversation update", async () => {
    const failure = new Error("Synthetic generation startup failure");
    mocks.streamText.mockImplementationOnce(() => { throw failure; });

    await expect(sendChatMessage(chatRequest(), routeContext())).rejects.toBe(failure);
    expect(mocks.messageCreate.mock.calls).toEqual([[{
      conversationId,
      authorType: "USER",
      content: "What does the evidence show?",
    }]]);
    expect(mocks.conversationQuery.update).toHaveBeenCalledOnce();
    expect(mocks.messageCreate.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.streamText.mock.invocationCallOrder[0]);
    expect(mocks.conversationQuery.update.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.streamText.mock.invocationCallOrder[0]);
    expect(mocks.aiUsageEventCreate).not.toHaveBeenCalled();
    expect(mocks.validateSourceCitations).not.toHaveBeenCalled();
  });

  it("propagates usage-write failure before validation and AI persistence while retaining the user write", async () => {
    const failure = new Error("Synthetic usage write failure");
    const response = await sendChatMessage(chatRequest(), routeContext());
    expect(response.status).toBe(200);
    // This response is a fixed stub, not evidence of SDK error notification.
    await expect(response.text()).resolves.toBe("stream");
    mocks.aiUsageEventCreate.mockRejectedValueOnce(failure);

    await expect(completionCallback()({
      text: "Completed answer",
      finishReason: "stop",
      totalUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    })).rejects.toBe(failure);
    expect(mocks.aiUsageEventCreate).toHaveBeenCalledOnce();
    expect(mocks.validateSourceCitations).not.toHaveBeenCalled();
    expect(mocks.messageCreate.mock.calls).toEqual([[{
      conversationId,
      authorType: "USER",
      content: "What does the evidence show?",
    }]]);
    expect(mocks.conversationQuery.update).toHaveBeenCalledOnce();
  });

  it("records usage before an AI-message write failure without rolling back the user write", async () => {
    const failure = new Error("Synthetic AI message write failure");
    const response = await sendChatMessage(chatRequest(), routeContext());
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("stream");
    mocks.messageCreate.mockRejectedValueOnce(failure);

    await expect(completionCallback()({
      text: "Completed answer",
      finishReason: "stop",
      totalUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    })).rejects.toBe(failure);
    expect(mocks.aiUsageEventCreate).toHaveBeenCalledOnce();
    expect(mocks.aiUsageEventCreate.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.messageCreate.mock.invocationCallOrder[1]);
    expect(mocks.messageCreate.mock.calls).toEqual([
      [{ conversationId, authorType: "USER", content: "What does the evidence show?" }],
      [{ conversationId, authorType: "AI", content: "Completed answer" }],
    ]);
    expect(mocks.conversationQuery.update).toHaveBeenCalledOnce();
  });

  it.each([
    { name: "unauthorized markers only", text: "[source:unauthorized-a][source:unauthorized-b]", validated: "", saved: false },
    { name: "allowed marker only", text: "[source:allowed-source]", validated: "[source:allowed-source]", saved: false },
    { name: "normalized markers and whitespace only", text: " \n【source:allowed‑source】 [ source:unauthorized ]\t", validated: " \n[source:allowed-source] \t", saved: false },
    { name: "normal text with markers", text: "Answer [source:allowed-source] [source:unauthorized]", validated: "Answer [source:allowed-source] ", saved: true },
    { name: "Japanese text with a normalized marker", text: "根拠を確認しました。【source:allowed‑source】", validated: "根拠を確認しました。[source:allowed-source]", saved: true },
  ])("checks validated and parsed display text before saving: $name", async ({ text, validated, saved }) => {
    const { validateSourceCitations, parseSourceCitations } = await vi.importActual<
      typeof import("@/lib/ai/source-citations")
    >("@/lib/ai/source-citations");
    mocks.validateSourceCitations.mockImplementation(validateSourceCitations);
    mocks.parseSourceCitations.mockImplementation(parseSourceCitations);
    mocks.buildResearchContext.mockResolvedValue({
      findings: [{ sources: [{ id: "allowed-source" }] }],
    });
    await sendChatMessage(chatRequest(), routeContext());
    await completionCallback()({
      text,
      finishReason: "stop",
      totalUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });

    expect(mocks.aiUsageEventCreate).toHaveBeenCalledOnce();
    expect(mocks.messageCreate.mock.calls).toEqual([
      [{ conversationId, authorType: "USER", content: "What does the evidence show?" }],
      ...(saved ? [[{ conversationId, authorType: "AI", content: validated }]] : []),
    ]);
    expect(mocks.validateSourceCitations).toHaveReturnedWith(validated);
    expect(mocks.aiUsageEventCreate.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.validateSourceCitations.mock.invocationCallOrder[0]);
    expect(parseSourceCitations(validated).text.length > 0).toBe(saved);
    expect(mocks.conversationQuery.update).toHaveBeenCalledOnce();
  });

  it("restores unchanged messages and resolves first-seen AI citations in the authorized Workspace", async () => {
    const { parseSourceCitations } = await vi.importActual<
      typeof import("@/lib/ai/source-citations")
    >("@/lib/ai/source-citations");
    mocks.parseSourceCitations.mockImplementation(parseSourceCitations);
    const conversation = { id: conversationId, researchId, createdAt: "2026-10-10T00:00:00Z" };
    const messages = [
      { id: "user-1", conversationId, authorType: "USER", content: "Question [source:user-only]", createdAt: "2026-10-10T00:01:00Z" },
      { id: "ai-1", conversationId, authorType: "AI", content: "First [source:source-b] then [source:source-a] again [source:source-b].", createdAt: "2026-10-10T00:02:00Z" },
      { id: "user-2", conversationId, authorType: "USER", content: "Follow-up question", createdAt: "2026-10-10T00:03:00Z" },
      { id: "ai-2", conversationId, authorType: "AI", content: "Shared [source:source-a] and 【source:source-c】.", createdAt: "2026-10-10T00:04:00Z" },
      { id: "ai-3", conversationId, authorType: "AI", content: "Answer without citations.", createdAt: "2026-10-10T00:05:00Z" },
    ];
    const sources = [
      { id: "source-b", title: "B evidence", url: "https://example.invalid/b" },
      { id: "source-a", title: "A evidence", url: "https://example.invalid/a" },
      { id: "source-c", title: "C evidence", url: "https://example.invalid/c" },
    ];
    mocks.conversationQuery.first.mockResolvedValue(conversation);
    mocks.messageQuery.all.mockResolvedValue(messages);
    mocks.resolveWorkspaceSources.mockResolvedValue(sources);

    const response = await getConversation(
      new Request(`http://localhost/research/${researchId}/chat/conversations/${conversationId}`),
      conversationRouteContext(),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ...conversation, messages, sources });
    expect(mocks.requireResearchAccess).toHaveBeenCalledWith(userId, researchId);
    expect(mocks.conversationWhere).toHaveBeenCalledWith({ id: conversationId, researchId });
    expect(mocks.requireResearchAccess.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.conversationWhere.mock.invocationCallOrder[0]);
    expect(mocks.conversationQuery.first.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.messageWhere.mock.invocationCallOrder[0]);
    expect(mocks.messageWhere).toHaveBeenCalledOnce();
    expect(mocks.messageWhere).toHaveBeenCalledWith({ conversationId });
    expect(mocks.messageQuery.orderBy).toHaveBeenCalledOnce();
    const asc = vi.fn(() => "ascending");
    expect(mocks.messageQuery.orderBy.mock.calls[0][0]({ createdAt: { asc } })).toBe("ascending");
    expect(asc).toHaveBeenCalledOnce();
    expect(mocks.parseSourceCitations.mock.calls).toEqual([
      [messages[1].content], [messages[3].content], [messages[4].content],
    ]);
    expect(mocks.resolveWorkspaceSources).toHaveBeenCalledOnce();
    expect(mocks.resolveWorkspaceSources).toHaveBeenCalledWith(workspaceId, ["source-b", "source-a", "source-c"]);
    expect(mocks.messageCreate).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
  });

  it("persists only Current and Retrieved Finding-linked Source citations using the real validator", async () => {
    const { validateSourceCitations } = await vi.importActual<
      typeof import("@/lib/ai/source-citations")
    >("@/lib/ai/source-citations");
    mocks.validateSourceCitations.mockImplementation(validateSourceCitations);

    const currentSource = {
      id: "current-source",
      title: "Current evidence",
      url: "https://example.invalid/current",
    };
    const unlinkedSource = {
      id: "research-only-source",
      title: "Unlinked proposal",
      url: "https://example.invalid/unlinked",
    };
    const retrievedSource = {
      id: "retrieved-source",
      title: "Retrieved evidence",
      url: "https://example.invalid/retrieved",
    };
    mocks.buildResearchContext.mockResolvedValue({
      research: { id: researchId, workspaceId, title: "Research", description: null, conclusion: null },
      findings: [
        { id: "current-finding", content: "Sourced observation", sources: [currentSource] },
        { id: "unsourced-finding", content: "Unsourced observation", sources: [] },
      ],
      sources: [currentSource, unlinkedSource],
    });
    mocks.retrieveWorkspaceContext.mockResolvedValue({
      results: [
        {
          type: "FINDING",
          researchId: "other-research",
          researchTitle: "Other Research",
          findingId: "retrieved-finding",
          content: "Retrieved observation",
          distance: 0.1,
          sources: [retrievedSource],
        },
        {
          type: "RESEARCH",
          researchId: "metadata-research",
          researchTitle: "Research plan",
          content: "Plan referencing [source:metadata-source]",
          distance: 0.2,
          sources: [],
        },
        {
          type: "CONCLUSION",
          researchId: "conclusion-research",
          researchTitle: "Earlier conclusion",
          content: "Summary referencing [source:conclusion-source]",
          distance: 0.25,
          sources: [],
        },
      ],
    });
    mocks.messageQuery.all.mockResolvedValue([
      { authorType: "AI", content: "Historical answer [source:history-only-source]" },
    ]);

    const raw =
      "Current 【source:current-source】. Retrieved [ source:retrieved-source ]. " +
      "Unlinked [source:research-only-source]. Metadata [source:metadata-source]. " +
      "Conclusion [source:conclusion-source]. History [source:history-only-source]. " +
      "Finding [source:current-finding]. Research [source:research-id]. " +
      "Unknown [source:invented-source].";
    mocks.streamText.mockImplementation(() => ({
      toTextStreamResponse: () => new Response(raw),
    }));

    const response = await sendChatMessage(chatRequest(), routeContext());
    expect(response.status).toBe(200);
    // The response is still the mocked raw stream; validation occurs on persistence.
    await expect(response.text()).resolves.toBe(raw);
    expect(mocks.messageCreate).toHaveBeenCalledTimes(1);
    expect(mocks.validateSourceCitations).not.toHaveBeenCalled();

    const streamOptions = mocks.streamText.mock.calls[0]?.[0] as {
      onFinish: (result: {
        text: string;
        finishReason: string;
        totalUsage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
      }) => Promise<void>;
    };
    await streamOptions.onFinish({ text: raw, finishReason: "stop", totalUsage: {} });

    expect(mocks.validateSourceCitations).toHaveBeenCalledWith(
      raw,
      new Set(["current-source", "retrieved-source"]),
    );
    expect(mocks.messageCreate).toHaveBeenCalledTimes(2);
    expect(mocks.messageCreate).toHaveBeenNthCalledWith(2, {
      conversationId,
      authorType: "AI",
      content:
        "Current [source:current-source]. Retrieved [source:retrieved-source]. " +
        "Unlinked . Metadata . Conclusion . History . Finding . Research . Unknown .",
    });
  });

  describe("synthetic text stream boundary (not the real SDK)", () => {
    type Finish = Parameters<ReturnType<typeof completionCallback>>[0];
    const usage = { inputTokens: 10, outputTokens: 5, totalTokens: 15 };

    function syntheticStream() {
      let controller: ReadableStreamDefaultController<Uint8Array>;
      const cancel = vi.fn();
      const body = new ReadableStream<Uint8Array>({
        start(value) { controller = value; },
        cancel,
      });
      mocks.streamText.mockImplementationOnce(() => ({
        toTextStreamResponse: () => new Response(body),
      }));
      return {
        cancel,
        chunk(text: string) { controller.enqueue(new TextEncoder().encode(text)); },
        error(error: Error) { controller.error(error); },
        async finish(result: Finish, requestIndex = 0) {
          // The fixture explicitly chooses whether/when onFinish runs. This is
          // not an emulation of SDK callback/error/abort scheduling.
          const options = mocks.streamText.mock.calls[requestIndex][0] as {
            onFinish: (result: Finish) => Promise<void>;
          };
          await options.onFinish(result);
          controller.close();
        },
      };
    }

    function expectUserWrites(count: number) {
      expect(mocks.messageCreate.mock.calls).toEqual(Array.from({ length: count }, () => [{
        conversationId, authorType: "USER", content: "What does the evidence show?",
      }]));
      expect(mocks.conversationQuery.update).toHaveBeenCalledTimes(count);
      for (const [update] of mocks.conversationQuery.update.mock.calls) {
        expect(update.updatedAt).toBeInstanceOf(Temporal.Instant);
      }
      expect(mocks.conversationCreate).not.toHaveBeenCalled();
    }

    it("rejects a pending body read after partial bytes without inventing completion writes", async () => {
      const stream = syntheticStream();
      const response = await sendChatMessage(chatRequest(), routeContext());
      expect(response.status).toBe(200);
      const reader = response.body!.getReader();
      stream.chunk("Partial answer");
      expect(new TextDecoder().decode((await reader.read()).value)).toBe("Partial answer");
      const failure = new Error("Synthetic asynchronous stream failure");
      const pendingRead = reader.read();
      stream.error(failure);
      await expect(pendingRead).rejects.toBe(failure);
      await expect(reader.read()).rejects.toBe(failure);
      expectUserWrites(1);
      expect(mocks.aiUsageEventCreate).not.toHaveBeenCalled();
      expect(mocks.validateSourceCitations).not.toHaveBeenCalled();
      const options = mocks.streamText.mock.calls[0][0];
      expect(options).not.toHaveProperty("onError");
      expect(options).not.toHaveProperty("onAbort");
    });

    it("cancels a synthetic response reader after a chunk while retaining only the USER write", async () => {
      const stream = syntheticStream();
      const response = await sendChatMessage(chatRequest(), routeContext());
      const reader = response.body!.getReader();
      stream.chunk("Partial answer");
      expect((await reader.read()).done).toBe(false);
      const reason = new DOMException("Synthetic cancellation", "AbortError");
      await reader.cancel(reason);
      expect(stream.cancel).toHaveBeenCalledExactlyOnceWith(reason);
      await expect(reader.read()).resolves.toEqual({ done: true, value: undefined });
      expect(response.status).toBe(200); // Headers do not certify completion.
      expectUserWrites(1);
      expect(mocks.aiUsageEventCreate).not.toHaveBeenCalled();
      expect(mocks.validateSourceCitations).not.toHaveBeenCalled();
    });

    it("does not forward request abort to streamText; an explicitly delivered stop still persists", async () => {
      const stream = syntheticStream();
      const abort = new AbortController();
      const request = new Request(chatRequest(), { signal: abort.signal });
      const response = await sendChatMessage(request, routeContext());
      abort.abort();
      expect(request.signal.aborted).toBe(true);
      expect(mocks.streamText.mock.calls[0][0]).not.toHaveProperty("abortSignal");
      const body = response.text();
      stream.chunk("Completed answer");
      await stream.finish({ text: "Completed answer", finishReason: "stop", totalUsage: usage });
      await expect(body).resolves.toBe("Completed answer");
      expect(mocks.messageCreate.mock.calls).toEqual([
        [{ conversationId, authorType: "USER", content: "What does the evidence show?" }],
        [{ conversationId, authorType: "AI", content: "Completed answer" }],
      ]);
      expect(mocks.aiUsageEventCreate).toHaveBeenCalledOnce();
      expect(mocks.conversationQuery.update).toHaveBeenCalledOnce();
    });

    // "length" and blank "stop" already have PR #23 coverage above.
    it.each(["content-filter", "tool-calls", "error", "other"])(
      "returns partial text with clean EOF but saves only usage for finishReason=%s",
      async (finishReason) => {
        const stream = syntheticStream();
        const response = await sendChatMessage(chatRequest(), routeContext());
        const body = response.text();
        stream.chunk("Partial answer");
        await stream.finish({ text: "Partial answer", finishReason, totalUsage: usage });
        expect(response.status).toBe(200);
        await expect(body).resolves.toBe("Partial answer");
        expectUserWrites(1);
        expect(mocks.aiUsageEventCreate).toHaveBeenCalledExactlyOnceWith({
          workspaceId, userId, researchId, conversationId,
          operation: "CHAT", provider: "google", model: "gemini-3.6-flash",
          ...usage, finishReason,
        });
        expect(mocks.validateSourceCitations).not.toHaveBeenCalled();
      },
    );

    it("retains two identical USER writes after a failed stream is manually resent, with one AI and usage", async () => {
      const failed = syntheticStream();
      const first = await sendChatMessage(chatRequest(), routeContext());
      const reader = first.body!.getReader();
      failed.chunk("Discarded partial answer");
      await reader.read();
      const failure = new Error("Synthetic first attempt failure");
      failed.error(failure);
      await expect(reader.read()).rejects.toBe(failure);
      expectUserWrites(1);
      expect(mocks.aiUsageEventCreate).not.toHaveBeenCalled();

      // Represent the first committed USER in the second request's history.
      mocks.messageQuery.all.mockResolvedValueOnce([
        { authorType: "USER", content: "What does the evidence show?" },
      ]);
      const retry = syntheticStream();
      const second = await sendChatMessage(chatRequest(), routeContext());
      expectUserWrites(2);
      expect(mocks.streamText).toHaveBeenCalledTimes(2);
      expect(mocks.streamText.mock.calls[1][0].messages).toEqual([
        { role: "user", content: "What does the evidence show?" },
        { role: "user", content: "What does the evidence show?" },
      ]);
      const body = second.text();
      retry.chunk("Retry answer");
      await retry.finish({ text: "Retry answer", finishReason: "stop", totalUsage: usage }, 1);
      await expect(body).resolves.toBe("Retry answer");
      expect(mocks.messageCreate.mock.calls).toEqual([
        [{ conversationId, authorType: "USER", content: "What does the evidence show?" }],
        [{ conversationId, authorType: "USER", content: "What does the evidence show?" }],
        [{ conversationId, authorType: "AI", content: "Retry answer" }],
      ]);
      expect(mocks.aiUsageEventCreate).toHaveBeenCalledOnce();
      expect(mocks.conversationQuery.update).toHaveBeenCalledTimes(2);
    });

    it("has no callback replay deduplication (manual replay, not an SDK delivery claim)", async () => {
      await sendChatMessage(chatRequest(), routeContext());
      const finish = completionCallback();
      const result = { text: "Completed answer", finishReason: "stop", totalUsage: usage };
      await finish(result);
      await finish(result);
      expect(mocks.streamText).toHaveBeenCalledOnce();
      expect(mocks.conversationQuery.update).toHaveBeenCalledOnce();
      expect(mocks.messageCreate.mock.calls).toEqual([
        [{ conversationId, authorType: "USER", content: "What does the evidence show?" }],
        [{ conversationId, authorType: "AI", content: "Completed answer" }],
        [{ conversationId, authorType: "AI", content: "Completed answer" }],
      ]);
      expect(mocks.aiUsageEventCreate).toHaveBeenCalledTimes(2);
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
