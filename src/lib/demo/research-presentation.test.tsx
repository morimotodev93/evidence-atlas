import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { curatedFixture } from "./curated-test-fixtures";
import { demoResearches } from "./curated-content";
import baseline from "./research-translation-baseline.json";
import { researchJa } from "./research-ja";
import { presentDemoResearch, presentDemoWorkspace } from "./research-presentation";
import { DemoResearchView, DemoWorkspaceView } from "@/components/demo/demo-pages";
import { buildDemoChatContext } from "./chat-context";
import { formatDate } from "@/lib/date";

const workspace = (items = [curatedFixture()]) => ({ id: "workspace", name: "Demo", description: null,
  organization: { id: "organization", name: "Demo" }, researches: items.map(({ research, tags }) => ({ ...research, tags })) });

it("keeps independent reviewed baselines aligned with every semantic seed key", () => {
  expect(baseline).toEqual(demoResearches.map(({ conversation: _conversation, ...entry }) => entry));
  expect(new Set(baseline.map((entry) => entry.key)).size).toBe(baseline.length);
  expect(new Set(baseline.map((entry) => JSON.stringify([entry.title, entry.description]))).size).toBe(baseline.length);
  for (const entry of baseline) {
    expect(new Set(entry.findings.map((finding) => finding.content)).size).toBe(entry.findings.length);
    expect(new Set(entry.findings.map((finding) => finding.key)).size).toBe(entry.findings.length);
  }
});

it.each(demoResearches.map((entry) => entry.key))("localizes every field of %s without changing identity, sources or canonical data", (key) => {
  const data = curatedFixture(key);
  const before = JSON.stringify(data);
  const ja = presentDemoResearch(data, "ja");
  expect(ja.research.id).toBe(data.research.id);
  expect(ja.research.title).not.toBe(data.research.title);
  expect(ja.research.description).not.toBe(data.research.description);
  expect(ja.research.conclusion).not.toBe(data.research.conclusion);
  expect(ja.sources).toBe(data.sources);
  expect(ja.findings.map(({ id }) => id)).toEqual(data.findings.map(({ id }) => id));
  ja.findings.forEach((finding, i) => {
    expect(finding.content).not.toBe(data.findings[i].content);
    expect(finding.sources).toBe(data.findings[i].sources);
    expect(finding.updatedAt).toBe(data.findings[i].updatedAt);
  });
  expect(ja.comments[0].content).not.toBe(data.comments[0].content);
  expect(ja.comments[0].id).toBe(data.comments[0].id);
  expect(JSON.stringify(data)).toBe(before);
  expect(presentDemoResearch(data, "en")).toBe(data);
  expect(presentDemoWorkspace(workspace([data]), "ja").researches[0].title).toBe(ja.research.title);
});

it("preserves measured populations, time metrics, task conditions and uncertainty", () => {
  const ja = presentDemoResearch(curatedFixture(), "ja");
  const github = ja.findings.find(({ id }) => id.endsWith("github-http-server"))!.content;
  for (const text of ["2022年", "95人", "JavaScript", "HTTPサーバー", "55%", "1時間11分", "2時間41分", "アンケート", "全般の生産性向上率を示すものではありません"]) expect(github).toContain(text);
  const metr = ja.findings.find(({ id }) => id.endsWith("metr-early-2025"))!.content;
  for (const text of ["2025年7月", "16人", "246件", "熟知", "2025年初頭", "所要時間が19%増加", "その条件下", "証拠ではありません"]) expect(metr).toContain(text);
  const hypotheses = ja.findings.find(({ id }) => id.endsWith("possible-explanations"))!.content;
  for (const text of ["可能性", "仮説", "確立された原因ではありません", "普遍的な効果を確立するものではありません"]) expect(hypotheses).toContain(text);
  expect(ja.research.conclusion).toContain("可能性");
});

it("matches reordered Findings and reseeded IDs by content and attribution", () => {
  const data = curatedFixture("developer-productivity", "reseeded");
  data.findings.reverse();
  const ja = presentDemoResearch(data, "ja");
  expect(ja.findings.find(({ id }) => id === "reseeded-metr-early-2025")!.content).toContain("所要時間が19%増加");
  expect(ja.findings.find(({ id }) => id === "reseeded-github-http-server")!.content).toContain("95人");
});

