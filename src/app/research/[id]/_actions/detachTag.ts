"use server";

import { redirect } from "next/navigation";

import { db } from "@/prisma/db";

export type DetachTagState = {
  error: string | null;
};

export async function detachTag(
  researchId: string,
  tagId: string,
): Promise<DetachTagState> {
  const research = await db.orm.public.Research.where({
    id: researchId,
  }).first();

  if (!research) {
    return {
      error: "Research not found.",
    };
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
