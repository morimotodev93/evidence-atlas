"use server";

import { redirect } from "next/navigation";

import { db } from "@/prisma/db";
import { sourceSchema } from "@/types/research/source";

export type UpdateSourceState = {
  error: string | null;
};

export async function updateSource(
  sourceId: string,
  _previousState: UpdateSourceState,
  formData: FormData,
): Promise<UpdateSourceState> {
  const result = sourceSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    url: String(formData.get("url") ?? "").trim(),
  });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Invalid source data.",
    };
  }

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
    }).update({
      title: result.data.title,
      url: result.data.url,
    });
  } catch {
    return {
      error: "Failed to update source. Please try again.",
    };
  }

  redirect(`/research/${source.researchId}`);
}