it("falls back for missing catalog entries and individual missing translations", () => {
  const data = curatedFixture();
  expect(presentDemoResearch(data, "ja", {})).toBe(data);
  const ja = presentDemoResearch(data, "ja", { "developer-productivity": { title: "題名" } });
  expect(ja.research.title).toBe("題名");
  expect(ja.research.description).toBe(data.research.description);
  expect(ja.research.conclusion).toBe(data.research.conclusion);
  expect(ja.findings).toEqual(data.findings);
  expect(ja.comments).toEqual(data.comments);
});

it("falls back on stale fields without hiding canonical edits", () => {
  const data = curatedFixture();
  data.research.conclusion = "Changed conclusion";
  data.findings[0].content += " Changed result.";
  data.comments[0].content += " Changed discussion.";
  const ja = presentDemoResearch(data, "ja");
  expect(ja.research.conclusion).toBe(data.research.conclusion);
  expect(ja.findings[0]).toBe(data.findings[0]);
  expect(ja.comments[0]).toBe(data.comments[0]);
  expect(ja.research.title).toBe(researchJa["developer-productivity"].title);
  data.research.description += " Changed identity.";
  expect(presentDemoResearch(data, "ja")).toBe(data);
  expect(presentDemoWorkspace(workspace([data]), "ja").researches[0].title).toBe(data.research.title);
});

it("rejects duplicate Research identities, duplicate child content and mismatched attribution", () => {
  const data = curatedFixture();
  const list = workspace([data, curatedFixture("developer-productivity", "duplicate")]);
  expect(presentDemoWorkspace(list, "ja").researches).toEqual(list.researches);
  data.findings.push({ ...data.findings[0], id: "duplicate" });
  data.comments.push({ ...data.comments[0], id: "duplicate" });
  const ja = presentDemoResearch(data, "ja");
  expect(ja.findings[0].content).toBe(data.findings[0].content);
  expect(ja.findings.at(-1)!.content).toBe(data.findings[0].content);
  expect(ja.comments).toEqual(data.comments);
  const mismatch = curatedFixture();
  mismatch.findings[0].sources = mismatch.findings[2].sources;
  expect(presentDemoResearch(mismatch, "ja").findings[0]).toBe(mismatch.findings[0]);
  mismatch.sources = [];
  expect(presentDemoResearch(mismatch, "ja")).toBe(mismatch);
  const wrongResearch = curatedFixture("code-quality");
  wrongResearch.findings = curatedFixture().findings;
  expect(presentDemoResearch(wrongResearch, "ja").findings).toEqual(wrongResearch.findings);
});

it("renders locale dates/tags and original citation links while Chat context stays English", () => {
  const data = curatedFixture();
  const context = buildDemoChatContext(data).text;
  const ja = renderToStaticMarkup(createElement(DemoResearchView, { data, locale: "ja", localized: true, chatEnabled: false }));
  expect(ja).toContain("開発者の生産性");
  expect(ja).toContain("生産性");
  expect(ja).toContain(formatDate(data.research.createdAt, "ja"));
  for (const source of data.sources) expect(ja).toContain(`href="${source.url}"`);
  expect(ja).toContain("href=\"/ja/demo\"");
  for (const locale of [undefined, "en"] as const) {
    const en = renderToStaticMarkup(createElement(DemoResearchView, { data, locale, chatEnabled: false }));
    expect(en).toContain(data.research.description);
    expect(en).toContain("Developer Productivity");
    expect(en).not.toContain("開発者の生産性");
  }
  const list = renderToStaticMarkup(createElement(DemoWorkspaceView, { workspace: workspace(), locale: "ja", localized: true }));
  expect(list).toContain("/ja/demo/research/demo-research");
  expect(list).toContain("開発者の生産性");
  expect(buildDemoChatContext(data).text).toBe(context);
  expect(context).toContain("55% faster");
  expect(context).not.toContain("所要時間が19%増加");
  expect(presentDemoResearch(data, "ja").tags.map(({ id }) => id)).toEqual(data.tags.map(({ id }) => id));
});
