"use server";

import { redirect } from "next/navigation";

import { db } from "@/prisma/db";
import { findingSchema } from "@/types/research/finding";

export type CreateFindingState = {
  error: string | null;
};

export async function createFinding(
  researchId: string,
  _previousState: CreateFindingState,
  formData: FormData,
): Promise<CreateFindingState> {
  const content = String(formData.get("content") ?? "").replace(/\r\n?/g, "\n");

  const result = findingSchema.safeParse({
    content,
  });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Invalid finding data.",
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
    await db.orm.public.Finding.create({
      researchId: research.id,
      content: result.data.content,
    });
  } catch {
    return {
      error: "Failed to add finding. Please try again.",
    };
  }

  redirect(`/research/${research.id}`);
}
