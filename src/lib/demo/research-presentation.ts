import baseline from "./research-translation-baseline.json";
import { researchJa } from "./research-ja";
import type { Locale } from "@/lib/i18n/locales";
import type { getDemoResearch, getDemoWorkspace } from "./read";

type Research = NonNullable<Awaited<ReturnType<typeof getDemoResearch>>>;
type Workspace = NonNullable<Awaited<ReturnType<typeof getDemoWorkspace>>>;
type Translation = { title?: string; description?: string; conclusion?: string;
  findings?: Record<string, string>; comment?: string };
export type ResearchCatalog = Readonly<Record<string, Translation | undefined>>;

const tagJa: Readonly<Record<string, string>> = {
  AI: "AI", Productivity: "生産性", "Code Quality": "コード品質",
  Security: "セキュリティ", "Developer Experience": "開発者体験", Adoption: "導入",
};

// Exact comparisons deliberately preserve punctuation, whitespace and case.
// A changed identity falls back as a whole; child fields are checked separately.
function matchResearch(research: { title: string; description: string | null }) {
  const matches = baseline.filter((entry) => entry.title === research.title && entry.description === research.description);
  return matches.length === 1 ? matches[0] : undefined;
}

function tags<T extends { id: string; name: string }>(items: T[]): T[] {
  return items.map((tag) => ({ ...tag, name: Object.hasOwn(tagJa, tag.name) ? tagJa[tag.name] : tag.name }));
}

function sameSources(actual: { title: string; url: string }[], expected: { title: string; url: string }[]) {
  const signature = (sources: typeof actual) => JSON.stringify(sources.map(({ title, url }) => JSON.stringify([title, url])).sort());
  return signature(actual) === signature(expected);
}

export function presentDemoWorkspace(data: Workspace, locale: Locale, catalog: ResearchCatalog = researchJa): Workspace {
  if (locale !== "ja") return data;
  return { ...data, researches: data.researches.map((research) => {
    const entry = matchResearch(research);
    const duplicates = data.researches.filter((other) => other.title === research.title && other.description === research.description);
    const ja = entry && duplicates.length === 1 ? catalog[entry.key] : undefined;
    return ja ? { ...research, title: ja.title ?? research.title, description: ja.description ?? research.description, tags: tags(research.tags) } : research;
  }) };
}

// Display only: call after the public read boundary, never in read/chat-context.
// Copy text-bearing objects; retain IDs, timestamps and source/link objects.
export function presentDemoResearch(data: Research, locale: Locale, catalog: ResearchCatalog = researchJa): Research {
  if (locale !== "ja") return data;
  const entry = matchResearch(data.research);
  if (!entry || !sameSources(data.sources, entry.sources)) return data;
  const ja = catalog[entry.key];
  if (!ja) return data;
  return {
    ...data,
    research: { ...data.research, title: ja.title ?? data.research.title,
      description: ja.description ?? data.research.description,
      conclusion: data.research.conclusion === entry.conclusion ? ja.conclusion ?? data.research.conclusion : data.research.conclusion },
    tags: tags(data.tags),
    findings: data.findings.map((finding) => {
      const matches = entry.findings.filter((original) => original.content === finding.content);
      if (matches.length !== 1 || data.findings.filter((other) => other.content === finding.content).length !== 1) return finding;
      const original = matches[0];
      const expectedSources = original.sourceKeys.map((key) => entry.sources.find((source) => source.key === key)!);
      if (!sameSources(finding.sources.map(({ source }) => source), expectedSources)) return finding;
      return { ...finding, content: ja.findings?.[original.key] ?? finding.content };
    }),
    comments: data.comments.map((comment) => comment.content === entry.comment &&
      data.comments.filter((other) => other.content === comment.content).length === 1
      ? { ...comment, content: ja.comment ?? comment.content } : comment),
  };
}
