import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { research, source, finding, comment, researchTag } from "@/lib/demo/test-fixtures";
import { formatDate } from "@/lib/date";
import { ResearchHeader, ResearchDetailContent } from "./research-detail-content";

function renderSource(url: string) {
  const storedSource = { ...source, title: "Stored source title", url };
  const sourceControl = vi.fn(() => <button>Edit / Delete Source</button>);
  const associationControl = vi.fn(() => <button>Remove association</button>);
  const html = renderToStaticMarkup(
    <ResearchDetailContent
      research={research}
      sources={[storedSource]}
      findings={[{ ...finding, sources: [{ sourceId: storedSource.id, source: storedSource }] }]}
      comments={[]}
      controls={{ source: sourceControl, findingSource: associationControl }}
    />,
  );
  return { html, sourceControl, associationControl, storedSource };
}

describe("Research Source render boundary", () => {
  it.each([
    ["https://example.com/path", "https://example.com/path"],
    ["HTTP://EXAMPLE.COM", "http://example.com/"],
    ["hTtPs://EXAMPLE.COM:443/Path", "https://example.com/Path"],
    ["http://localhost:3000", "http://localhost:3000/"],
  ])("links both the Source card and Finding support for %s", (url, expected) => {
    const { html } = renderSource(url);
    expect(html.match(/<a\b/g)).toHaveLength(2);
    expect(html.match(/href="[^"]*"/g)).toEqual([`href="${expected}"`, `href="${expected}"`]);
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(html).toContain(url);
  });

  it.each([
    "javascript:alert(1)", "data:text/html,test", "vbscript:msgbox(1)",
    "file:///tmp/source", "blob:https://example.com/id", "ftp://example.com/file",
    "mailto:person@example.com", "/relative", "//example.com", "", "   ", "https://",
  ])("keeps cards, associations and authenticated controls without links for %j", (url) => {
    const { html, sourceControl, associationControl, storedSource } = renderSource(url);
    expect(html).not.toMatch(/<a\b|\bhref=/);
    expect(html.match(/Stored source title/g)).toHaveLength(2);
    expect(html).toContain(`<h3 class="text-base leading-6 font-medium">${storedSource.title}</h3>`);
    expect(html).toContain(url);
    expect(html).toContain(`Updated ${formatDate(source.updatedAt)}`);
    expect(html).toContain("1 sources");
    expect(html).toContain(finding.content);
    expect(html).toContain("Supporting sources");
    expect(html).toContain("Edit / Delete Source");
    expect(html).toContain("Remove association");
    expect(sourceControl).toHaveBeenCalledWith(storedSource);
    expect(associationControl).toHaveBeenCalledWith(finding.id, storedSource.id);
  });
});

describe("Research detail presentation", () => {
  it("keeps the title, description, readable status, tags, dates and optional header controls", () => {
    const tagControl = vi.fn(() => <button>Detach tag</button>);
    const html = renderToStaticMarkup(<ResearchHeader research={research} tags={[researchTag.tag]} controls={{
      edit: <a href={`/research/${research.id}/edit`}>Edit</a>,
      status: <button>Change status</button>, addTag: <button>Add tag</button>, tag: tagControl,
    }} />);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    for (const value of [research.title, research.description, "Completed", researchTag.tag.name,
      `Created ${formatDate(research.createdAt)}`, `Updated ${formatDate(research.updatedAt)}`,
      "Edit", "Change status", "Add tag", "Detach tag"]) expect(html).toContain(value);
    expect(tagControl).toHaveBeenCalledExactlyOnceWith(researchTag.tag.id);
  });

  it("renders four ordered sections and concise read-only empty states without editing invitations", () => {
    const html = renderToStaticMarkup(<ResearchDetailContent research={{ ...research, conclusion: null }} sources={[]} findings={[]} comments={[]} />);
    expect([...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((match) => match[1]))
      .toEqual(["Conclusion", "Sources", "Findings", "Discussion"]);
    for (const value of ["No conclusion yet.", "No sources yet.", "No findings yet.", "No discussion yet.",
      "0 sources", "0 findings", "0 comments"]) expect(html).toContain(value);
    expect(html).not.toMatch(/<button|<form|Add |Edit/);
  });

  it("keeps the existing Add and Conclusion edit controls available with empty content", () => {
    const html = renderToStaticMarkup(<ResearchDetailContent research={{ ...research, conclusion: null }} sources={[]} findings={[]} comments={[]} controls={{
      conclusion: <button>Edit conclusion</button>, addSource: <button>Add source</button>,
      addFinding: <button>Add finding</button>, addComment: <button>Add comment</button>,
    }} />);
    for (const label of ["Edit conclusion", "Add source", "Add finding", "Add comment"])
      expect(html).toContain(`>${label}</button>`);
    expect(html.match(/<button/g)).toHaveLength(4);
  });

  it("preserves long Japanese and unbroken English text, line breaks, and a full long URL", () => {
    const longText = `${"長い研究本文".repeat(50)}\n${"UnbrokenEnglishText".repeat(50)}`;
    const url = `https://example.com/${"long-path".repeat(150)}`;
    const longSource = { ...source, title: longText, url };
    const header = renderToStaticMarkup(<ResearchHeader research={{ ...research, title: longText, description: longText }} tags={[{ id: "long-tag", name: longText }]} />);
    const html = renderToStaticMarkup(<ResearchDetailContent research={{ ...research, conclusion: longText }} sources={[longSource]} findings={[{
      ...finding, content: longText, sources: [{ sourceId: source.id, source: longSource }],
    }]} comments={[{ ...comment, content: longText, authorName: "Research author" }]} />);
    expect(header.split(longText)).toHaveLength(4);
    expect(html.split(longText)).toHaveLength(6);
    expect(html).toContain(`href="${url}"`);
    expect(html).toContain(`>${url}</p>`);
    expect(html).toContain("Research author");
    expect(header).toContain("[overflow-wrap:anywhere]");
    expect(html).toContain("[overflow-wrap:anywhere]");
    expect(html).not.toMatch(/\btruncate\b|line-clamp/);
    expect(header + html).not.toMatch(/<button|<form/);
  });

  it("keeps Source and association controls outside evidence links with visible focus styling", () => {
    const { html } = renderSource(source.url);
    const links = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map((match) => match[0]);
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).not.toMatch(/<button|<form/);
      expect(link).toContain("focus-visible:outline-ring");
    }
    expect(html.indexOf("Edit / Delete Source")).toBeGreaterThan(html.indexOf("</a>"));
  });

  it("offers only unattached Sources, and omits association UI when none are available", () => {
    const available = { ...source, id: "available-source", title: "Available evidence" };
    const manage = vi.fn(() => <button>Manage sources</button>);
    const props = { research, sources: [source, available], findings: [finding], comments: [], controls: { findingSources: manage } };
    renderToStaticMarkup(<ResearchDetailContent {...props} />);
    expect(manage).toHaveBeenCalledExactlyOnceWith(finding.id, [{ id: available.id, title: available.title }]);
    manage.mockClear();
    const html = renderToStaticMarkup(<ResearchDetailContent {...props} sources={[source]} />);
    expect(manage).not.toHaveBeenCalled();
    expect(html).not.toContain("Manage sources");
    const unsupported = renderToStaticMarkup(<ResearchDetailContent {...props} findings={[{ ...finding, sources: [] }]} />);
    expect(unsupported).not.toContain("Supporting sources");
  });
});
