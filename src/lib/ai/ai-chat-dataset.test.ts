import { describe, expect, it } from "vitest";

import dataset from "../../../evals/ai-chat/cases.json";

describe("AI Chat evaluation dataset", () => {
  it.each(dataset.cases)(
    "derives allowed source IDs for $caseId",
    (testCase) => {
      // Current ResearchのFindingから取得
      const currentSourceIds = testCase.currentResearchContext.findings.flatMap(
        (finding) => finding.sources.map((source) => source.id),
      );

      // Retrieved FINDINGから取得
      const retrievedSourceIds =
        testCase.workspaceRetrievalContext.results.flatMap((result) =>
          result.type === "FINDING"
            ? result.sources.map((source) => source.id)
            : [],
        );

      // 結合と重複排除
      const derivedSourceIds = [
        ...new Set([...currentSourceIds, ...retrievedSourceIds]),
      ].sort();

      // 期待値との比較
      expect(derivedSourceIds).toEqual([...testCase.allowedSourceIds].sort());
    },
  );

  it("excludes unlinked research sources", () => {
    const contradiction = dataset.cases.find(
      (item) => item.caseId === "ai-chat-02-contradiction",
    );

    if (!contradiction) {
      throw new Error("Contradiction case not found");
    }

    // FindingにリンクされているSource IDを収集
    const linkedSourceIds = new Set([
      ...contradiction.currentResearchContext.findings.flatMap((finding) =>
        finding.sources.map((source) => source.id),
      ),
      ...contradiction.workspaceRetrievalContext.results.flatMap((result) =>
        result.type === "FINDING"
          ? result.sources.map((source) => source.id)
          : [],
      ),
    ]);

    // Researchに登録されているが、
    // FindingにはリンクされていないSourceを抽出
    const unlinkedSources = contradiction.currentResearchContext.sources.filter(
      (source) => !linkedSourceIds.has(source.id),
    );

    // このケースに未リンクSourceが存在することを確認
    expect(unlinkedSources.length).toBeGreaterThan(0);

    // 未リンクSourceがallowlistに含まれないことを確認
    for (const source of unlinkedSources) {
      expect(contradiction.allowedSourceIds).not.toContain(source.id);
    }
  });
});
