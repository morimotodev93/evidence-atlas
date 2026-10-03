import { requireOrganizationAccess } from "./requireOrganizationAccess";

export async function requireOrganizationAdmin(
  userId: string,
  organizationId: string,
) {
  const membership = await requireOrganizationAccess(userId, organizationId);

  if (membership.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  return membership;
}
