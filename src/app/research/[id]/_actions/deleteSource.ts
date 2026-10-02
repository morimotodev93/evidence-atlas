"use server";

import { redirect } from "next/navigation";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";
import { db } from "@/prisma/db";

export type DeleteSourceState = {
  error: string | null;
};

export async function deleteSource(
  sourceId: string,
  _previousState: DeleteSourceState,
): Promise<DeleteSourceState> {
  const source = await db.orm.public.Source.where({
    id: sourceId,
  }).first();

  if (!source) {
    return {
      error: "Source not found.",
    };
  }

  const user = await requireUser();

  try {
    await requireResearchAccess(user.id, source.researchId);
  } catch (error) {
    if (error instanceof ResearchAccessError) {
      return { error: "Research not found." };
    }

    throw error;
  }

  try {
    await db.orm.public.Source.where({
      id: source.id,
    }).delete();
  } catch {
    return {
      error: "Failed to delete source. Please try again.",
    };
  }

  redirect(`/research/${source.researchId}`);
}
