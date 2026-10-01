import "dotenv/config";
import "temporal-polyfill/full/global";

import { indexResearch } from "@/lib/ai/index-research";

const researchId = process.argv[2];

if (!researchId) {
  throw new Error(
    "Usage: pnpm exec tsx scripts/index-research.ts <research-id>",
  );
}

await indexResearch(researchId);

console.log(`Indexed Research: ${researchId}`);
