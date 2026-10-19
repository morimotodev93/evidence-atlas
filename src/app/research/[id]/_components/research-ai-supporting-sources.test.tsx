import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResearchAiSupportingSources } from "./research-ai-supporting-sources";

afterEach(() => vi.unstubAllGlobals());

describe("AI supporting Source render boundary (live and restored sources)", () => {
  it.each([
    ["https://example.com/path", "https://example.com/path"],
    ["HTTP://EXAMPLE.COM", "http://example.com/"],
    ["hTtPs://EXAMPLE.COM:443/Path", "https://example.com/Path"],
    ["http://localhost:3000", "http://localhost:3000/"],
  ])("renders an external link for %s", (url, expected) => {
    const html = renderToStaticMarkup(
      <ResearchAiSupportingSources sources={[{ id: "cited-source", title: "Cited evidence", url }]} />,
    );
    expect(html).toContain(`href="${expected}"`);
    expect(html).toContain('target="_blank" rel="noreferrer"');
    expect(html).toContain("Cited evidence</a>");
  });

  it.each([
    "javascript:alert(1)", "data:text/html,test", "vbscript:msgbox(1)",
    "file:///tmp/source", "blob:https://example.com/id", "ftp://example.com/file",
    "mailto:person@example.com", "/relative", "//example.com", "", "   ", "https://",
  ])("renders restored API Source %j as text alongside allowed evidence without fetching", (url) => {
    const fetchMock = vi.fn(() => { throw new Error("Unexpected network request"); });
    vi.stubGlobal("fetch", fetchMock);
    // Same resolved Source shape as ConversationDetail.sources. This is the
    // production renderer used after both live and restored citation resolution.
    const html = renderToStaticMarkup(
      <ResearchAiSupportingSources sources={[
        { id: "restored-source", title: "Restored evidence", url },
        { id: "safe-source", title: "Safe evidence", url: "https://example.com/evidence" },
      ]} />,
    );
    expect(html).toContain("Supporting sources");
    expect(html).toContain("Restored evidence</span>");
    expect(html.match(/<a\b/g)).toHaveLength(1);
    expect(html).toContain('href="https://example.com/evidence"');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
