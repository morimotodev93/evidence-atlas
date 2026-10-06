import * as Sentry from "@sentry/nextjs";

import { inngest, researchIndexRequested } from "@/inngest/client";

export async function requestResearchIndex(researchId: string): Promise<void> {
  try {
    await inngest.send(
      researchIndexRequested.create({
        researchId,
      }),
    );
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

    console.error("Failed to enqueue research indexing.", {
      researchId,
      error,
    });
  }
}
