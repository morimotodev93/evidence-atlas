import * as Sentry from "@sentry/nextjs";

import {
  inngest,
  requireProductionSafeInngestMode,
  researchIndexRequested,
} from "@/inngest/client";

export async function requestResearchIndex(researchId: string) {
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
