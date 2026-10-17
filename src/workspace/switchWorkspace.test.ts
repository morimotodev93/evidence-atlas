import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceAccessError } from "@/auth/requireWorkspaceAccess";
import { CURRENT_WORKSPACE_COOKIE } from "./currentWorkspace";
import { switchWorkspace } from "./switchWorkspace";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  where: vi.fn(),
  first: vi.fn(),
  cookies: vi.fn(),
  setCookie: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Exercise the real requireUser / requireWorkspaceAccess boundary.
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/prisma/db", () => ({
  db: { orm: { public: { WorkspaceMembership: { where: mocks.where } } } },
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));
vi.mock("next/cache", () => ({
  refresh: mocks.refresh,
  revalidatePath: mocks.revalidatePath,
}));

const userId = "user-id";
const workspaceId = "requested-workspace";
const redirectError = new Error("NEXT_REDIRECT");

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PUBLIC_DEMO_MODE", "false");
  mocks.auth.mockResolvedValue({ user: { id: userId } });
  mocks.where.mockReturnValue({ first: mocks.first });
  mocks.first.mockResolvedValue({ userId, workspaceId, role: "MEMBER" });
  mocks.cookies.mockResolvedValue({ set: mocks.setCookie });
  mocks.redirect.mockImplementation(() => { throw redirectError; });
  mocks.notFound.mockImplementation(() => { throw new Error("Unexpected 404"); });
});
afterEach(() => vi.unstubAllEnvs());

function expectNoEffects() {
  expect(mocks.cookies).not.toHaveBeenCalled();
  expect(mocks.setCookie).not.toHaveBeenCalled();
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
}

describe("switchWorkspace direct Action with real guards", () => {
  it("redirects an unauthenticated call before querying or changing the cookie", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(switchWorkspace(workspaceId)).rejects.toBe(redirectError);

    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/api/auth/signin");
    expect(mocks.where).not.toHaveBeenCalled();
    expectNoEffects();
  });

  it("rejects another Workspace ID even when the caller is ADMIN of an accessible Workspace", async () => {
    const membership = { userId, workspaceId: "accessible-workspace", role: "ADMIN" };
    mocks.where.mockImplementation((filter) => ({
      first: () => mocks.first(filter),
    }));
    mocks.first.mockImplementation(async (filter) =>
      filter.userId === membership.userId && filter.workspaceId === membership.workspaceId
        ? membership
        : null,
    );

    await expect(switchWorkspace(workspaceId)).rejects.toBeInstanceOf(WorkspaceAccessError);

    expect(mocks.where).toHaveBeenCalledExactlyOnceWith({ userId, workspaceId });
    expectNoEffects();
  });

  it("propagates a membership DB failure before cookie access or refresh", async () => {
    const error = new Error("Database unavailable");
    mocks.first.mockRejectedValue(error);

    await expect(switchWorkspace(workspaceId)).rejects.toBe(error);

    expect(mocks.where).toHaveBeenCalledExactlyOnceWith({ userId, workspaceId });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expectNoEffects();
  });

  it("allows a MEMBER to select an accessible Workspace after verifying membership", async () => {
    mocks.cookies.mockImplementation(async () => {
      expect(mocks.first).toHaveBeenCalledTimes(1);
      return { set: mocks.setCookie };
    });
    mocks.refresh.mockImplementation(() => {
      expect(mocks.setCookie).toHaveBeenCalledTimes(1);
    });

    await expect(switchWorkspace(workspaceId)).resolves.toBeUndefined();

    expect(mocks.where).toHaveBeenCalledExactlyOnceWith({ userId, workspaceId });
    expect(mocks.setCookie).toHaveBeenCalledExactlyOnceWith(
      CURRENT_WORKSPACE_COOKIE,
      workspaceId,
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
