"use server";

import { redirect } from "next/navigation";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";

import { db } from "@/prisma/db";
import { researchStatusSchema } from "@/types/research/status";

export type UpdateResearchStatusState = {
  error: string | null;
};

export async function updateResearchStatus(
  researchId: string,
  _previousState: UpdateResearchStatusState,
  formData: FormData,
): Promise<UpdateResearchStatusState> {
  const result = researchStatusSchema.safeParse(
    String(formData.get("status") ?? ""),
  );

  if (!result.success) {
    return {
      error: "Invalid research status.",
    };
  }

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

  try {
    await db.orm.public.Research.where({
      id: research.id,
    }).update({
      status: result.data,
    });
  } catch {
    return {
      error: "Failed to update research status. Please try again.",
    };
  }

  redirect(`/research/${research.id}`);
}
