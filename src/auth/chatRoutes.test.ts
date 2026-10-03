import { beforeEach, describe, expect, it, vi } from "vitest";

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

    conversationWhere: vi.fn(() => conversationQuery),
    conversationCreate: vi.fn(),
    conversationQuery,

    messageWhere: vi.fn(() => messageQuery),
    messageCreate: vi.fn(),
    messageQuery,

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
      },
    },
  },
}));

vi.mock("@/lib/ai/model", () => ({
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

    mocks.messageQuery.all.mockResolvedValue([]);

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

    expect(mocks.messageCreate).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
  });
});
