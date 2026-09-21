"use server";

import { redirect } from "next/navigation";

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

  try {
    await db.orm.public.Finding.where({
      id: finding.id,
    }).delete();
  } catch {
    return {
      error: "Failed to delete finding. Please try again.",
    };
  }

  redirect(`/research/${finding.researchId}`);
}
