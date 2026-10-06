"use server";

import { redirect } from "next/navigation";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";
import { requestResearchIndex } from "@/inngest/request-research-index";
import { db } from "@/prisma/db";
import { findingSchema } from "@/types/research/finding";

export type UpdateFindingState = {
  error: string | null;
};

export async function updateFinding(
  findingId: string,
  _previousState: UpdateFindingState,
  formData: FormData,
): Promise<UpdateFindingState> {
  const content = String(formData.get("content") ?? "").replace(/\r\n?/g, "\n");

  const result = findingSchema.safeParse({
    content,
  });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Invalid finding data.",
    };
  }

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
    }).update({
      content: result.data.content,
    });
  } catch {
    return {
      error: "Failed to update finding. Please try again.",
    };
  }

  await requestResearchIndex(finding.researchId);

  redirect(`/research/${finding.researchId}`);
}
