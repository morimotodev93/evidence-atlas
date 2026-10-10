import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import type { LanguageModelUsage } from "ai";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildEvaluationRunRecord,
  writeEvaluationRunRecord,
} from "./evaluation-run-storage";

// Synthetic observations only: no provider modules or generation calls.
const recordedAt = new Date("2026-10-10T01:02:03.456Z");
const usage: LanguageModelUsage = {
  inputTokens: 120,
  outputTokens: 45,
  totalTokens: 165,
  inputTokenDetails: {
    noCacheTokens: 100,
    cacheReadTokens: 20,
    cacheWriteTokens: undefined,
  },
  outputTokenDetails: { textTokens: 35, reasoningTokens: 10 },
  raw: { privateProviderData: "do-not-persist" },
};
const input = {
  dataset: {
    datasetId: "evidence-atlas-ai-chat-quality-six-cases",
    schemaVersion: "1.0",
  },
  testCase: {
    caseId: "ai-chat-03-inference",
    userQuestion: "What can we infer?",
    allowedSourceIds: ["synthetic-source"],
    currentResearchContext: { findings: [{ content: "Synthetic observation" }] },
    workspaceRetrievalContext: { results: [] },
  },
  provider: "groq" as const,
  modelId: "openai/gpt-oss-120b",
  systemPrompt: "Use only supplied evidence.\n日本語",
  rawResponse: "観察【source:synthetic-source】 不明[source:unknown]",
  validatedResponse: "観察[source:synthetic-source] 不明",
  parsed: { text: "観察 不明", sourceIds: ["synthetic-source"] },
  usage,
};

const temporaryDirectories: string[] = [];

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), "ai-chat-runs-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("buildEvaluationRunRecord", () => {
  it("records versioned metadata and separate response stages", () => {
    const record = buildEvaluationRunRecord(input, recordedAt);

    expect(record).toEqual({
      schemaVersion: "1.0",
      recordedAt: "2026-10-10T01:02:03.456Z",
      datasetId: input.dataset.datasetId,
      datasetSchemaVersion: "1.0",
      caseId: input.testCase.caseId,
      provider: "groq",
      modelId: "openai/gpt-oss-120b",
      question: input.testCase.userQuestion,
      systemPromptSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      fixtureSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      allowedSourceIds: ["synthetic-source"],
      response: {
        raw: input.rawResponse,
        validated: input.validatedResponse,
        parsedText: "観察 不明",
        parsedSourceIds: ["synthetic-source"],
      },
      usage: {
        inputTokens: 120,
        outputTokens: 45,
        totalTokens: 165,
        reasoningTokens: 10,
        cachedInputTokens: 20,
      },
    });
    expect(JSON.stringify(record)).not.toContain("do-not-persist");
  });

  it("hashes the exact prompt and complete consistently serialized case", () => {
    const first = buildEvaluationRunRecord(input, recordedAt);
    const repeat = buildEvaluationRunRecord(input, new Date("2026-10-11T00:00:00Z"));

    expect(first.systemPromptSha256).toBe(
      createHash("sha256").update(input.systemPrompt, "utf8").digest("hex"),
    );
    expect(first.fixtureSha256).toBe(
      createHash("sha256").update(JSON.stringify(input.testCase), "utf8").digest("hex"),
    );
    expect(repeat.systemPromptSha256).toBe(first.systemPromptSha256);
    expect(repeat.fixtureSha256).toBe(first.fixtureSha256);

    const changedPrompt = buildEvaluationRunRecord({ ...input, systemPrompt: `${input.systemPrompt} ` });
    expect(changedPrompt.systemPromptSha256).not.toBe(first.systemPromptSha256);
    expect(changedPrompt.fixtureSha256).toBe(first.fixtureSha256);
    const changedFixture = buildEvaluationRunRecord({
      ...input,
      testCase: { ...input.testCase, workspaceRetrievalContext: { results: ["changed"] } },
    });
    expect(changedFixture.fixtureSha256).not.toBe(first.fixtureSha256);
    expect(changedFixture.systemPromptSha256).toBe(first.systemPromptSha256);
  });

  it("stores missing optional usage as null and preserves zero counts", () => {
    const record = buildEvaluationRunRecord({
      ...input,
      usage: {
        ...usage,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        inputTokenDetails: { ...usage.inputTokenDetails, cacheReadTokens: undefined },
        outputTokenDetails: { textTokens: undefined, reasoningTokens: undefined },
      },
    });

    expect(record.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      reasoningTokens: null,
      cachedInputTokens: null,
    });
  });

  it("does not invent totals when the provider omits counts", () => {
    const record = buildEvaluationRunRecord({
      ...input,
      usage: { ...usage, inputTokens: undefined, outputTokens: undefined, totalTokens: undefined },
    });

    expect(record.usage).toEqual({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      reasoningTokens: 10,
      cachedInputTokens: 20,
    });
  });

  it("uses modern usage details before legacy optional fields", () => {
    const record = buildEvaluationRunRecord({
      ...input,
      usage: { ...usage, reasoningTokens: 99, cachedInputTokens: 99 },
    });
    expect(record.usage.reasoningTokens).toBe(10);
    expect(record.usage.cachedInputTokens).toBe(20);

    const legacy = buildEvaluationRunRecord({
      ...input,
      usage: {
        ...usage,
        inputTokenDetails: { ...usage.inputTokenDetails, cacheReadTokens: undefined },
        outputTokenDetails: { textTokens: undefined, reasoningTokens: undefined },
        reasoningTokens: 0,
        cachedInputTokens: 0,
      },
    });
    expect(legacy.usage.reasoningTokens).toBe(0);
    expect(legacy.usage.cachedInputTokens).toBe(0);
  });
});

