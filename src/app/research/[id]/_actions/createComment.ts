"use server";

import { redirect } from "next/navigation";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";

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
  const content = String(formData.get("content") ?? "").replace(/\r\n?/g, "\n");

  const result = commentSchema.safeParse({
    content,
  });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Invalid comment.",
    };
  }

  const user = await requireUser();

  let research;

  try {
    research = await requireResearchAccess(user.id, researchId);
  } catch (error) {
    if (error instanceof ResearchAccessError) {
      return {
        error: "Research not found.",
      };
    }

    throw error;
  }

  try {
    await db.orm.public.Comment.create({
      researchId: research.id,
      userId: user.id,
      content: result.data.content,
    });
  } catch {
    return {
      error: "Failed to add comment. Please try again.",
    };
  }

  redirect(`/research/${research.id}`);
}
