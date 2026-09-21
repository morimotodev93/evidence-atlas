"use server";

import { redirect } from "next/navigation";

import { db } from "@/prisma/db";

export type DeleteCommentState = {
  error: string | null;
};

export async function deleteComment(
  commentId: string,
  _previousState: DeleteCommentState,
): Promise<DeleteCommentState> {
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
    }).delete();
  } catch {
    return {
      error: "Failed to delete comment. Please try again.",
    };
  }

  redirect(`/research/${comment.researchId}`);
}
