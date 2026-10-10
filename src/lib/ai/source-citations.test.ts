import { describe, expect, it } from "vitest";

import {
  parseSourceCitations,
  validateSourceCitations,
} from "./source-citations";

import dataset from "../../../evals/ai-chat/cases.json";

describe("validateSourceCitations", () => {
  it("keeps an allowed source citation", () => {
    const text = "Example claim [source:source-1].";
    const allowedSourceIds = new Set(["source-1"]);

    const result = validateSourceCitations(text, allowedSourceIds);

    expect(result).toBe(text);
  });

  it("removes an unknown source citation", () => {
    const text = "Example claim [source:unknown].";
    const allowedSourceIds = new Set(["source-1"]);

    const result = validateSourceCitations(text, allowedSourceIds);

    expect(result).not.toContain("[source:unknown]");
  });

  it("removes unlinked research source citations from Case 2", () => {
    // Case 2を取得
    const testCase = dataset.cases.find(
      (item) => item.caseId === "ai-chat-02-contradiction",
    );

    if (!testCase) {
      throw new Error("Contradiction case not found");
    }

    // このケースの許可Source ID
    const allowedSourceIds = new Set(testCase.allowedSourceIds);

    // 許可されたSource
    const validSourceId = testCase.allowedSourceIds[0];

    // Researchには存在するが、許可リストにないSource
    const unlinkedSource = testCase.currentResearchContext.sources.find(
      (source) => !allowedSourceIds.has(source.id),
    );

    expect(validSourceId).toBeDefined();
    expect(unlinkedSource).toBeDefined();

    if (!validSourceId || !unlinkedSource) {
      throw new Error("Expected source fixtures are missing");
    }

    // 有効な引用と無効な引用を混在させる
    const text =
      `Valid claim [source:${validSourceId}]. ` +
      `Unlinked claim [source:${unlinkedSource.id}].`;

    // 実際のCitation関数を呼び出す
    const result = validateSourceCitations(text, allowedSourceIds);

    // 有効な引用は残る
    expect(result).toContain(`[source:${validSourceId}]`);

    // 未リンクSourceの引用は削除される
    expect(result).not.toContain(`[source:${unlinkedSource.id}]`);
  });
});

describe("parseSourceCitations", () => {
  it("deduplicates source IDs", () => {
    const text = "First [source:source-1]. Second [source:source-1].";

    const result = parseSourceCitations(text);

    expect(result.sourceIds).toEqual(["source-1"]);
    expect(result.text).not.toContain("[source:");
  });
});

it("removes citations when the allowlist is empty", () => {
  const text = "Claim [source:source-1].";
  const allowedSourceIds = new Set<string>();

  const result = validateSourceCitations(text, allowedSourceIds);

  expect(result).not.toContain("[source:source-1]");
});
