"use server";

import { redirect } from "next/navigation";

import { db } from "@/prisma/db";
import { commentSchema } from "@/types/research/comment";

export type CreateCommentState = {
  error: string | null;
};

export async function createComment(
  researchId: string,
  _previousState: CreateCommentState,
  formData: FormData,
): Promise<CreateCommentState> {
  const result = commentSchema.safeParse({
    content: String(formData.get("content") ?? ""),
  });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Invalid comment.",
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
    await db.orm.public.Comment.create({
      researchId: research.id,
      userId: research.createdById,
      content: result.data.content,
    });
  } catch {
    return {
      error: "Failed to add comment. Please try again.",
    };
  }

  redirect(`/research/${research.id}`);
}
