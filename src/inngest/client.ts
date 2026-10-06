import { eventType, Inngest } from "inngest";
import { z } from "zod";

export const inngest = new Inngest({
  id: "evidence-atlas",
});

export const researchIndexRequested = eventType("research/index.requested", {
  schema: z.object({
    researchId: z.string().min(1),
  }),
});
