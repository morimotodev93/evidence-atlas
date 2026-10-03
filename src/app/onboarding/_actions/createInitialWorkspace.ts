"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/auth/requireUser";
import { db } from "@/prisma/db";
import { CURRENT_WORKSPACE_COOKIE } from "@/workspace/currentWorkspace";
import { getAccessibleWorkspaces } from "@/workspace/getAccessibleWorkspaces";

const onboardingSchema = z.object({
  organizationName: z.string().trim().min(1).max(100),
  workspaceName: z.string().trim().min(1).max(100),
});

export type CreateInitialWorkspaceState = {
  error: string | null;
};

export async function createInitialWorkspace(
  _previousState: CreateInitialWorkspaceState,
  formData: FormData,
): Promise<CreateInitialWorkspaceState> {
  const result = onboardingSchema.safeParse({
    organizationName: String(formData.get("organizationName") ?? ""),
    workspaceName: String(formData.get("workspaceName") ?? ""),
  });

  if (!result.success) {
    return {
      error: "Enter an organization name and workspace name.",
    };
  }

  const user = await requireUser();

  // Do not run onboarding again for an already provisioned user.
  const existingWorkspaces = await getAccessibleWorkspaces(user.id);

  if (existingWorkspaces.length > 0) {
    redirect("/");
  }

  let workspaceId: string;

  try {
    workspaceId = await db.transaction(async (tx) => {
      const organization = await tx.orm.public.Organization.create({
        name: result.data.organizationName,
      });

      await tx.orm.public.Membership.create({
        userId: user.id,
        organizationId: organization.id,
        role: "ADMIN",
      });

      const workspace = await tx.orm.public.Workspace.create({
        organizationId: organization.id,
        name: result.data.workspaceName,
      });

      await tx.orm.public.WorkspaceMembership.create({
        userId: user.id,
        workspaceId: workspace.id,
        role: "ADMIN",
      });

      return workspace.id;
    });
  } catch {
    return {
      error: "Failed to create your workspace. Please try again.",
    };
  }

  const cookieStore = await cookies();

  cookieStore.set(CURRENT_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  redirect("/");
}
