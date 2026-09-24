import { z } from "zod";

export const researchStatusSchema = z.enum([
  "IN_PROGRESS",
  "COMPLETED",
  "ARCHIVED",
]);

export type ResearchStatus = z.infer<typeof researchStatusSchema>;
