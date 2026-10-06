import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { indexResearchFunction } from "@/inngest/functions/index-research";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [indexResearchFunction],
});
