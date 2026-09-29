import "dotenv/config";
import "temporal-polyfill/full/global";

import { indexResearch } from "../src/lib/ai/index-research";

const researchId = process.argv[2];

if (!researchId) {
  throw new Error(
    "Usage: pnpm tsx scripts/test-index-research.ts <research-id>",
  );
}

const result = await indexResearch(researchId);

console.log(result);
