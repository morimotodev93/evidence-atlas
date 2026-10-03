import { db } from "@/prisma/db";

export class WorkspaceAccessError extends Error {
  constructor() {
    super("Workspace access denied");
    this.name = "WorkspaceAccessError";
  }
}

export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string,
) {
  const membership = await db.orm.public.WorkspaceMembership.where({
    userId,
    workspaceId,
  }).first();

  if (!membership) {
    throw new WorkspaceAccessError();
  }

  return membership;
}
