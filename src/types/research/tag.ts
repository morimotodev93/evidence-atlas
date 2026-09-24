import { z } from "zod";

export const MAX_TAG_LENGTH = 50;

export const tagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tag is required")
    .max(MAX_TAG_LENGTH, `Tag must be ${MAX_TAG_LENGTH} characters or less`),
});

export type TagInput = z.infer<typeof tagSchema>;
