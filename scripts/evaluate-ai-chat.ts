import { generateText } from "ai";
import { config } from "dotenv";

import dataset from "../evals/ai-chat/cases.json";

import { buildChatSystemPrompt } from "../src/lib/ai/chat-system-prompt";
import { researchModel } from "../src/lib/ai/model";

import type { WorkspaceRetrievalContext } from "../src/lib/ai/retrieve-workspace-context";

// 環境変数
const envResult = config({
  path: ".env",
  quiet: true,
});

if (envResult.error) {
  throw new Error(`Failed to load .env: $DIL1`);
}

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
  throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not loaded");
}

// Case 1を取得
const testCase = dataset.cases.find(
  (item) => item.caseId === "ai-chat-01-agreement",
);

if (!testCase) {
  throw new Error("Agreement case not found");
}

// 本番と同じSystem Promptを組み立てる
const system = buildChatSystemPrompt(
  testCase.currentResearchContext,
  testCase.workspaceRetrievalContext as WorkspaceRetrievalContext,
);

// Geminiに質問する
const { text } = await generateText({
  model: researchModel,
  system,
  prompt: testCase.userQuestion,
});

// 回答を表示
console.log("=== Gemini Response ===");
console.log(text);
