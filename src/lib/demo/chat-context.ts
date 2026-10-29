import "server-only";

import type { getDemoResearch } from "./read";

export type DemoPublicResearch = NonNullable<Awaited<ReturnType<typeof getDemoResearch>>>;
export const DEMO_CONTEXT_LIMITS = Object.freeze({
  findings: 10, sources: 10, title: 200, description: 1500, conclusion: 2000,
  finding: 800, sourceTitle: 160, total: 12000,
});
type SupportingSource = { id: string; title: string; url: string };
export type DemoChatContext = ReturnType<typeof buildDemoChatContext>;

// This is a projection of an ALREADY public-scoped read, never an authorization API.
export function buildDemoChatContext(data: DemoPublicResearch) {
  const limits = DEMO_CONTEXT_LIMITS;
  let truncated = false;
  const clip = (text: string | null, max: number) => {
    const points: string[] = [];
    for (const point of text ?? "") {
      if (points.length === max) { truncated = true; break; }
      points.push(point);
    }
    return points.join("");
  };
  const content = {
    title: clip(data.research.title, limits.title),
    description: clip(data.research.description, limits.description),
    conclusion: clip(data.research.conclusion, limits.conclusion),
    sources: [] as { id: string; title: string }[],
    findings: [] as { content: string; sourceIds: string[] }[],
    truncated: false,
  };
  const allowedSources = new Map<string, SupportingSource>();
  // Measure the actual serialized prompt, including JSON escaping and metadata.
  const fits = () => Array.from(JSON.stringify({ ...content, truncated: false })).length <= limits.total;
  for (const source of data.sources.slice(0, limits.sources)) {
    let url: URL;
    try { url = new URL(source.url); } catch { truncated = true; continue; }
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(source.id) || source.url.length > 2048
      || !["http:", "https:"].includes(url.protocol) || url.username || url.password
      || allowedSources.has(source.id)) { truncated = true; continue; }
    const title = clip(source.title, limits.sourceTitle);
    content.sources.push({ id: source.id, title });
    if (!fits()) { content.sources.pop(); truncated = true; continue; }
    allowedSources.set(source.id, { id: source.id, title, url: source.url });
  }
  if (data.sources.length > limits.sources || data.findings.length > limits.findings) truncated = true;
  for (const finding of data.findings.slice(0, limits.findings)) {
    // No Finding/Research/Workspace IDs, Comments, tags or arbitrary spread fields.
    const sourceIds = [...allowedSources.keys()].filter((id) => finding.sources.some((link) => link.sourceId === id));
    content.findings.push({ content: clip(finding.content, limits.finding), sourceIds });
    if (!fits()) { content.findings.pop(); truncated = true; }
  }
  // Worst-case escaping can overflow even the header fields. Trim fields until
  // serialized JSON fits; never slice serialized JSON or split surrogate pairs.
  for (const key of ["description", "conclusion", "title"] as const) {
    while (!fits() && content[key].length) {
      content[key] = Array.from(content[key]).slice(0, -100).join("");
      truncated = true;
    }
  }
  content.truncated = truncated;
  const hasEvidence = Boolean(content.description.trim() || content.conclusion.trim()
    || content.findings.some((finding) => finding.content.trim()));
  return { text: JSON.stringify(content), truncated, allowedSources, hasEvidence };
}
