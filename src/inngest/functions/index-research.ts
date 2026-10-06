import { inngest, researchIndexRequested } from "@/inngest/client";
import { indexResearch } from "@/lib/ai/index-research";

export const indexResearchFunction = inngest.createFunction(
  {
    id: "index-research",

    triggers: [researchIndexRequested],

    debounce: {
      key: "event.data.researchId",
      period: "5s",
      timeout: "30s",
    },

    singleton: {
      key: "event.data.researchId",
      mode: "cancel",
    },

    retries: 3,
  },
  async ({ event, step }) => {
    return await step.run("index-research", async () => {
      return await indexResearch(event.data.researchId);
    });
  },
);
