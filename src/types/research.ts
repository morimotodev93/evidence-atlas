import { z } from "zod";

export const createResearchSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().nullable(),
});

export type CreateResearchInput = z.infer<typeof createResearchSchema>;

export type ResearchListItem = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
};
