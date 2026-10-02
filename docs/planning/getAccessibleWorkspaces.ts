// src/workspace/getAccessibleWorkspaces.ts

import { db } from "@/prisma/db";

export async function getAccessibleWorkspaces(userId: string) {
  const memberships = await db.orm.public.WorkspaceMembership.where({
    userId,
  })
    .include("workspace")
    .all();

  return memberships.map(({ workspace }) => workspace);
}
