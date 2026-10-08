import "server-only";

import { eventType, Inngest } from "inngest";
import { z } from "zod";

export const inngest = new Inngest({
  id: "evidence-atlas",
});

export function requireProductionSafeInngestMode() {
  if (process.env.NODE_ENV === "production" && inngest.mode === "dev") {
    throw new Error(
      "Inngest dev mode is not permitted in production. Check INNGEST_DEV.",
    );
  }
}

export const researchIndexRequested = eventType("research/index.requested", {
  schema: z.object({
    researchId: z.string().min(1),
  }),
});
