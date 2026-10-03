import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireWorkspaceAccess } from "@/auth/requireWorkspaceAccess";
import { db } from "@/prisma/db";

import { CURRENT_WORKSPACE_COOKIE } from "./currentWorkspace";
import { getAccessibleWorkspaces } from "./getAccessibleWorkspaces";

export async function requireCurrentWorkspace(userId: string) {
  const cookieStore = await cookies();
  const workspaceId = cookieStore.get(CURRENT_WORKSPACE_COOKIE)?.value;

  if (workspaceId) {
    try {
      await requireWorkspaceAccess(userId, workspaceId);

      const workspace = await db.orm.public.Workspace.where({
        id: workspaceId,
      }).first();

      if (workspace) {
        return workspace;
      }
    } catch {
      // stale / unauthorized cookie:
      // fall through to an accessible workspace
    }
  }

  const [workspace] = await getAccessibleWorkspaces(userId);

  if (!workspace) {
    redirect("/onboarding");
  }

  return workspace;
}
