"use server";

import { redirect } from "next/navigation";

import { db } from "@/prisma/db";
import { sourceSchema } from "@/types/research/source";

export type CreateSourceState = {
  error: string | null;
};

export async function createSource(
  researchId: string,
  _previousState: CreateSourceState,
  formData: FormData,
): Promise<CreateSourceState> {
  const result = sourceSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    url: String(formData.get("url") ?? "").trim(),
  });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Invalid source data.",
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
    await db.orm.public.Source.create({
      researchId: research.id,
      title: result.data.title,
      url: result.data.url,
    });
  } catch {
    return {
      error: "Failed to add source. Please try again.",
    };
  }

  redirect(`/research/${research.id}`);
}
