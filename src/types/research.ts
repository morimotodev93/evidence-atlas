import { z } from "zod";

export const researchSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or less."),

  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or less.")
    .nullable(),
});

export type ResearchInput = z.infer<typeof researchSchema>;

export type ResearchListItem = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
};
