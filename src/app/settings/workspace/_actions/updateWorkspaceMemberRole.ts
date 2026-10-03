"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/auth/requireUser";
import { requireWorkspaceAdmin } from "@/auth/requireWorkspaceAdmin";
import { db } from "@/prisma/db";

const workspaceRoleSchema = z.enum(["ADMIN", "MEMBER"]);

export type UpdateWorkspaceMemberRoleState = {
  error: string | null;
};

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  targetUserId: string,
  _previousState: UpdateWorkspaceMemberRoleState,
  formData: FormData,
): Promise<UpdateWorkspaceMemberRoleState> {
  const result = workspaceRoleSchema.safeParse(
    String(formData.get("role") ?? ""),
  );

  if (!result.success) {
    return {
      error: "Invalid workspace role.",
    };
  }

  const user = await requireUser();

  await requireWorkspaceAdmin(user.id, workspaceId);

  const membership = await db.orm.public.WorkspaceMembership.where({
    userId: targetUserId,
    workspaceId,
  }).first();

  if (!membership) {
    return {
      error: "Member not found.",
    };
  }

  if (membership.role === result.data) {
    return {
      error: null,
    };
  }

  // Keep at least one Workspace Admin.
  if (membership.role === "ADMIN" && result.data === "MEMBER") {
    const memberships = await db.orm.public.WorkspaceMembership.where({
      workspaceId,
    }).all();

    const adminCount = memberships.filter(
      (membership) => membership.role === "ADMIN",
    ).length;

    if (adminCount <= 1) {
      return {
        error: "A workspace must have at least one admin.",
      };
    }
  }

  try {
    await db.orm.public.WorkspaceMembership.where({
      userId: targetUserId,
      workspaceId,
    }).update({
      role: result.data,
    });
  } catch {
    return {
      error: "Failed to update member role. Please try again.",
    };
  }

  revalidatePath("/settings/workspace");

  return {
    error: null,
  };
}
