import { z } from "zod";

export const sourceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),

  url: z
    .url("Please enter a valid URL")
    .max(2048, "URL must be 2048 characters or less"),
});

export type SourceInput = z.infer<typeof sourceSchema>;
