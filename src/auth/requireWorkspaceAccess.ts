import { db } from "@/prisma/db";

export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string,
) {
  const membership = await db.orm.public.WorkspaceMembership.where({
    userId,
    workspaceId,
  }).first();

  if (!membership) {
    throw new Error("Forbidden");
  }

  return membership;
}
