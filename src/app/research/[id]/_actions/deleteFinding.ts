"use server";

import { redirect } from "next/navigation";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";
import { requestResearchIndex } from "@/inngest/request-research-index";
import { db } from "@/prisma/db";

export type DeleteFindingState = {
  error: string | null;
};

export async function deleteFinding(
  findingId: string,
  _previousState: DeleteFindingState,
): Promise<DeleteFindingState> {
  const finding = await db.orm.public.Finding.where({
    id: findingId,
  }).first();

  if (!finding) {
    return {
      error: "Finding not found.",
    };
  }

  const user = await requireUser();

  try {
    await requireResearchAccess(user.id, finding.researchId);
  } catch (error) {
    if (error instanceof ResearchAccessError) {
      return { error: "Research not found." };
    }

    throw error;
  }

  try {
    await db.orm.public.Finding.where({
      id: finding.id,
    }).delete();
  } catch {
    return {
      error: "Failed to delete finding. Please try again.",
    };
  }

  await requestResearchIndex(finding.researchId);

  redirect(`/research/${finding.researchId}`);
}
