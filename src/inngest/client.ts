import "server-only";

import { eventType, Inngest } from "inngest";
import { z } from "zod";
import { isC2Runtime, requireExternalServiceEnabled } from "@/lib/c2/service-policy";

export const inngest = isC2Runtime() ? new Proxy({} as Inngest, {
  get() {
    requireExternalServiceEnabled();
    throw new Error("C2 jobs client is disabled.");
  },
}) : new Inngest({
  id: "evidence-atlas",
});

export function requireProductionSafeInngestMode() {
  requireExternalServiceEnabled();
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
