"use server";

import { redirect } from "next/navigation";

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

  redirect(`/research/${finding.researchId}`);
}
