"use server";

import { redirect } from "next/navigation";

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
  const conclusion = String(formData.get("conclusion") ?? "");

  const result = conclusionSchema.safeParse({
    conclusion,
  });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Invalid conclusion.",
    };
  }
  const research = await db.orm.public.Research.where({
    id,
  }).update({
    conclusion: result.data.conclusion || null,
  });

  if (!research) {
    throw new Error("Research not found.");
  }

  redirect(`/research/${research.id}`);
}
