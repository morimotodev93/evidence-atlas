"use server";

import { redirect } from "next/navigation";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";
import { requestResearchIndex } from "@/inngest/request-research-index";
import { db } from "@/prisma/db";
import { conclusionSchema } from "@/types/research/conclusion";

export type UpdateConclusionState = {
  error: string | null;
};

export async function updateConclusion(
  id: string,
  _previousState: UpdateConclusionState,
  formData: FormData,
): Promise<UpdateConclusionState> {
  const conclusion = String(formData.get("conclusion") ?? "").replace(
    /\r\n?/g,
    "\n",
  );

  const result = conclusionSchema.safeParse({
    conclusion,
  });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Invalid conclusion.",
    };
  }

  const user = await requireUser();

  try {
    await requireResearchAccess(user.id, id);
  } catch (error) {
    if (error instanceof ResearchAccessError) {
      return { error: "Research not found." };
    }

    throw error;
  }

  const research = await db.orm.public.Research.where({
    id,
  }).update({
    conclusion: result.data.conclusion || null,
  });

  if (!research) {
    throw new Error("Research not found.");
  }

  await requestResearchIndex(research.id);

  redirect(`/research/${research.id}`);
}
