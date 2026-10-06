import { inngest, researchIndexRequested } from "@/inngest/client";

export async function requestResearchIndex(researchId: string): Promise<void> {
  try {
    await inngest.send(
      researchIndexRequested.create({
        researchId,
      }),
    );
  } catch (error) {
    console.error("Failed to enqueue research indexing.", {
      researchId,
      error,
    });
  }
}
