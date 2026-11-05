"use server";

import { redirect } from "next/navigation";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";
import type { DisplayError } from "@/lib/i18n/errors";

import { db } from "@/prisma/db";
import { researchStatusSchema } from "@/types/research/status";

export type UpdateResearchStatusState = {
  error: DisplayError | null;
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
      error: { code: "RESEARCH_INVALID_STATUS" },
    };
  }

  const user = await requireUser();

  let research;

  try {
    research = await requireResearchAccess(user.id, researchId);
  } catch (error) {
    if (error instanceof ResearchAccessError) {
      return {
        error: { code: "RESEARCH_NOT_FOUND" },
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
      error: { code: "RESEARCH_STATUS_UPDATE_FAILED" },
    };
  }

  redirect(`/research/${research.id}`);
}
