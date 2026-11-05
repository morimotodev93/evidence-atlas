"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOrganizationAdmin } from "@/auth/requireOrganizationAdmin";
import { requireUser } from "@/auth/requireUser";
import type { DisplayError } from "@/lib/i18n/errors";
import { db } from "@/prisma/db";

const organizationRoleSchema = z.enum(["ADMIN", "MEMBER"]);

export type UpdateOrganizationMemberRoleState = {
  error: DisplayError | null;
};

export async function updateOrganizationMemberRole(
  organizationId: string,
  targetUserId: string,
  _previousState: UpdateOrganizationMemberRoleState,
  formData: FormData,
): Promise<UpdateOrganizationMemberRoleState> {
  const result = organizationRoleSchema.safeParse(
    String(formData.get("role") ?? ""),
  );

  if (!result.success) {
    return {
      error: { code: "ORGANIZATION_INVALID_ROLE" },
    };
  }

  const user = await requireUser();

  await requireOrganizationAdmin(user.id, organizationId);

  const membership = await db.orm.public.Membership.where({
    userId: targetUserId,
    organizationId,
  }).first();

  if (!membership) {
    return {
      error: { code: "MEMBER_NOT_FOUND" },
    };
  }

  // No-op request
  if (membership.role === result.data) {
    return {
      error: null,
    };
  }

  // Keep at least one Organization Admin.
  if (membership.role === "ADMIN" && result.data === "MEMBER") {
    const memberships = await db.orm.public.Membership.where({
      organizationId,
    }).all();

    const adminCount = memberships.filter(
      (membership) => membership.role === "ADMIN",
    ).length;

    if (adminCount <= 1) {
      return {
        error: { code: "ORGANIZATION_LAST_ADMIN" },
      };
    }
  }

  try {
    await db.orm.public.Membership.where({
      userId: targetUserId,
      organizationId,
    }).update({
      role: result.data,
    });
  } catch {
    return {
      error: { code: "MEMBER_ROLE_UPDATE_FAILED" },
    };
  }

  revalidatePath("/settings/organization");

  return {
    error: null,
  };
}
