import { z } from "zod";

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment is required.")
    .max(5000, "Comment must be 5000 characters or less."),
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
