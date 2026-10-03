import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInitialWorkspace } from "@/app/onboarding/_actions/createInitialWorkspace";

const mocks = vi.hoisted(() => {
  const organizationCreate = vi.fn();
  const membershipCreate = vi.fn();
  const workspaceCreate = vi.fn();
  const workspaceMembershipCreate = vi.fn();

  const tx = {
    orm: {
      public: {
        Organization: {
          create: organizationCreate,
        },
        Membership: {
          create: membershipCreate,
        },
        Workspace: {
          create: workspaceCreate,
        },
        WorkspaceMembership: {
          create: workspaceMembershipCreate,
        },
      },
    },
  };

  const cookieSet = vi.fn();

  return {
    organizationCreate,
    membershipCreate,
    workspaceCreate,
    workspaceMembershipCreate,
    tx,
    transaction: vi.fn(),
    requireUser: vi.fn(),
    getAccessibleWorkspaces: vi.fn(),
    cookies: vi.fn(),
    cookieSet,
    redirect: vi.fn(),
  };
});

vi.mock("@/prisma/db", () => ({
  db: {
    transaction: mocks.transaction,
  },
}));

vi.mock("@/auth/requireUser", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/workspace/getAccessibleWorkspaces", () => ({
  getAccessibleWorkspaces: mocks.getAccessibleWorkspaces,
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

function onboardingForm(
  organizationName = "Acme Research",
  workspaceName = "Research",
) {
  const formData = new FormData();
  formData.set("organizationName", organizationName);
  formData.set("workspaceName", workspaceName);
  return formData;
}

const state = { error: null };

describe("createInitialWorkspace", () => {
  const redirectError = new Error("NEXT_REDIRECT");

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireUser.mockResolvedValue({
      id: "user-id",
    });

    mocks.getAccessibleWorkspaces.mockResolvedValue([]);

    mocks.organizationCreate.mockResolvedValue({
      id: "organization-id",
      name: "Acme Research",
    });

    mocks.membershipCreate.mockResolvedValue({
      userId: "user-id",
      organizationId: "organization-id",
      role: "ADMIN",
    });

    mocks.workspaceCreate.mockResolvedValue({
      id: "workspace-id",
      organizationId: "organization-id",
      name: "Research",
    });

    mocks.workspaceMembershipCreate.mockResolvedValue({
      userId: "user-id",
      workspaceId: "workspace-id",
      role: "ADMIN",
    });

    mocks.transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );

    mocks.cookies.mockResolvedValue({
      set: mocks.cookieSet,
    });

    mocks.redirect.mockImplementation(() => {
      throw redirectError;
    });
  });

  it("creates an organization and initial workspace with admin memberships", async () => {
    await expect(createInitialWorkspace(state, onboardingForm())).rejects.toBe(
      redirectError,
    );

    expect(mocks.requireUser).toHaveBeenCalledTimes(1);
    expect(mocks.getAccessibleWorkspaces).toHaveBeenCalledWith("user-id");

    expect(mocks.transaction).toHaveBeenCalledTimes(1);

    expect(mocks.organizationCreate).toHaveBeenCalledWith({
      name: "Acme Research",
    });

    expect(mocks.membershipCreate).toHaveBeenCalledWith({
      userId: "user-id",
      organizationId: "organization-id",
      role: "ADMIN",
    });

    expect(mocks.workspaceCreate).toHaveBeenCalledWith({
      organizationId: "organization-id",
      name: "Research",
    });

    expect(mocks.workspaceMembershipCreate).toHaveBeenCalledWith({
      userId: "user-id",
      workspaceId: "workspace-id",
      role: "ADMIN",
    });

    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "evidence_atlas_workspace",
      "workspace-id",
      {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
      },
    );

    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("redirects an already provisioned user without creating another workspace", async () => {
    mocks.getAccessibleWorkspaces.mockResolvedValue([
      {
        id: "existing-workspace-id",
        name: "Existing Workspace",
      },
    ]);

    await expect(createInitialWorkspace(state, onboardingForm())).rejects.toBe(
      redirectError,
    );

    expect(mocks.redirect).toHaveBeenCalledWith("/");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.organizationCreate).not.toHaveBeenCalled();
    expect(mocks.workspaceCreate).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("rejects invalid onboarding input before writing", async () => {
    await expect(
      createInitialWorkspace(state, onboardingForm("", "")),
    ).resolves.toEqual({
      error: "Enter an organization name and workspace name.",
    });

    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("returns an error and does not set the workspace cookie when creation fails", async () => {
    mocks.transaction.mockRejectedValue(new Error("Database unavailable"));

    await expect(
      createInitialWorkspace(state, onboardingForm()),
    ).resolves.toEqual({
      error: "Failed to create your workspace. Please try again.",
    });

    expect(mocks.cookieSet).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
