import { beforeEach, describe, expect, it, vi } from "vitest";

import { CURRENT_WORKSPACE_COOKIE } from "./currentWorkspace";
import { requireCurrentWorkspace } from "./requireCurrentWorkspace";

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(), redirect: vi.fn(), getAccessibleWorkspaces: vi.fn(),
  membershipFirst: vi.fn(), workspaceFirst: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookieGet }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("./getAccessibleWorkspaces", () => ({ getAccessibleWorkspaces: mocks.getAccessibleWorkspaces }));
// Keep the real WorkspaceAccessError and membership guard.
vi.mock("@/prisma/db", () => ({ db: { orm: { public: {
  WorkspaceMembership: { where: () => ({ first: mocks.membershipFirst }) },
  Workspace: { where: () => ({ first: mocks.workspaceFirst }) },
} } } }));

const workspace = { id: "selected-workspace" };
const fallback = { id: "accessible-workspace" };
const redirectError = new Error("NEXT_REDIRECT");

beforeEach(() => {
  vi.resetAllMocks();
  mocks.cookieGet.mockImplementation((name) => name === CURRENT_WORKSPACE_COOKIE ? { value: workspace.id } : undefined);
  mocks.membershipFirst.mockResolvedValue({ userId: "user", workspaceId: workspace.id });
  mocks.workspaceFirst.mockResolvedValue(workspace);
  mocks.getAccessibleWorkspaces.mockResolvedValue([fallback]);
  mocks.redirect.mockImplementation(() => { throw redirectError; });
});

describe("current Workspace error boundary", () => {
  it.each(["membershipFirst", "workspaceFirst"] as const)("propagates %s DB failure instead of silently selecting another Workspace", async (query) => {
    const error = new Error("Synthetic private database failure");
    mocks[query].mockRejectedValueOnce(error);

    await expect(requireCurrentWorkspace("user")).rejects.toBe(error);
    expect(mocks.getAccessibleWorkspaces).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("returns the selected Workspace after membership succeeds", async () => {
    await expect(requireCurrentWorkspace("user")).resolves.toBe(workspace);
    expect(mocks.getAccessibleWorkspaces).not.toHaveBeenCalled();
  });

  it.each(["absent cookie", "non-member", "missing Workspace"])("retains accessible fallback for %s", async (reason) => {
    if (reason === "absent cookie") mocks.cookieGet.mockReturnValueOnce(undefined);
    if (reason === "non-member") mocks.membershipFirst.mockResolvedValueOnce(null);
    if (reason === "missing Workspace") mocks.workspaceFirst.mockResolvedValueOnce(null);

    await expect(requireCurrentWorkspace("user")).resolves.toBe(fallback);
    expect(mocks.getAccessibleWorkspaces).toHaveBeenCalledExactlyOnceWith("user");
    if (reason !== "missing Workspace") expect(mocks.workspaceFirst).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("retains onboarding when there is no accessible fallback", async () => {
    mocks.cookieGet.mockReturnValueOnce(undefined);
    mocks.getAccessibleWorkspaces.mockResolvedValueOnce([]);

    await expect(requireCurrentWorkspace("user")).rejects.toBe(redirectError);
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/onboarding");
  });

  it("propagates fallback lookup failure instead of treating it as an unprovisioned User", async () => {
    const error = new Error("Synthetic accessible Workspace read failure");
    mocks.cookieGet.mockReturnValueOnce(undefined);
    mocks.getAccessibleWorkspaces.mockRejectedValueOnce(error);

    await expect(requireCurrentWorkspace("user")).rejects.toBe(error);
    expect(mocks.getAccessibleWorkspaces).toHaveBeenCalledExactlyOnceWith("user");
    expect(mocks.membershipFirst).not.toHaveBeenCalled();
    expect(mocks.workspaceFirst).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
