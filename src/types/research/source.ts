import { z } from "zod";

export const MAX_SOURCE_TITLE_LENGTH = 200;
export const MAX_SOURCE_URL_LENGTH = 2048;

export const sourceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(
      MAX_SOURCE_TITLE_LENGTH,
      `Title must be ${MAX_SOURCE_TITLE_LENGTH} characters or less`,
    ),

  url: z
    .url("Please enter a valid URL")
    .max(
      MAX_SOURCE_URL_LENGTH,
      `URL must be ${MAX_SOURCE_URL_LENGTH} characters or less`,
    ),
});

export type SourceInput = z.infer<typeof sourceSchema>;