describe("writeEvaluationRunRecord", () => {
  it("creates nested directories and readable UTF-8 JSON", async () => {
    const directory = join(await temporaryDirectory(), "nested", "runs");
    const record = buildEvaluationRunRecord(input, recordedAt);
    const filePath = await writeEvaluationRunRecord(record, { directory, suffix: () => "fixed" });

    expect(basename(filePath)).toBe(
      "2026-10-10T01-02-03-456Z_groq_ai-chat-03-inference_fixed.json",
    );
    const content = await readFile(filePath, "utf8");
    expect(content).toBe(`${JSON.stringify(record, null, 2)}\n`);
    expect(JSON.parse(content)).toEqual(record);
  });

  it("uses distinct filenames for simultaneous runs with identical timestamps", async () => {
    const directory = await temporaryDirectory();
    const record = buildEvaluationRunRecord(input, recordedAt);
    const paths = await Promise.all([
      writeEvaluationRunRecord(record, { directory }),
      writeEvaluationRunRecord(record, { directory }),
    ]);

    expect(paths[0]).not.toBe(paths[1]);
    expect(await readdir(directory)).toHaveLength(2);
  });

  it("rejects filename collisions without overwriting the existing file", async () => {
    const directory = await temporaryDirectory();
    const record = buildEvaluationRunRecord(input, recordedAt);
    const options = { directory, suffix: () => "collision" };
    const filePath = await writeEvaluationRunRecord(record, options);
    const original = await readFile(filePath, "utf8");

    await expect(writeEvaluationRunRecord({ ...record, question: "Changed" }, options))
      .rejects.toMatchObject({ code: "EEXIST" });
    expect(await readFile(filePath, "utf8")).toBe(original);
    expect(await readdir(directory)).toHaveLength(1);
  });

  it("propagates filesystem errors without reporting a saved path", async () => {
    const directory = await temporaryDirectory();
    const blocked = join(directory, "not-a-directory");
    await writeFile(blocked, "existing file", "utf8");

    await expect(writeEvaluationRunRecord(buildEvaluationRunRecord(input), {
      directory: join(blocked, "runs"),
    })).rejects.toThrow();
    expect(await readFile(blocked, "utf8")).toBe("existing file");
    expect(await readdir(directory)).toEqual(["not-a-directory"]);
  });
});
