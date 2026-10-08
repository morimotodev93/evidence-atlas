"use server";

import { redirect } from "next/navigation";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";
import { requireApplicationEnabled } from "@/lib/deployment-mode";
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
  requireApplicationEnabled();

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

  const user = await requireUser();

  try {
    await requireResearchAccess(user.id, comment.researchId);
  } catch (error) {
    if (error instanceof ResearchAccessError) {
      return { error: "Research not found." };
    }

    throw error;
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
