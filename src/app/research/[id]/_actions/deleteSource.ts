"use server";

import { redirect } from "next/navigation";

import { db } from "@/prisma/db";

export type DeleteSourceState = {
  error: string | null;
};

export async function deleteSource(
  sourceId: string,
  _previousState: DeleteSourceState,
  _formData: FormData,
): Promise<DeleteSourceState> {
  const source = await db.orm.public.Source.where({
    id: sourceId,
  }).first();

  if (!source) {
    return {
      error: "Source not found.",
    };
  }

  try {
    await db.orm.public.Source.where({
      id: source.id,
    }).delete();
  } catch {
    return {
      error: "Failed to delete source. Please try again.",
    };
  }

  redirect(`/research/${source.researchId}`);
}
