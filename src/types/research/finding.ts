import { z } from "zod";

export const MAX_FINDING_LENGTH = 10000;

export const findingSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Content is required")
    .max(MAX_FINDING_LENGTH, "Content must be 10000 characters or less"),
});

export type FindingInput = z.infer<typeof findingSchema>;
