import { requireWorkspaceAccess } from "./requireWorkspaceAccess";

export async function requireWorkspaceAdmin(
  userId: string,
  workspaceId: string,
) {
  const membership = await requireWorkspaceAccess(userId, workspaceId);

  if (membership.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  return membership;
}
