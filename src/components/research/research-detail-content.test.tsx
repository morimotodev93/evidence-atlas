import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { research, source, finding } from "@/lib/demo/test-fixtures";
import { formatDate } from "@/lib/date";
import { ResearchDetailContent } from "./research-detail-content";

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
    expect(html).toContain(`<h3 class="font-medium">${storedSource.title}</h3>`);
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
