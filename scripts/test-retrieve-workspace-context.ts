import "dotenv/config";
import "temporal-polyfill/full/global";

import { retrieveWorkspaceContext } from "@/lib/ai/retrieve-workspace-context";

const workspaceId = process.argv[2];
const question = process.argv.slice(3).join(" ").trim();

if (!workspaceId || !question) {
  throw new Error(
    'Usage: pnpm exec tsx scripts/test-retrieve-workspace-context.ts <workspace-id> "question"',
  );
}

const context = await retrieveWorkspaceContext(workspaceId, question);

console.dir(context, {
  depth: null,
});
