"use server";

import { redirect } from "next/navigation";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";

import { db } from "@/prisma/db";

export type DetachTagState = {
  error: string | null;
};

export async function detachTag(
  researchId: string,
  tagId: string,
): Promise<DetachTagState> {
  const user = await requireUser();

  let research;

  try {
    research = await requireResearchAccess(user.id, researchId);
  } catch (error) {
    if (error instanceof ResearchAccessError) {
      return {
        error: "Research not found.",
      };
    }

    throw error;
  }

  const researchTag = await db.orm.public.ResearchTag.where({
    researchId: research.id,
    tagId,
  }).first();

  if (!researchTag) {
    return {
      error: "Tag is not attached to this research.",
    };
  }

  try {
    await db.orm.public.ResearchTag.where({
      researchId: research.id,
      tagId,
    }).delete();
  } catch {
    return {
      error: "Failed to remove tag. Please try again.",
    };
  }

  redirect(`/research/${research.id}`);
}
