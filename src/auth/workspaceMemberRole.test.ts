import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateWorkspaceMemberRole } from "@/app/settings/workspace/_actions/updateWorkspaceMemberRole";

const mocks = vi.hoisted(() => {
  const query = {
    first: vi.fn(),
    all: vi.fn(),
    update: vi.fn(),
  };

  return {
    query,
    where: vi.fn(() => query),
    requireUser: vi.fn(),
    requireWorkspaceAdmin: vi.fn(),
    revalidatePath: vi.fn(),
  };
});

vi.mock("@/prisma/db", () => ({
  db: {
    orm: {
      public: {
        WorkspaceMembership: {
          where: mocks.where,
        },
      },
    },
  },
}));

vi.mock("@/auth/requireUser", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/auth/requireWorkspaceAdmin", () => ({
  requireWorkspaceAdmin: mocks.requireWorkspaceAdmin,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

function roleForm(role: "ADMIN" | "MEMBER") {
  const formData = new FormData();
  formData.set("role", role);
  return formData;
}

const state = { error: null };
const workspaceId = "workspace-id";
const adminUserId = "admin-user-id";
const targetUserId = "target-user-id";

describe("updateWorkspaceMemberRole access control", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireUser.mockResolvedValue({ id: adminUserId });
    mocks.requireWorkspaceAdmin.mockResolvedValue({
      userId: adminUserId,
      workspaceId,
      role: "ADMIN",
    });

    mocks.query.first.mockResolvedValue({
      userId: targetUserId,
      workspaceId,
      role: "MEMBER",
    });

    mocks.query.all.mockResolvedValue([]);
    mocks.query.update.mockResolvedValue({
      userId: targetUserId,
      workspaceId,
      role: "ADMIN",
    });
  });

  it("blocks role changes from a non-admin", async () => {
    const error = new Error("Forbidden");
    mocks.requireWorkspaceAdmin.mockRejectedValue(error);

    await expect(
      updateWorkspaceMemberRole(
        workspaceId,
        targetUserId,
        state,
        roleForm("ADMIN"),
      ),
    ).rejects.toBe(error);

    expect(mocks.where).not.toHaveBeenCalled();
    expect(mocks.query.update).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects updating a missing workspace membership", async () => {
    mocks.query.first.mockResolvedValue(null);

    await expect(
      updateWorkspaceMemberRole(
        workspaceId,
        "missing-user-id",
        state,
        roleForm("ADMIN"),
      ),
    ).resolves.toEqual({
      error: "Member not found.",
    });

    expect(mocks.where).toHaveBeenCalledWith({
      userId: "missing-user-id",
      workspaceId,
    });
    expect(mocks.query.update).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("prevents demoting the last workspace admin", async () => {
    mocks.query.first.mockResolvedValue({
      userId: targetUserId,
      workspaceId,
      role: "ADMIN",
    });

    mocks.query.all.mockResolvedValue([
      {
        userId: targetUserId,
        workspaceId,
        role: "ADMIN",
      },
      {
        userId: "member-user-id",
        workspaceId,
        role: "MEMBER",
      },
    ]);

    await expect(
      updateWorkspaceMemberRole(
        workspaceId,
        targetUserId,
        state,
        roleForm("MEMBER"),
      ),
    ).resolves.toEqual({
      error: "A workspace must have at least one admin.",
    });

    expect(mocks.where).toHaveBeenCalledWith({ workspaceId });
    expect(mocks.query.update).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("allows demoting one admin when another admin remains", async () => {
    mocks.query.first.mockResolvedValue({
      userId: targetUserId,
      workspaceId,
      role: "ADMIN",
    });

    mocks.query.all.mockResolvedValue([
      {
        userId: targetUserId,
        workspaceId,
        role: "ADMIN",
      },
      {
        userId: "other-admin-user-id",
        workspaceId,
        role: "ADMIN",
      },
    ]);

    mocks.query.update.mockResolvedValue({
      userId: targetUserId,
      workspaceId,
      role: "MEMBER",
    });

    await expect(
      updateWorkspaceMemberRole(
        workspaceId,
        targetUserId,
        state,
        roleForm("MEMBER"),
      ),
    ).resolves.toEqual({
      error: null,
    });

    expect(mocks.where).toHaveBeenCalledWith({
      userId: targetUserId,
      workspaceId,
    });
    expect(mocks.query.update).toHaveBeenCalledWith({
      role: "MEMBER",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/workspace");
  });
});
