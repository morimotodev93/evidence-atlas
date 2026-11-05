import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    auth: vi.fn(),
    notFound: vi.fn(),
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
vi.mock("@/auth", () => ({ auth: mocks.auth }));

vi.mock("@/workspace/getAccessibleWorkspaces", () => ({
  getAccessibleWorkspaces: mocks.getAccessibleWorkspaces,
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
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
afterEach(() => vi.unstubAllEnvs());

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
    const order = [mocks.requireUser, mocks.getAccessibleWorkspaces, mocks.transaction,
      mocks.organizationCreate, mocks.membershipCreate, mocks.workspaceCreate,
      mocks.workspaceMembershipCreate, mocks.cookies, mocks.cookieSet, mocks.redirect]
      .map(mock => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
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

  it("propagates an accessible Workspace lookup failure before provisioning or cookie changes", async () => {
    const error = new Error("Synthetic onboarding Workspace read failure");
    mocks.getAccessibleWorkspaces.mockRejectedValueOnce(error);

    await expect(createInitialWorkspace(state, onboardingForm())).rejects.toBe(error);
    expect(mocks.getAccessibleWorkspaces).toHaveBeenCalledExactlyOnceWith("user-id");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.organizationCreate).not.toHaveBeenCalled();
    expect(mocks.membershipCreate).not.toHaveBeenCalled();
    expect(mocks.workspaceCreate).not.toHaveBeenCalled();
    expect(mocks.workspaceMembershipCreate).not.toHaveBeenCalled();
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rejects invalid onboarding input before writing", async () => {
    await expect(
      createInitialWorkspace(state, onboardingForm("", "")),
    ).resolves.toEqual({
      error: { code: "ONBOARDING_INVALID_INPUT" },
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
      error: { code: "ONBOARDING_CREATE_FAILED" },
    });

    expect(mocks.cookieSet).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each(["organizationCreate", "membershipCreate", "workspaceCreate", "workspaceMembershipCreate"] as const)(
    "returns only the creation code when %s rejects within the original transaction", async (stage) => {
      const failure = Object.assign(new Error("private database detail"), { cause: "private row", code: "23505" });
      mocks[stage].mockRejectedValueOnce(failure);
      const result = await createInitialWorkspace(state, onboardingForm());
      expect(result).toEqual({ error: { code: "ONBOARDING_CREATE_FAILED" } });
      expect(JSON.stringify(result)).not.toMatch(/private|23505|message|cause|stack/);
      expect(mocks.transaction).toHaveBeenCalledOnce();
      expect(mocks[stage]).toHaveBeenCalledOnce();
      const stages = ["organizationCreate", "membershipCreate", "workspaceCreate", "workspaceMembershipCreate"] as const;
      for (const skipped of stages.slice(stages.indexOf(stage) + 1)) expect(mocks[skipped]).not.toHaveBeenCalled();
      expect(mocks.cookies).not.toHaveBeenCalled();
      expect(mocks.cookieSet).not.toHaveBeenCalled();
      expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );

  it.each(["authentication redirect", "unexpected auth failure"])("preserves %s before membership lookup or provisioning", async reason => {
    const failure = new Error(reason);
    mocks.requireUser.mockRejectedValueOnce(failure);
    await expect(createInitialWorkspace(state, onboardingForm())).rejects.toBe(failure);
    expect(mocks.getAccessibleWorkspaces).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each([false, true])("retains the real User guard for authenticated=%s without changing redirect or provisioning", async authenticated => {
    vi.stubEnv("PUBLIC_DEMO_MODE", "false");
    const { requireUser } = await vi.importActual<typeof import("@/auth/requireUser")>("@/auth/requireUser");
    mocks.requireUser.mockImplementationOnce(requireUser);
    mocks.auth.mockResolvedValue(authenticated ? { user: { id: "user-id" } } : null);
    await expect(createInitialWorkspace(state, onboardingForm())).rejects.toBe(redirectError);
    expect(mocks.auth).toHaveBeenCalledOnce();
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(authenticated ? "/" : "/api/auth/signin");
    if (authenticated) {
      expect(mocks.getAccessibleWorkspaces).toHaveBeenCalledExactlyOnceWith("user-id");
      expect(mocks.transaction).toHaveBeenCalledOnce();
      expect(mocks.cookieSet).toHaveBeenCalledOnce();
    } else {
      expect(mocks.getAccessibleWorkspaces).not.toHaveBeenCalled();
      expect(mocks.transaction).not.toHaveBeenCalled();
      expect(mocks.cookies).not.toHaveBeenCalled();
    }
  });

  it.each(["cookies", "cookieSet"] as const)("preserves %s failures outside the transaction catch without retrying provisioning", async stage => {
    const failure = new Error("private cookie failure");
    if (stage === "cookies") mocks.cookies.mockRejectedValueOnce(failure);
    else mocks.cookieSet.mockImplementationOnce(() => { throw failure; });
    await expect(createInitialWorkspace(state, onboardingForm())).rejects.toBe(failure);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.workspaceMembershipCreate).toHaveBeenCalledOnce();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("retains production cookie flags and ignores previous error state on successful provisioning", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(createInitialWorkspace({ error: { code: "ONBOARDING_INVALID_INPUT" } }, onboardingForm())).rejects.toBe(redirectError);
    expect(mocks.cookieSet).toHaveBeenCalledExactlyOnceWith("evidence_atlas_workspace", "workspace-id", {
      httpOnly: true, sameSite: "lax", secure: true, path: "/",
    });
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/");
  });

  describe.each(["organizationName", "workspaceName"])("%s validation", (field) => {
    it.each([undefined, "", " \t\r\n ", "x".repeat(101)])(
      "rejects missing, blank or oversized input (case %#)", async (value) => {
        const data = onboardingForm();
        if (value === undefined) data.delete(field);
        else data.set(field, value);

        await expect(createInitialWorkspace(state, data)).resolves.toEqual({
          error: { code: "ONBOARDING_INVALID_INPUT" },
        });

        expect(mocks.requireUser).not.toHaveBeenCalled();
        expect(mocks.getAccessibleWorkspaces).not.toHaveBeenCalled();
        expect(mocks.transaction).not.toHaveBeenCalled();
        expect(mocks.organizationCreate).not.toHaveBeenCalled();
        expect(mocks.membershipCreate).not.toHaveBeenCalled();
        expect(mocks.workspaceCreate).not.toHaveBeenCalled();
        expect(mocks.workspaceMembershipCreate).not.toHaveBeenCalled();
        expect(mocks.cookies).not.toHaveBeenCalled();
        expect(mocks.cookieSet).not.toHaveBeenCalled();
        expect(mocks.redirect).not.toHaveBeenCalled();
      },
    );

    it.each([1, 99, 100])("trims and saves a name of length %i", async (length) => {
      const value = "x".repeat(length);
      const data = onboardingForm();
      data.set(field, ` \t${value}\r\n `);

      await expect(createInitialWorkspace(state, data)).rejects.toBe(redirectError);

      const create = field === "organizationName" ? mocks.organizationCreate : mocks.workspaceCreate;
      expect(create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: value }));
      expect(mocks.membershipCreate).toHaveBeenCalledTimes(1);
      expect(mocks.workspaceMembershipCreate).toHaveBeenCalledTimes(1);
      expect(mocks.cookieSet).toHaveBeenCalledTimes(1);
      expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/");
    });
  });
});
