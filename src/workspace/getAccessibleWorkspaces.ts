import { db } from "@/prisma/db";

export async function requireCurrentWorkspace(userId: string) {
  const membership = await db.orm.public.WorkspaceMembership.where({
    userId,
  }).first();

  if (!membership) {
    throw new Error("No accessible workspace");
  }

  return membership;
}
