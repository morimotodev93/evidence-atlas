"use server";

import { redirect } from "next/navigation";

import { db } from "@/prisma/db";
import { researchSchema } from "@/types/research";

export async function updateResearch(id: string, formData: FormData) {
  const result = researchSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "").trim() || null,
  });

  if (!result.success) {
    throw new Error(
      result.error.issues[0]?.message ?? "Invalid research data.",
    );
  }

  const research = await db.orm.public.Research.where({
    id,
  }).update({
    title: result.data.title,
    description: result.data.description,
  });

  if (!research) {
    throw new Error("Research not found.");
  }

  redirect(`/research/${research.id}`);
}
