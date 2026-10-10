import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { LanguageModelUsage } from "ai";
import type { EvaluationProvider } from "./evaluation-models";

export const DEFAULT_EVALUATION_RUN_DIRECTORY = "evals/ai-chat/runs";

type EvaluationFixture = {
  caseId: string;
  userQuestion: string;
  allowedSourceIds: readonly string[];
};

export type EvaluationRunRecord = {
  schemaVersion: "1.0";
  recordedAt: string;
  datasetId: string;
  datasetSchemaVersion: string;
  caseId: string;
  provider: EvaluationProvider;
  modelId: string;
  question: string;
  systemPromptSha256: string;
  fixtureSha256: string;
  allowedSourceIds: string[];
  response: {
    raw: string;
    validated: string;
    parsedText: string;
    parsedSourceIds: string[];
  };
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    reasoningTokens: number | null;
    cachedInputTokens: number | null;
  };
};

type BuildEvaluationRunInput<Fixture extends EvaluationFixture> = {
  dataset: { datasetId: string; schemaVersion: string };
  testCase: Fixture;
  provider: EvaluationProvider;
  modelId: string;
  systemPrompt: string;
  rawResponse: string;
  validatedResponse: string;
  parsed: { text: string; sourceIds: readonly string[] };
  usage: LanguageModelUsage;
};

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function buildEvaluationRunRecord<Fixture extends EvaluationFixture>(
  input: BuildEvaluationRunInput<Fixture>,
  recordedAt = new Date(),
): EvaluationRunRecord {
  return {
    schemaVersion: "1.0",
    recordedAt: recordedAt.toISOString(),
    datasetId: input.dataset.datasetId,
    datasetSchemaVersion: input.dataset.schemaVersion,
    caseId: input.testCase.caseId,
    provider: input.provider,
    modelId: input.modelId,
    question: input.testCase.userQuestion,
    systemPromptSha256: sha256(input.systemPrompt),
    // Compact JSON.stringify preserves the selected JSON fixture's property order.
    fixtureSha256: sha256(JSON.stringify(input.testCase)),
    allowedSourceIds: [...input.testCase.allowedSourceIds],
    response: {
      raw: input.rawResponse,
      validated: input.validatedResponse,
      parsedText: input.parsed.text,
      parsedSourceIds: [...input.parsed.sourceIds],
    },
    // Copy only normalized counts; never store unrestricted provider usage.
    usage: {
      inputTokens: input.usage.inputTokens ?? null,
      outputTokens: input.usage.outputTokens ?? null,
      totalTokens: input.usage.totalTokens ?? null,
      reasoningTokens:
        input.usage.outputTokenDetails.reasoningTokens ??
        input.usage.reasoningTokens ??
        null,
      cachedInputTokens:
        input.usage.inputTokenDetails.cacheReadTokens ??
        input.usage.cachedInputTokens ??
        null,
    },
  };
}

type WriteEvaluationRunOptions = {
  directory?: string;
  suffix?: () => string;
};

function filenameSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export async function writeEvaluationRunRecord(
  record: EvaluationRunRecord,
  options: WriteEvaluationRunOptions = {},
): Promise<string> {
  const directory = resolve(
    options.directory ?? DEFAULT_EVALUATION_RUN_DIRECTORY,
  );
  const timestamp = filenameSegment(record.recordedAt);
  const suffix = filenameSegment((options.suffix ?? randomUUID)());
  const filename = `${timestamp}_${record.provider}_${filenameSegment(record.caseId)}_${suffix}.json`;
  const filePath = join(directory, filename);
  const json = `${JSON.stringify(record, null, 2)}\n`;

  await mkdir(directory, { recursive: true });
  // Exclusive creation rejects even an unlikely UUID collision without overwriting.
  await writeFile(filePath, json, { encoding: "utf8", flag: "wx" });
  return filePath;
}
