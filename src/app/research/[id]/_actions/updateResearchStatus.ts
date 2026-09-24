"use server";

import { redirect } from "next/navigation";

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

  const research = await db.orm.public.Research.where({
    id: researchId,
  }).first();

  if (!research) {
    return {
      error: "Research not found.",
    };
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
