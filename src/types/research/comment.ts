import { z } from "zod";

export const MAX_COMMENT_LENGTH = 5000;

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment is required.")
    .max(
      MAX_COMMENT_LENGTH,
      `Comment must be ${MAX_COMMENT_LENGTH} characters or less.`,
    ),
});

export type CommentFormValues = z.infer<typeof commentSchema>;

export type ResearchComment = {
  id: string;
  researchId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};
