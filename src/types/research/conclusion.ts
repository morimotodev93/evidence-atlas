import { z } from "zod";

export const MAX_CONCLUSION_LENGTH = 5000;

export const conclusionSchema = z.object({
  conclusion: z
    .string()
    .trim()
    .max(MAX_CONCLUSION_LENGTH, "Conclusion must be 5000 characters or less"),
});
