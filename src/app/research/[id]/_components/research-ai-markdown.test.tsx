import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseSourceCitations } from "@/lib/ai/source-citations";
import { ResearchAiMarkdown } from "./research-ai-markdown";
import { ResearchAiSupportingSources } from "./research-ai-supporting-sources";

function render(content: string) {
  return renderToStaticMarkup(<ResearchAiMarkdown>{content}</ResearchAiMarkdown>);
}

afterEach(() => vi.unstubAllGlobals());

// These are server-rendered HTML checks, not browser layout or network tests.
describe("Research AI Markdown presentation boundary", () => {
  it("renders paragraphs, line breaks, emphasis, lists, headings and code", () => {
    const html = render([
      "# Heading", "", "Paragraph with **bold** and *italic*.\nSecond line.  \nHard break.", "",
      "- First\n- Second\n  - Nested", "", "1. One\n2. Two", "",
      "Inline `const x = 1`.", "", "```ts\nconst x = '<value>';\n```",
    ].join("\n"));
    for (const element of ["<h1>Heading</h1>", "<strong>bold</strong>", "<em>italic</em>",
      "<ul>", "<ol>", "<li>First</li>", "<code>const x = 1</code>",
      '<pre><code class="language-ts">', "<br/>", "Second line.", "&lt;value&gt;"]) {
      expect(html).toContain(element);
    }
    expect(html).toContain("whitespace-pre-wrap");
  });

  it("never turns raw HTML into elements or image preload hints", () => {
    const html = render([
      '<script>alert("unsafe")</script>',
      '<img src="https://example.invalid/raw.png" onerror="alert(1)">',
      '<iframe src="https://example.invalid/frame"></iframe>',
      '<a href="javascript:alert(1)">raw label</a>',
      "", "**Safe text**", "", "`<img src=x onerror=alert(1)>`",
    ].join("\n"));
    expect(html).not.toMatch(/<(script|img|iframe|a|link)\b/i);
    expect(html).not.toContain('onerror="');
    expect(html).toContain("<strong>Safe text</strong>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it.each([
    "https://example.invalid/claim", "javascript:alert%281%29", "data:text/html,unsafe",
    "vbscript:unsafe", "file:///private", "//example.invalid", "/research/forged",
    "mailto:person@example.invalid", "#source-id",
  ])("renders generated link %j as noninteractive text", (url) => {
    const html = render(`[Unverified claim](${url})`);
    expect(html).toContain("Unverified claim");
    expect(html).not.toMatch(/<a\b|href=|src=/i);
  });

  it("drops Markdown images, including reference images, and flattens reference links and autolinks", () => {
    const fetchMock = vi.fn(() => { throw new Error("Unexpected network request"); });
    vi.stubGlobal("fetch", fetchMock);
    const html = render([
      "![Tracking](https://example.invalid/image.png)", "![Reference][picture]", "",
      "[picture]: https://example.invalid/reference.png", "",
      "[Claim][link] and <https://example.invalid/autolink> and https://example.invalid/plain", "",
      "[link]: https://example.invalid/claim",
    ].join("\n"));
    expect(html).not.toMatch(/<(img|a|link)\b|href=|src=/i);
    expect(html).not.toContain("Tracking");
    expect(html).not.toContain("reference.png");
    expect(html).toContain("Claim");
    expect(html).toContain("https://example.invalid/autolink");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps citation parsing separate from generated links without modifying the original content", () => {
    const content = "**Evidence** [source:stored-id] [Forged link](https://example.invalid/forged) [source:unknown]";
    const parsed = parseSourceCitations(content);
    expect(parsed.sourceIds).toEqual(["stored-id", "unknown"]);
    const source = { id: "stored-id", title: "Stored evidence", url: "https://example.invalid/stored" };
    const html = renderToStaticMarkup(<>
      <ResearchAiMarkdown>{parsed.text}</ResearchAiMarkdown>
      <ResearchAiSupportingSources sources={[source]} />
    </>);
    expect(html).toContain("<strong>Evidence</strong>");
    expect(html).not.toContain("[source:");
    expect(html.match(/<a\b/g)).toHaveLength(1);
    expect(html).toContain('href="https://example.invalid/stored"');
    expect(html).not.toContain('href="https://example.invalid/forged"');
    expect(content).toContain("[source:stored-id]");
  });

  it("safely renders every partial prefix of a synthetic streaming answer", () => {
    const answer = "## Summary\n**Bold** and *italic*\n\n- List\n\n```js\nconst x = '<script>';\n```\n[link](javascript:alert%281%29)\n![image](https://example.invalid/pixel)\n[source:pending]";
    for (let end = 0; end <= answer.length; end++) {
      const html = render(parseSourceCitations(answer.slice(0, end)).text);
      expect(html).not.toMatch(/<(script|img|a|link)\b|href=|src=/i);
    }
  });

  it("preserves long words and code with wrapping styles rather than truncating content", () => {
    const word = "unbroken".repeat(150);
    const html = render(`${word}\n\n\`\`\`\n${word}\n\`\`\``);
    expect(html.split(word)).toHaveLength(3);
    expect(html).toContain("[overflow-wrap:anywhere]");
    expect(html).toContain("[&amp;_pre]:whitespace-pre-wrap");
    expect(html).toContain("[&amp;_pre]:max-w-full");
  });
});
