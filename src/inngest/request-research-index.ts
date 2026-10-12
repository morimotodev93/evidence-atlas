import * as Sentry from "@sentry/nextjs";
import { isC2Runtime } from "@/lib/c2/service-policy";

import {
  inngest,
  requireProductionSafeInngestMode,
  researchIndexRequested,
} from "@/inngest/client";

export async function requestResearchIndex(researchId: string) {
  // Expected C2 no-op, before the error-reporting path and event creation.
  if (isC2Runtime()) return;
  try {
    requireProductionSafeInngestMode();

    const event = researchIndexRequested.create({
      researchId,
    });

    await inngest.send(event);
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        subsystem: "background-jobs",
        operation: "research-index-enqueue",
      },
      extra: {
        researchId,
      },
    });

    console.error("Failed to enqueue research indexing", {
      researchId,
      error,
    });
  }
}
