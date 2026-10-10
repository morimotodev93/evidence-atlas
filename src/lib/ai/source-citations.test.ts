import { describe, expect, it } from "vitest";

import {
  normalizeSourceCitationMarkers,
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

it("normalizes Japanese source citation brackets", () => {
  const result = normalizeSourceCitationMarkers(
    "結果【source:source-a】です。",
  );

  expect(result).toBe("結果[source:source-a]です。");
});

it("removes unallowed citations with Japanese brackets", () => {
  const allowedSourceIds = new Set(["source-a"]);

  const result = validateSourceCitations(
    "結果【source:source-a】 未確認【source:source-b】",
    allowedSourceIds,
  );

  expect(result).toBe("結果[source:source-a] 未確認");
});

it("parses both citation bracket styles", () => {
  const result = parseSourceCitations(
    "結果【source:source-a】と追加情報[source:source-b]",
  );

  expect(result).toEqual({
    text: "結果と追加情報",
    sourceIds: ["source-a", "source-b"],
  });
});

it("normalizes non-breaking hyphens in source IDs", () => {
  const allowed = new Set(["syn-inference-source-draft"]);

  const content =
    "作成時間が短縮【source:syn\u2011inference\u2011source\u2011draft】";

  const validated = validateSourceCitations(content, allowed);

  expect(validated).toBe("作成時間が短縮[source:syn-inference-source-draft]");

  const parsed = parseSourceCitations(validated);

  expect(parsed).toEqual({
    text: "作成時間が短縮",
    sourceIds: ["syn-inference-source-draft"],
  });
});

it("rejects unallowed IDs after Unicode normalization", () => {
  const allowed = new Set(["source-a"]);

  const result = validateSourceCitations(
    "未確認【source:unknown\u2011source】",
    allowed,
  );

  expect(result).toBe("未確認");
});

it("normalizes citations with spaces inside brackets", () => {
  const allowed = new Set(["syn-agreement-source-a", "syn-agreement-source-b"]);

  const raw =
    "Team A [ source:syn-agreement-source-a ]、" +
    "Team B [ source:syn-agreement-source-b ]";

  const validated = validateSourceCitations(raw, allowed);

  expect(validated).toBe(
    "Team A [source:syn-agreement-source-a]、" +
      "Team B [source:syn-agreement-source-b]",
  );

  expect(parseSourceCitations(validated).sourceIds).toEqual([
    "syn-agreement-source-a",
    "syn-agreement-source-b",
  ]);
});

it("rejects unallowed IDs with spaces inside brackets", () => {
  const result = validateSourceCitations(
    "未確認 [ source:unknown-id ]",
    new Set(["source-a"]),
  );

  expect(result).toBe("未確認 ");
});
