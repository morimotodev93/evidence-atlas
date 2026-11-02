// Offline fixtures shared by focused unit and isolated browser tests.
import "temporal-polyfill/full/global";
import { demoResearches } from "./curated-content";

export function curatedFixture(key = "developer-productivity", prefix = "demo") {
  const entry = demoResearches.find((research) => research.key === key)!;
  const date = Temporal.Instant.from("2026-10-08T00:00:00Z");
  const research = { id: `${prefix}-research`, title: entry.title, description: entry.description,
    conclusion: entry.conclusion, status: "COMPLETED" as const, createdAt: date, updatedAt: date };
  const sources = entry.sources.map((source) => ({ id: `${prefix}-${source.key}`, title: source.title, url: source.url, updatedAt: date }));
  return { research, sources,
    findings: entry.findings.map((finding) => ({ id: `${prefix}-${finding.key}`, content: finding.content,
      displayStyle: "TEXT" as const, updatedAt: date, sources: finding.sourceKeys.map((key) => {
        const source = sources.find((source) => source.id === `${prefix}-${key}`)!;
        return { sourceId: source.id, source };
      }) })),
    comments: [{ id: `${prefix}-comment`, content: entry.comment, authorName: "Evidence Atlas Demo", createdAt: date, updatedAt: date }],
    tags: entry.tags.map((name) => ({ id: `${prefix}-${name}`, name })),
  };
}
