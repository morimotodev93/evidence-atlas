import { db } from "@/prisma/db";

export async function requireOrganizationAccess(
  userId: string,
  organizationId: string,
) {
  const membership = await db.orm.public.Membership.where({
    userId,
    organizationId,
  }).first();

  if (!membership) {
    throw new Error("Forbidden");
  }

  return membership;
}
