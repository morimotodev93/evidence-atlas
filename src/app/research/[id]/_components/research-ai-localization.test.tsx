import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { ResearchAiPanel } from "./research-ai-panel";
import { ResearchAiDesktopLayout } from "./research-ai-desktop-layout";
import { ResearchAiMobileDialog } from "./research-ai-mobile-dialog";
import { ResearchAiConversationsDialog } from "./research-ai-conversations-dialog";

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState<T>(initial: T | (() => T)) {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === "function" ? (initial as () => T)() : initial;
    return [hooks.slots[index], (next: T) => { hooks.slots[index] = next; }];
  },
  useRef<T>(initial: T) {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useId: () => "stable-ai-panel-id",
  useEffect: () => {},
}));
vi.mock("./research-ai-panel", () => ({ ResearchAiPanel: "ai-panel" }));

// Same production-handler/hook-double approach as the existing panel tests.
// Inspect real DialogContent's Popup/Close tree, without mounting a browser Portal.
type Node = ReactElement<Record<string, unknown> & { children?: ReactNode }>;
function nodes(node: ReactNode): Node[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  return isValidElement<Node["props"]>(node) ? [node, ...nodes(node.props.children)] : [];
}
function find(tree: ReactNode, type: unknown) { return nodes(tree).find((node) => node.type === type)!; }
function text(tree: ReactNode, value: string) { return nodes(tree).some((node) => node.props.children === value); }
function render<T>(view: () => T): T { hooks.cursor = 0; return view(); }
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
}
function checkPopup(tree: ReactNode, language: "en" | "ja") {
  const content = find(tree, DialogContent);
  expect(content.props.locale).toBe(language);
  const popup = DialogContent(content.props).props.children[1];
  expect(popup.props.lang).toBe(language);
  expect(nodes(popup.props.children).find((node) => node.type === "span" && node.props.className === "sr-only")?.props)
    .toMatchObject({ lang: language, children: language === "ja" ? "閉じる" : "Close" });
  return content;
}
const sources = [{ id: "original-source", title: "Original Paper / 原文", url: "HTTPS://Example.COM/Original#Citation" }];
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  hooks.slots = [];
  hooks.cursor = 0;
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => { throw new Error("Unexpected offline fetch"); });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("AI wrapper locale and Portal contracts", () => {
  it.each([undefined, "en", "ja", "invalid"])("passes locale %s through desktop without remounting its panel", (value) => {
    let locale = value as Locale | undefined;
    const language = value === "ja" ? "ja" : "en";
    const children = <p>Original Research content</p>;
    const view = () => render(() => ResearchAiDesktopLayout({ researchId: "research-original", sources, children, locale }));
    const tree = view();
    const trigger = find(tree, Button);
    expect(trigger.props).toMatchObject({ children: value === "ja" ? "AIに質問" : "Ask AI", "aria-expanded": false });
    const aside = find(tree, "aside");
    expect(aside.props).toMatchObject({ lang: language, hidden: true, inert: true, "aria-label": value === "ja" ? "AIアシスタント" : "AI Assistant" });
    const panel = find(tree, ResearchAiPanel);
    expect(panel.key).toBeNull();
    expect(panel.props).toMatchObject({ researchId: "research-original", locale: language, active: false });
    expect(panel.props.sources).toBe(sources);
    expect(nodes(tree)).toContain(children);
    expect(trigger.props["aria-controls"]).toBe(aside.props.id);
    (trigger.props.onClick as () => void)();
    expect(find(view(), ResearchAiPanel).props.active).toBe(true);
    locale = language === "ja" ? "en" : "ja";
    const updated = view();
    expect(find(updated, ResearchAiPanel).props.active).toBe(true);
    expect(find(updated, ResearchAiPanel).key).toBe(panel.key);
    expect(find(updated, "aside").props.id).toBe(aside.props.id);
    (find(updated, ResearchAiPanel).props.onClose as () => void)();
    expect(find(view(), "aside").props).toMatchObject({ hidden: true, inert: true });
    expect(find(view(), ResearchAiPanel).props.sources).toBe(sources);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, "en", "ja", "invalid"])("passes locale %s to the mobile panel and real Popup/Close", (value) => {
    const tree = render(() => ResearchAiMobileDialog({ researchId: "research-original", sources, locale: value as Locale }));
    const language = value === "ja" ? "ja" : "en";
    expect(tree.type).toBe(Dialog);
    expect(Object.keys(tree.props)).toEqual(["children"]); // Retain uncontrolled Dialog lifecycle.
    const trigger = find(tree, DialogTrigger).props.render as Node;
    expect(trigger.props).toMatchObject({ lang: language, children: value === "ja" ? "AIに質問" : "Ask AI" });
    expect(find(tree, DialogTitle).props.children).toBe(trigger.props.children);
    expect(find(tree, DialogDescription).props.children).toBe(value === "ja" ? "このResearchについて質問できます。" : "Ask questions about this research.");
    checkPopup(tree, language);
    const panel = find(tree, ResearchAiPanel);
    expect(panel.props).toMatchObject({ locale: language, researchId: "research-original", variant: "mobile" });
    expect(panel.props.sources).toBe(sources);
    expect(panel.key).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("History picker localization", () => {
  const select = vi.fn<(id: string) => Promise<boolean>>();
  let locale: Locale | undefined;
  function view() {
    return render(() => ResearchAiConversationsDialog({ researchId: "research-original", desktop: true, onSelectConversation: select, locale }));
  }
  function open() { (view().props.onOpenChange as (open: boolean) => void)(true); }
  async function flush() { for (let i = 0; i < 30; i++) await Promise.resolve(); }
  function rows() { return nodes(view()).filter((node) => node.type === Button && typeof node.props.onClick === "function"); }
  beforeEach(() => { locale = undefined; select.mockReset(); });

  it.each([undefined, "en", "ja", "invalid"])("localizes idle/loading/empty UI and Popup controls for %s", async (value) => {
    locale = value as Locale;
    const japanese = value === "ja";
    const tree = view();
    const trigger = find(tree, DialogTrigger).props.render as Node;
    expect(trigger.props.children).toBe(japanese ? "履歴" : "History");
    expect(find(tree, DialogTitle).props.children).toBe(japanese ? "会話を選択" : "Select Conversation");
    expect(find(tree, DialogDescription).props.children).toBe(japanese ? "以前の会話を選択して続けます。" : "Select a previous conversation to continue.");
    expect(text(tree, japanese ? "会話の履歴がここに表示されます。" : "Conversations will appear here.")).toBe(true);
    expect(checkPopup(tree, japanese ? "ja" : "en").props["data-desktop-ai-history"]).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
    const loading = deferred<Response>();
    fetchMock.mockReturnValueOnce(loading.promise);
    open();
    expect(text(view(), japanese ? "会話を読み込み中..." : "Loading conversations...")).toBe(true);
    loading.resolve(Response.json([]));
    await flush();
    expect(text(view(), japanese ? "会話はまだありません。" : "No conversations yet.")).toBe(true);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/research/research-original/chat/conversations");
  });

  it("falls back per missing Japanese history entry without changing Popup language", () => {
    const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
    const saved = partial["saasAi.selectConversation"];
    try {
      delete partial["saasAi.selectConversation"];
      locale = "ja";
      expect(find(view(), DialogTitle).props.children).toBe("Select Conversation");
      checkPopup(view(), "ja");
    } finally { partial["saasAi.selectConversation"] = saved; }
  });

  it.each(["en", "ja"] as const)("preserves previews/dates/IDs and selected lock across locale rerenders in %s", async (value) => {
    locale = value;
    const summaries = [
      { id: "original-conversation", preview: "New conversation", updatedAt: "2026-11-01T00:00:00Z" },
      { id: "other-conversation", preview: "原文 **prompt** [source:literal]", updatedAt: "2026-11-02T00:00:00Z" },
      { id: "empty-preview", preview: "", updatedAt: "2026-11-03T00:00:00Z" },
    ];
    const before = structuredClone(summaries);
    const date = vi.spyOn(Date.prototype, "toLocaleString").mockReturnValue("Original runtime date");
    fetchMock.mockResolvedValueOnce(Response.json(summaries));
    open();
    await flush();
    for (const summary of summaries) {
      expect(text(view(), summary.preview)).toBe(true);
      expect(rows().some((row) => row.key === summary.id)).toBe(true);
    }
    expect(text(view(), "Original runtime date")).toBe(true);
    expect(date.mock.calls.every((args) => args.length === 0)).toBe(true);
    const restoring = deferred<boolean>();
    select.mockReturnValueOnce(restoring.promise).mockResolvedValueOnce(true);
    const selecting = (rows()[0].props.onClick as () => Promise<void>)();
    expect(rows().every((row) => row.props.disabled)).toBe(true);
    expect(text(view(), value === "ja" ? "復元中..." : "Restoring...")).toBe(true);
    locale = value === "ja" ? "en" : "ja";
    expect(rows().every((row) => row.props.disabled)).toBe(true);
    expect(text(view(), locale === "ja" ? "復元中..." : "Restoring...")).toBe(true);
    await (rows()[1].props.onClick as () => Promise<void>)();
    expect(select).toHaveBeenCalledExactlyOnceWith("original-conversation");
    restoring.resolve(false);
    await selecting;
    expect(view().props.open).toBe(true);
    expect(rows().every((row) => !row.props.disabled)).toBe(true);
    await (rows()[0].props.onClick as () => Promise<void>)();
    expect(view().props.open).toBe(false);
    expect(select.mock.calls).toEqual([["original-conversation"], ["original-conversation"]]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(summaries).toEqual(before);
  });

  it.each(["http", "json", "network"])("keeps existing English list errors and no automatic retry for %s", async (failure) => {
    locale = "ja";
    if (failure === "network") fetchMock.mockRejectedValueOnce(new Error("Private diagnostic"));
    else fetchMock.mockResolvedValueOnce(failure === "json" ? new Response("invalid json") : new Response(null, { status: 500 }));
    open();
    await flush();
    expect(nodes(view()).find((node) => node.props.children === "Failed to load conversations.")?.props.lang).toBe("en");
    expect(text(view(), "Private diagnostic")).toBe(false);
    expect(view().props.open).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
