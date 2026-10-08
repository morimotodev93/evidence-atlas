import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ResearchEditPage from "@/app/research/[id]/edit/page";
import NewResearchPage from "@/app/research/new/page";

const mocks = vi.hoisted(() => {
  const researchQuery = { first: vi.fn() };
  const membershipQuery = { first: vi.fn() };

  return {
    auth: vi.fn(),
    redirect: vi.fn(),
    notFound: vi.fn(),
    researchQuery,
    membershipQuery,
    researchWhere: vi.fn(() => researchQuery),
    membershipWhere: vi.fn(() => membershipQuery),
  };
});

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        Research: { where: mocks.researchWhere },
        WorkspaceMembership: { where: mocks.membershipWhere },
      },
    },
  },
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string }) =>
    createElement("a", props, children),
}));
vi.mock("@/app/research/_actions/createResearch", () => ({
  createResearch: vi.fn(),
}));
vi.mock("@/app/research/_actions/updateResearch", () => ({
  updateResearch: vi.fn(),
}));

const redirectError = new Error("NEXT_REDIRECT");
const notFoundError = new Error("NEXT_NOT_FOUND");
const research = {
  id: "research-id",
  workspaceId: "workspace-id",
  title: "Private research title",
  description: "Private research description",
};

function editPage() {
  return ResearchEditPage({ params: Promise.resolve({ id: research.id }) });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user-id" } });
  mocks.redirect.mockImplementation(() => {
    throw redirectError;
  });
  mocks.notFound.mockImplementation(() => {
    throw notFoundError;
  });
  mocks.researchWhere.mockImplementation(() => {
    expect(mocks.auth).toHaveBeenCalledTimes(1);
    return mocks.researchQuery;
  });
  mocks.membershipWhere.mockReturnValue(mocks.membershipQuery);
  mocks.researchQuery.first.mockResolvedValue(research);
  mocks.membershipQuery.first.mockResolvedValue({
    userId: "user-id",
    workspaceId: research.workspaceId,
    role: "MEMBER",
  });
});

describe("Research create page authorization", () => {
  it("redirects unauthenticated visitors before returning a form", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(NewResearchPage()).rejects.toBe(redirectError);

    expect(mocks.auth).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/api/auth/signin");
    expect(mocks.researchWhere).not.toHaveBeenCalled();
    expect(mocks.membershipWhere).not.toHaveBeenCalled();
  });

  it("renders the existing create form for an authenticated user", async () => {
    const html = renderToStaticMarkup(await NewResearchPage());

    expect(mocks.auth).toHaveBeenCalledTimes(1);
    expect(html).toContain("<form");
    expect(html).toContain('name="title"');
    expect(html).toContain('name="description"');
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.membershipWhere).not.toHaveBeenCalled();
  });
});

describe("Research edit page authorization", () => {
  it("redirects unauthenticated visitors without reading Research", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(editPage()).rejects.toBe(redirectError);

    expect(mocks.redirect).toHaveBeenCalledWith("/api/auth/signin");
    expect(mocks.researchWhere).not.toHaveBeenCalled();
    expect(mocks.membershipWhere).not.toHaveBeenCalled();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it.each(["missing", "inaccessible"])(
    "uses the same not-found boundary for %s Research without returning a form",
    async (reason) => {
      if (reason === "missing") {
        mocks.researchQuery.first.mockResolvedValue(null);
      } else {
        mocks.membershipQuery.first.mockResolvedValue(null);
      }

      await expect(editPage()).rejects.toBe(notFoundError);

      expect(mocks.notFound).toHaveBeenCalledTimes(1);
      expect(mocks.researchWhere).toHaveBeenCalledTimes(1);
      if (reason === "missing") {
        expect(mocks.membershipWhere).not.toHaveBeenCalled();
      } else {
        expect(mocks.membershipWhere).toHaveBeenCalledWith({
          userId: "user-id",
          workspaceId: research.workspaceId,
        });
      }
    },
  );

  it("renders authorized Research after checking membership, without a second lookup", async () => {
    const html = renderToStaticMarkup(await editPage());

    expect(mocks.researchWhere).toHaveBeenCalledExactlyOnceWith({
      id: research.id,
    });
    expect(mocks.researchQuery.first).toHaveBeenCalledTimes(1);
    expect(mocks.membershipWhere).toHaveBeenCalledExactlyOnceWith({
      userId: "user-id",
      workspaceId: research.workspaceId,
    });
    expect(html).toContain("<form");
    expect(html).toContain(research.title);
    expect(html).toContain(research.description);
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it.each(["researchQuery", "membershipQuery"] as const)(
    "propagates unexpected %s failures without returning a form",
    async (query) => {
      const error = new Error("Database unavailable");
      mocks[query].first.mockRejectedValue(error);

      await expect(editPage()).rejects.toBe(error);

      expect(mocks.notFound).not.toHaveBeenCalled();
      expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );
});
