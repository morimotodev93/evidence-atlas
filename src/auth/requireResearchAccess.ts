import { db } from "@/prisma/db";

import { requireWorkspaceAccess } from "./requireWorkspaceAccess";

export class ResearchAccessError extends Error {
  constructor() {
    super("Research access denied");
    this.name = "ResearchAccessError";
  }
}

export async function requireResearchAccess(
  userId: string,
  researchId: string,
) {
  const research = await db.orm.public.Research.where({
    id: researchId,
  }).first();

  if (!research) {
    throw new ResearchAccessError();
  }

  try {
    await requireWorkspaceAccess(userId, research.workspaceId);
  } catch {
    throw new ResearchAccessError();
  }

  return research;
}
