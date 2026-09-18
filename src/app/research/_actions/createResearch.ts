"use server";

import { redirect } from "next/navigation";

import { db } from "@/prisma/db";
import {
  createResearchSchema,
  type CreateResearchInput,
} from "@/types/research";

export async function createResearch(formData: FormData) {
  const input: CreateResearchInput = {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "").trim() || null,
  };

  const result = createResearchSchema.safeParse(input);

  if (!result.success) {
    throw new Error(
      result.error.issues[0]?.message ?? "Invalid research data.",
    );
  }

  const workspace = await db.orm.public.Workspace.first();
  const user = await db.orm.public.User.first();

  if (!workspace) {
    throw new Error("No workspace is available.");
  }

  if (!user) {
    throw new Error("No user is available.");
  }

  const research = await db.orm.public.Research.create({
    workspaceId: workspace.id,
    createdById: user.id,
    title: result.data.title,
    description: result.data.description,
  });

  redirect(`/research/${research.id}`);
}
