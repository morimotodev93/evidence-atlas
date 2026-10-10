import type { EvaluationProvider } from "./evaluation-models";

export function parseEvaluationCliOptions(args: readonly string[]) {
  const positional: string[] = [];
  let save = false;

  for (const arg of args) {
    if (arg === "--save") {
      save = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unsupported evaluation option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 2) {
    throw new Error("Usage: evaluate-ai-chat.ts [case-id] [gemini|groq] [--save]");
  }

  const caseId = positional[0] ?? "ai-chat-01-agreement";
  const providerArg = positional[1] ?? "gemini";

  if (providerArg !== "gemini" && providerArg !== "groq") {
    throw new Error(`Unsupported evaluation provider: ${providerArg}`);
  }

  const provider: EvaluationProvider = providerArg;
  return { caseId, provider, save };
}
