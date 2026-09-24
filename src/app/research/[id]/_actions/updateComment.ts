"use server";

import { redirect } from "next/navigation";

import { db } from "@/prisma/db";
import { commentSchema } from "@/types/research/";

export type UpdateCommentState = {
  error: string | null;
};

export async function updateComment(
  commentId: string,
  _previousState: UpdateCommentState,
  formData: FormData,
): Promise<UpdateCommentState> {
  const content = String(formData.get("content") ?? "").replace(/\r\n?/g, "\n");

  const result = commentSchema.safeParse({
    content,
  });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Invalid comment.",
    };
  }

  const comment = await db.orm.public.Comment.where({
    id: commentId,
  }).first();

  if (!comment) {
    return {
      error: "Comment not found.",
    };
  }

  try {
    await db.orm.public.Comment.where({
      id: comment.id,
    }).update({
      content: result.data.content,
    });
  } catch {
    return {
      error: "Failed to update comment. Please try again.",
    };
  }

  redirect(`/research/${comment.researchId}`);
}
