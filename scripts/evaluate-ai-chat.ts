import { generateText } from "ai";
import { config } from "dotenv";

import dataset from "../evals/ai-chat/cases.json";

import { buildChatSystemPrompt } from "../src/lib/ai/chat-system-prompt";

import {
  getEvaluationModel,
  type EvaluationProvider,
} from "./evaluation-models";

import type { WorkspaceRetrievalContext } from "../src/lib/ai/retrieve-workspace-context";

import {
  parseSourceCitations,
  validateSourceCitations,
} from "../src/lib/ai/source-citations";

// .env を読み込む
const envResult = config({
  path: ".env",
  quiet: true,
});

if (envResult.error) {
  throw new Error(`Failed to load .env: ${envResult.error.message}`);
}

// コマンドライン引数
const caseId = process.argv[2] ?? "ai-chat-01-agreement";
const providerArg = process.argv[3] ?? "gemini";

// 不正なProvider名を拒否
if (providerArg !== "gemini" && providerArg !== "groq") {
  throw new Error(`Unsupported evaluation provider: ${providerArg}`);
}

const provider: EvaluationProvider = providerArg;

// モデルを選択
const { model, modelId, apiKeyName } = getEvaluationModel(provider);

// 選択されたProviderのAPIキーを確認
if (!process.env[apiKeyName]?.trim()) {
  throw new Error(`${apiKeyName} is not loaded`);
}

// 評価ケースを取得
const testCase = dataset.cases.find((item) => item.caseId === caseId);

if (!testCase) {
  throw new Error(`Evaluation case not found: ${caseId}`);
}

console.log(`=== Provider: ${provider} ===`);
console.log(`=== Model: ${modelId} ===`);
console.log(`=== Evaluating: ${testCase.caseId} ===`);
console.log(`Question: ${testCase.userQuestion}`);

// 共通System Promptを使用
const system = buildChatSystemPrompt(
  testCase.currentResearchContext,
  testCase.workspaceRetrievalContext as WorkspaceRetrievalContext,
);

// 選択したモデルで生成
const result = await generateText({
  model,
  system,
  prompt: testCase.userQuestion,
});

// モデルが生成した元の回答
console.log("=== Raw Response ===");
console.log(result.text);

// 許可されたSource IDだけを残す
const allowedSourceIds = new Set(testCase.allowedSourceIds);

const validated = validateSourceCitations(result.text, allowedSourceIds);

console.log("=== Validated Response ===");
console.log(validated);

// Citationを抽出する
const parsed = parseSourceCitations(validated);

console.log("=== Parsed Citations ===");
console.log(parsed.sourceIds);

console.log("=== Parsed Text ===");
console.log(parsed.text);

console.log("=== Token Usage ===");
console.log(result.usage);
