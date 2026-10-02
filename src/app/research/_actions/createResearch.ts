"use server";

import { requireUser } from "@/auth/requireUser";
import { redirect } from "next/navigation";

import { db } from "@/prisma/db";
import { researchSchema } from "@/types/research";

export async function createResearch(formData: FormData) {
  const result = researchSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "").trim() || null,
  });

  if (!result.success) {
    throw new Error(
      result.error.issues[0]?.message ?? "Invalid research data.",
    );
  }

  const user = await requireUser();

  const membership = await db.orm.public.WorkspaceMembership.where({
    userId: user.id,
  }).first();

  if (!membership) {
    throw new Error("No workspace is available.");
  }

  const research = await db.orm.public.Research.create({
    workspaceId: membership.workspaceId,
    createdById: user.id,
    title: result.data.title,
    description: result.data.description,
  });

  redirect(`/research/${research.id}`);
}
