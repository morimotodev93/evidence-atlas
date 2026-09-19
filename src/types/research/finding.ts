import { z } from "zod";

export const findingSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Content is required")
    .max(10000, "Content must be 10000 characters or less"),
});

export type FindingInput = z.infer<typeof findingSchema>;
