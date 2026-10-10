import { describe, expect, it } from "vitest";

import dataset from "../../../evals/ai-chat/cases.json";

function getCase(caseId: string) {
  const testCase = dataset.cases.find((item) => item.caseId === caseId);
  if (!testCase) throw new Error(`Evaluation case not found: ${caseId}`);
  return testCase;
}

function expectNonEmptyString(value: unknown) {
  expect(value).toEqual(expect.stringMatching(/\S/));
}

function expectSourceRecord(source: { id: string; title: string; url: string }) {
  expectNonEmptyString(source.id);
  expectNonEmptyString(source.title);
  expectNonEmptyString(source.url);
  expect(["http:", "https:"]).toContain(new URL(source.url).protocol);
}

describe("AI Chat evaluation dataset", () => {
  it("identifies the versioned synthetic dataset and exactly six unique cases", () => {
    expect(dataset.schemaVersion).toBe("1.0");
    expect(dataset.datasetId).toBe("evidence-atlas-ai-chat-quality-six-cases");
    expect(dataset.fixtureType).toBe("synthetic");

    const caseIds = dataset.cases.map((testCase) => testCase.caseId);
    expect(caseIds).toHaveLength(6);
    expect(new Set(caseIds).size).toBe(caseIds.length);
    expect([...caseIds].sort()).toEqual([
      "ai-chat-01-agreement",
      "ai-chat-02-contradiction",
      "ai-chat-03-inference",
      "ai-chat-04-insufficient-evidence",
      "ai-chat-05-source-limitations",
      "ai-chat-06-simple-question",
    ]);
  });

  it.each(dataset.cases)(
    "requires a question, unique criteria, declared dimensions, and unique allowed IDs for $caseId",
    (testCase) => {
      expectNonEmptyString(testCase.userQuestion);
      expect(Array.isArray(testCase.expectedBehaviors)).toBe(true);
      expect(testCase.expectedBehaviors.length).toBeGreaterThan(0);
      const criterionIds = testCase.expectedBehaviors.map((item) => item.id);
      expect(new Set(criterionIds).size).toBe(criterionIds.length);
      for (const criterion of testCase.expectedBehaviors) {
        expectNonEmptyString(criterion.id);
        expectNonEmptyString(criterion.criterion);
        expect(dataset.evaluationProtocol.dimensions).toContain(criterion.dimension);
      }

      expect(Array.isArray(testCase.allowedSourceIds)).toBe(true);
      expect(new Set(testCase.allowedSourceIds).size).toBe(testCase.allowedSourceIds.length);
      testCase.allowedSourceIds.forEach(expectNonEmptyString);
    },
  );

  it.each(dataset.cases)(
    "preserves the current Research context contract for $caseId",
    (testCase) => {
      const { research, findings, sources } = testCase.currentResearchContext;
      expect(research).toEqual(expect.objectContaining({
        id: expect.any(String),
        workspaceId: expect.any(String),
        title: expect.any(String),
      }));
      expectNonEmptyString(research.id);
      expectNonEmptyString(research.workspaceId);
      expectNonEmptyString(research.title);
      expect(research.description === null || typeof research.description === "string").toBe(true);
      // A missing conclusion is not the same as an explicitly null conclusion.
      expect(research.conclusion === null || typeof research.conclusion === "string").toBe(true);
      expect(Array.isArray(findings)).toBe(true);
      expect(Array.isArray(sources)).toBe(true);
      expect(new Set(findings.map((finding) => finding.id)).size).toBe(findings.length);
      sources.forEach(expectSourceRecord);

      for (const finding of findings) {
        expectNonEmptyString(finding.id);
        expectNonEmptyString(finding.content);
        expect(Array.isArray(finding.sources)).toBe(true);
        for (const source of finding.sources) {
          expectSourceRecord(source);
          expect(sources).toContainEqual(source);
        }
      }
    },
  );

  it.each(dataset.cases)(
    "preserves retrieval metadata, Source eligibility, and limits for $caseId",
    (testCase) => {
      const { results } = testCase.workspaceRetrievalContext;
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(5);
      for (const result of results) {
        expect(["FINDING", "CONCLUSION", "RESEARCH"]).toContain(result.type);
        expectNonEmptyString(result.researchId);
        expectNonEmptyString(result.researchTitle);
        expectNonEmptyString(result.content);
        expect(Number.isFinite(result.distance)).toBe(true);
        expect(result.distance).toBeGreaterThanOrEqual(0);
        expect(result.distance).toBeLessThanOrEqual(0.35);
        expect(Array.isArray(result.sources)).toBe(true);
        if (result.type === "FINDING") {
          expectNonEmptyString(result.findingId);
          result.sources.forEach(expectSourceRecord);
        } else {
          expect(result.sources).toEqual([]);
        }
      }
    },
  );

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

describe("intentional AI Chat fixture boundaries", () => {
  it("keeps Case 02's satisfaction Source allowed but separate from defect evidence", () => {
    const testCase = getCase("ai-chat-02-contradiction");
    const unrelatedId = "syn-contradiction-source-unrelated";
    expect(testCase.allowedSourceIds).not.toContain("syn-contradiction-source-unlinked");
    expect(testCase.currentResearchContext.findings.find(
      (finding) => finding.id === "syn-contradiction-finding-unrelated",
    )?.sources.map((source) => source.id)).toEqual([unrelatedId]);
    expect(testCase.allowedSourceIds).toContain(unrelatedId);

    // Claim-level eligibility comes from the fixture's manual rubric, not validation.
    const rules = testCase.evaluationNotes.claimCitationRules;
    const trialA = rules.find((rule) => rule.evidenceRefs.includes("syn-contradiction-finding-a"));
    const trialB = rules.find((rule) => rule.evidenceRefs.includes("syn-contradiction-finding-b"));
    expect(trialA?.citableSourceIds).toEqual(["syn-contradiction-source-a"]);
    expect(trialB?.citableSourceIds).toEqual(["syn-contradiction-source-b"]);
    expect(rules.find((rule) => rule.evidenceRefs.includes(
      "syn-contradiction-finding-unrelated",
    ))?.citableSourceIds).toEqual([unrelatedId]);
  });

  it("keeps Case 03's Review unsourced and metadata retrieval noncitable", () => {
    const testCase = getCase("ai-chat-03-inference");
    const findings = testCase.currentResearchContext.findings;
    expect(findings.find((finding) => finding.id === "syn-inference-finding-draft")
      ?.sources.map((source) => source.id)).toEqual(["syn-inference-source-draft"]);
    expect(findings.find((finding) => finding.id === "syn-inference-finding-review")
      ?.sources).toEqual([]);
    expect(testCase.workspaceRetrievalContext.results.map((result) => result.type))
      .toEqual(["RESEARCH", "CONCLUSION"]);
    expect(testCase.workspaceRetrievalContext.results.every((result) => result.sources.length === 0))
      .toBe(true);
    expect(testCase.allowedSourceIds).toEqual(["syn-inference-source-draft"]);
  });

  it("keeps Case 04's allowlist empty despite an unlinked Research Source", () => {
    const testCase = getCase("ai-chat-04-insufficient-evidence");
    expect(testCase.currentResearchContext.sources.map((source) => source.id))
      .toContain("syn-insufficient-source-unlinked");
    expect(testCase.currentResearchContext.findings.every((finding) => finding.sources.length === 0))
      .toBe(true);
    expect(testCase.allowedSourceIds).toEqual([]);
  });

  it("keeps Case 05's repeated Survey, separate Pilot, and unsourced Availability", () => {
    const testCase = getCase("ai-chat-05-source-limitations");
    const { research, findings, sources } = testCase.currentResearchContext;
    const survey = findings.find((finding) => finding.id === "syn-limitations-finding-survey");
    const retrievedSurvey = testCase.workspaceRetrievalContext.results.find(
      (result) => result.type === "FINDING" && result.findingId === survey?.id,
    );
    expect(survey).toBeDefined();
    expect(retrievedSurvey).toEqual(expect.objectContaining({
      researchId: research.id,
      findingId: survey?.id,
      content: survey?.content,
      sources: survey?.sources,
    }));
    expect(findings.find((finding) => finding.id === "syn-limitations-finding-availability")
      ?.sources).toEqual([]);

    const pilot = testCase.workspaceRetrievalContext.results.find(
      (result) => result.type === "FINDING" && result.findingId === "syn-limitations-finding-pilot",
    );
    expect(pilot?.sources.map((source) => source.id)).toEqual(["syn-limitations-source-pilot"]);
    // Retrieved Sources need not be members of the current Research's Sources.
    expect(sources.map((source) => source.id)).not.toContain("syn-limitations-source-pilot");
    expect(testCase.allowedSourceIds).toEqual([
      "syn-limitations-source-survey",
      "syn-limitations-source-pilot",
    ]);
    expect(testCase.allowedSourceIds.filter((id) => id === "syn-limitations-source-survey"))
      .toHaveLength(1);
    expect(testCase.allowedSourceIds).not.toContain("syn-limitations-source-unlinked");
    expect(testCase.allowedSourceIds).not.toContain("syn-invented-audit");
    // Preserve the embedded fabricated citation as a negative example, not an instruction.
    expect(pilot?.content).toContain("[source:syn-invented-audit]");
  });

  it("accepts Case 06's explicit null conclusion", () => {
    expect(getCase("ai-chat-06-simple-question").currentResearchContext.research.conclusion)
      .toBeNull();
  });
});
