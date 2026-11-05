import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResearchAiPanel } from "./research-ai-panel";
import { ResearchAiMarkdown } from "./research-ai-markdown";
import { ResearchAiMobileDialog } from "./research-ai-mobile-dialog";
import type { Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { ja } from "@/lib/i18n/dictionaries/ja";

const hooks = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0,
  effects: [] as (() => void | (() => void))[],
}));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState<T>(initial: T | (() => T)) {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) {
      hooks.slots[index] = typeof initial === "function" ? (initial as () => T)() : initial;
    }
    return [hooks.slots[index], (next: T | ((previous: T) => T)) => {
      hooks.slots[index] = typeof next === "function"
        ? (next as (previous: T) => T)(hooks.slots[index] as T) : next;
    }];
  },
  useRef<T>(initial: T) {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useEffect(effect: () => void | (() => void)) {
    hooks.effects.push(effect);
  },
}));
vi.mock("@/components/ui/button", () => ({ Button: "button" }));
vi.mock("./research-ai-conversations-dialog", () => ({ ResearchAiConversationsDialog: "history-dialog" }));
vi.mock("./research-ai-supporting-sources", () => ({ ResearchAiSupportingSources: "supporting-sources" }));

// Execute the production handler closures and functional state updates with a
// small hook double. No React mount, DOM, browser, network or real SDK is used.
// This does not verify React scheduling, focus, paint or History dialog behavior.
type Element = ReactElement<Record<string, unknown> & { children?: ReactNode }>;
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Element["props"]>(node)) return [];
  return [node, ...elements(node.props.children)];
}
let panelActive = true;
let panelLocale: Locale | undefined;
function view(variant: "desktop" | "mobile" = "desktop", active = panelActive) {
  panelActive = active;
  hooks.cursor = 0;
  hooks.effects = [];
  return elements(ResearchAiPanel({ researchId: "research-id", sources: [], variant, active, locale: panelLocale }));
}
function button(label: string) {
  const element = view().find((node) => node.type === "button" && node.props.children === label);
  expect(element, `button ${label}`).toBeDefined();
  return element!;
}
function textarea() {
  return view().find((node) => node.type === "textarea")!;
}
function alerts() {
  return view().filter((node) => node.props.role === "alert").map((node) => node.props.children);
}
function statuses() {
  return view().filter((node) => node.props.role === "status").map((node) => node.props.children);
}
const refreshedStatus = "Showing saved history from the server. The result of this send could not be confirmed individually.";
const unconfirmedStatus = "The result of this send is unconfirmed. Open History to check saved messages.";
const checkingStatus = "Checking saved history...";
function selectConversation(id = "conversation-id") {
  const history = view().find((node) => typeof node.props.onSelectConversation === "function")!;
  return (history.props.onSelectConversation as (id: string) => Promise<boolean>)(id);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function messageTexts() {
  return view().filter((node) => node.type === ResearchAiMarkdown || (node.type === "p" &&
    String(node.props.className).includes("whitespace-pre-wrap"))).map((node) => node.props.children);
}
function typeMessage(text: string) {
  (textarea().props.onChange as (event: { target: { value: string } }) => void)({ target: { value: text } });
}
function click(label: string) {
  return (button(label).props.onClick as () => Promise<void>)();
}
const fetchMock = vi.fn<typeof fetch>();
async function startConversation() {
  fetchMock.mockResolvedValueOnce(Response.json({ id: "conversation-id", researchId: "research-id" }));
  await click(translate("saasAi.new", panelLocale));
}
function streamResponse() {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const cancel = vi.fn();
  const response = new Response(new ReadableStream<Uint8Array>({
    start(value) { controller = value; }, cancel,
  }));
  return {
    response, cancel,
    chunk(text: string) { controller.enqueue(new TextEncoder().encode(text)); },
    error(error: Error) { controller.error(error); },
    close() { controller.close(); },
  };
}
async function expectPartial(text: string) {
  // Bounded microtask drain; a failed assertion cannot hang on a pending read.
  for (let i = 0; i < 30 && !messageTexts().includes(text); i++) await Promise.resolve();
  expect(messageTexts()).toContain(text);
}
type SavedMessage = { id?: string; authorType: string; content: string };
type Source = { id: string; title: string; url: string };
function detail(messages: SavedMessage[] = [], sources: Source[] = [], id = "conversation-id") {
  return Response.json({ id, researchId: "research-id", messages: messages.map((message, index) => ({
    id: `saved-${index}`, conversationId: id, createdAt: "2026-10-22T00:00:00Z", ...message,
  })), sources });
}
const earlierTurns = [
  { id: "earlier-user", authorType: "USER", content: "Earlier question" },
  { id: "earlier-ai", authorType: "AI", content: "Earlier answer" },
];

beforeEach(() => {
  panelActive = true;
  panelLocale = undefined;
  hooks.slots = [];
  hooks.cursor = 0;
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => { throw new Error("Unexpected offline fetch"); });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("fixed AI panel localization", () => {
  it.each([undefined, "en", "ja", "invalid"])("renders fixed copy and forwards resolved locale %s without requests", (value) => {
    panelLocale = value as Locale | undefined;
    const nodes = view();
    const japanese = value === "ja";
    expect(nodes[0].props.lang).toBe(japanese ? "ja" : "en");
    for (const text of japanese
      ? ["AIアシスタント", "このResearchについて質問できます。", "会話はまだありません", "このResearchの根拠に基づく会話を始めましょう。", "新規", "送信"]
      : ["AI Assistant", "Ask questions about this research.", "No conversation yet", "Start a conversation grounded in this research.", "New", "Send"])
      expect(nodes.some((node) => node.props.children === text)).toBe(true);
    expect(textarea().props).toMatchObject({
      placeholder: japanese ? "このResearchについて質問してください..." : "Ask about this research...",
      "aria-label": japanese ? "AIへのメッセージ" : "Message to AI", disabled: true,
      value: "", autoComplete: "off", rows: 3,
    });
    expect(nodes.find((node) => node.props.role === "region")?.props["aria-label"])
      .toBe(japanese ? "会話のメッセージ" : "Conversation messages");
    expect(nodes.find((node) => node.type === "history-dialog")?.props.locale).toBe(japanese ? "ja" : "en");
    const region = nodes.find((node) => node.props.role === "region")!;
    (region.props.onScroll as (event: unknown) => void)({ currentTarget: { scrollHeight: 1000, scrollTop: 0, clientHeight: 200 } });
    expect(button(japanese ? "最新のメッセージ" : "Latest messages")).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back per missing Japanese panel entry", () => {
    const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
    const saved = partial["saasAi.placeholder"];
    try {
      delete partial["saasAi.placeholder"];
      panelLocale = "ja";
      expect(textarea().props.placeholder).toBe("Ask about this research...");
      expect(view()[0].props.lang).toBe("ja");
    } finally { partial["saasAi.placeholder"] = saved; }
  });

  it.each(["en", "ja"] as const)("preserves creation state and the explicit Close callback in %s", async (locale) => {
    panelLocale = locale;
    const creating = deferred<Response>();
    fetchMock.mockReturnValueOnce(creating.promise);
    const request = click(translate("saasAi.new", locale));
    expect(button(locale === "ja" ? "作成中..." : "Creating...").props.disabled).toBe(true);
    expect(textarea().props.disabled).toBe(true);
    creating.resolve(Response.json({ id: "conversation-id", researchId: "research-id" }));
    await request;
    expect(view().some((node) => node.props.children === (locale === "ja" ? "会話を開始しました" : "Conversation started"))).toBe(true);
    expect(view().some((node) => node.props.children === (locale === "ja" ? "このResearchについて質問してください。" : "Ask a question about this research."))).toBe(true);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/research/research-id/chat/conversations", { method: "POST" });
    const close = vi.fn();
    hooks.cursor = 0;
    const nodes = elements(ResearchAiPanel({ researchId: "research-id", sources: [], locale, onClose: close }));
    const control = nodes.find((node) => node.props["aria-label"] === (locale === "ja" ? "AIアシスタントを閉じる" : "Close AI Assistant"))!;
    expect(control.props.children).toBe(locale === "ja" ? "閉じる" : "Close");
    (control.props.onClick as () => void)();
    expect(close).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe.each(["en", "ja"] as const)("%s localized conversation contracts (synthetic hooks/streams)", (locale) => {
  const copy = locale === "ja" ? {
    streaming: "一時的な回答を生成しています。保存は確認されていません。",
    checking: "保存済みの履歴を確認しています...",
    refreshed: "サーバーの保存済み履歴を表示しています。今回の送信結果を個別に確認できたわけではありません。",
    unconfirmed: "今回の送信結果は未確認です。履歴を開いて保存済みメッセージを確認してください。",
    saved: "サーバーの保存済み履歴を表示しています。",
  } : {
    streaming: "Generating a temporary response. Saving is not confirmed.",
    checking: checkingStatus, refreshed: refreshedStatus, unconfirmed: unconfirmedStatus,
    saved: "Showing saved history from the server.",
  };

  beforeEach(() => { panelLocale = locale; });

  it("renders saved → streaming → checking → refreshed while retaining content, IDs and payloads", async () => {
    const source = { id: "original-source", title: "Original Paper / 原文", url: "HTTPS://Example.COM/Paper#Citation" };
    const user = "New conversation **原文** [source:user-marker]";
    const answer = "Original **AI response** / 原文";
    const saved = [
      { id: "original-user", authorType: "USER", content: user },
      { id: "original-ai", authorType: "AI", content: `${answer} [source:original-source]` },
    ];
    const before = structuredClone({ saved, source });
    fetchMock.mockResolvedValueOnce(detail(saved, [source]));
    expect(await selectConversation()).toBe(true);
    expect(statuses()).toEqual([copy.saved]);
    expect(messageTexts()).toEqual([user, answer]);
    expect(view().some((node) => node.key === "original-ai")).toBe(true);
    expect(view().find((node) => node.type === "supporting-sources")?.props).toMatchObject({ sources: [source], locale });
    const question = "  日本語 **question** [source:user-literal]\n ";
    typeMessage(question);
    const stream = streamResponse();
    const refresh = deferred<Response>();
    fetchMock.mockResolvedValueOnce(stream.response).mockReturnValueOnce(refresh.promise);
    const sending = click(translate("saasAi.send", locale));
    expect(statuses()).toEqual([copy.streaming]);
    expect(messageTexts().at(-1)).toBe(locale === "ja" ? "考え中..." : "Thinking...");
    expect(view().some((node) => node.props.children === (locale === "ja" ? "AI（一時表示）" : "AI (temporary)"))).toBe(true);
    expect(view().some((node) => node.props.children === (locale === "ja" ? "あなた" : "You"))).toBe(true);
    expect(textarea().props).toMatchObject({ disabled: true, value: "" });
    stream.chunk("Streamed **answer** [source:original-source]");
    await expectPartial("Streamed **answer**");
    stream.close();
    for (let i = 0; i < 30 && !statuses().includes(copy.checking); i++) await Promise.resolve();
    expect(statuses()).toEqual([copy.checking]);
    expect(messageTexts()).toEqual([user, answer]);
    expect(textarea().props.disabled).toBe(true);
    refresh.resolve(detail([...saved,
      { id: "server-user", authorType: "USER", content: question.trim() },
      { id: "server-ai", authorType: "AI", content: "Saved **answer** [source:original-source]" },
    ], [source]));
    await sending;
    expect(statuses()).toEqual([copy.refreshed]);
    expect(copy.refreshed).not.toBe(copy.saved);
    expect(messageTexts()).toEqual([user, answer, question.trim(), "Saved **answer**"]);
    expect(view().some((node) => node.key === "server-ai")).toBe(true);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock.mock.calls).toEqual([
      ["/research/research-id/chat/conversations/conversation-id"],
      ["/research/research-id/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: "conversation-id", message: question.trim() }) }],
      ["/research/research-id/chat/conversations/conversation-id"],
    ]);
    expect({ saved, source }).toEqual(before);
    expect(stream.cancel).not.toHaveBeenCalled();
  });

  it("preserves drafts and pending locks through locale/visibility rerenders and late chunks", async () => {
    await startConversation();
    const draft = "  Original draft / 原文 [source:literal]\n";
    typeMessage(draft);
    const originalPickerKey = view().find((node) => node.type === "history-dialog")!.key;
    panelLocale = locale === "ja" ? "en" : "ja";
    expect(textarea().props.value).toBe(draft);
    expect(view().find((node) => node.type === "history-dialog")!.key).toBe(originalPickerKey);
    panelLocale = locale;
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response);
    const sending = click(translate("saasAi.send", locale));
    stream.chunk("Temporary answer");
    await expectPartial("Temporary answer");
    view("desktop", false);
    panelLocale = locale === "ja" ? "en" : "ja";
    expect(messageTexts()).toEqual([draft.trim(), "Temporary answer"]);
    expect(statuses()).toEqual([translate("saasAi.statusStreaming", panelLocale)]);
    expect(textarea().props.disabled).toBe(true);
    panelLocale = locale;
    view("desktop", true);
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    expect(await selectConversation()).toBe(true);
    typeMessage("Next draft / 次の質問"); // Force input/handler to exercise the pending lock.
    await click(translate("saasAi.sending", locale));
    expect(fetchMock.mock.calls.filter(([url]) => url === "/research/research-id/chat")).toHaveLength(1);
    stream.chunk(" Late ignored chunk");
    stream.close();
    await sending;
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(statuses()).toEqual([copy.saved]);
    expect(textarea().props).toMatchObject({ disabled: false, value: "Next draft / 次の質問" });
    expect(fetchMock).toHaveBeenCalledTimes(3); // No old refresh or automatic retry.
    expect(stream.cancel).not.toHaveBeenCalled();
  });

  it.each(["Error", "AbortError"])("retains English errors and unconfirmed history after %s and a denied refresh", async (name) => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("Original question");
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response).mockResolvedValueOnce(new Response(null, { status: 401 }));
    const sending = click(translate("saasAi.send", locale));
    stream.chunk("Partial");
    await expectPartial("Partial");
    stream.error(new DOMException("Private synthetic failure", name));
    await sending;
    expect(statuses()).toEqual([copy.unconfirmed]);
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(alerts()).toEqual(["Failed to send message."]);
    expect(view().find((node) => node.props.role === "alert")?.props.lang).toBe("en");
    expect(textarea().props).toMatchObject({ disabled: false, value: "" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(stream.cancel).not.toHaveBeenCalled();
  });

  it("keeps the existing 503 notice and skips recovery/retry", async () => {
    await startConversation();
    typeMessage("Original question");
    fetchMock.mockResolvedValueOnce(Response.json({ error: "Private diagnostic" }, { status: 503 }));
    await click(translate("saasAi.send", locale));
    expect(alerts()).toEqual(["Chat is temporarily unavailable. Please contact the administrator or try again later."]);
    expect(statuses()).toEqual([copy.unconfirmed]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("Chat panel synthetic stream handlers (not mounted browser recovery)", () => {
  it("keeps selected history, draft and supporting Sources across active changes", async () => {
    const source = { id: "saved-source", title: "Stored Source", url: "https://example.invalid/stored" };
    fetchMock.mockResolvedValueOnce(detail([
      ...earlierTurns, { authorType: "AI", content: "Evidence [source:saved-source]" },
    ], [source]));
    await selectConversation();
    typeMessage("Unfinished question");
    const hidden = view("desktop", false);
    expect(hidden.find((node) => node.type === "textarea")?.props.value).toBe("Unfinished question");
    expect(hidden.find((node) => node.type === "supporting-sources")?.props.sources).toEqual([source]);
    view("desktop", true);
    expect(textarea().props.value).toBe("Unfinished question");
    expect(textarea().props.disabled).toBe(false);
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer", "Evidence"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("consumes an in-flight send while inactive and restores the same conversation after reopening", async () => {
    await startConversation();
    typeMessage("Question");
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response).mockResolvedValueOnce(detail(earlierTurns));
    const sending = click("Send");
    try {
      view("desktop", false);
      expect(button("Sending...").props.disabled).toBe(true);
      stream.chunk("Partial while hidden");
      await expectPartial("Partial while hidden");
      view("desktop", true);
      expect(textarea().props.disabled).toBe(true);
      expect(messageTexts()).toContain("Partial while hidden");
      view("desktop", false);
    } finally {
      stream.close();
      await sending;
    }
    view("desktop", true);
    expect(textarea().props.disabled).toBe(false);
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ conversationId: "conversation-id", message: "Question" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each(["desktop", "mobile"] as const)("opts only the %s composer out of browser restoration while preserving disabled state", async (variant) => {
    const composer = () => view(variant).find((node) => node.type === "textarea")!;
    const initial = renderToStaticMarkup(composer());
    expect(initial).toContain('autoComplete="off"');
    expect(initial).toContain('disabled=""');
    expect(initial).toContain('aria-label="Message to AI"');

    await startConversation();
    const ready = renderToStaticMarkup(composer());
    expect(ready).toContain('autoComplete="off"');
    expect(ready).not.toContain('disabled=""');
  });

  it.each(["Error", "AbortError"])("restores saved history and releases sending after read rejects with %s", async (name) => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("Question");
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response).mockResolvedValueOnce(detail([
      ...earlierTurns, { authorType: "USER", content: "Question" },
    ]));
    const sending = click("Send");
    expect(button("Sending...").props.disabled).toBe(true);
    expect(textarea().props.disabled).toBe(true);
    stream.chunk("Partial answer");
    await expectPartial("Partial answer");
    stream.error(new DOMException("Synthetic private stream failure", name));
    await sending;
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer", "Question"]);
    expect(alerts()).toEqual(["Failed to send message."]);
    expect(statuses()).toEqual([refreshedStatus]);
    expect(textarea().props.value).toBe(""); // Draft is not restored.
    expect(textarea().props.disabled).toBe(false);
    typeMessage("Question");
    expect(button("Send").props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4); // New + History + send + one recovery GET.
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2);
    const init = fetchMock.mock.calls[2][1];
    expect(init).not.toHaveProperty("signal");
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(view().some((node) => node.props.children === "Stop")).toBe(false);
  });

  it.each(["success", "failure"])("clears the prior sendError when a valid resend starts, then handles %s", async (outcome) => {
    await startConversation();
    typeMessage("Question");
    fetchMock.mockRejectedValueOnce(new Error("Synthetic fetch failure"));
    await click("Send");
    expect(alerts()).toEqual(["Failed to send message."]);
    typeMessage("Question");
    expect(alerts()).toEqual(["Failed to send message."]); // Editing alone keeps the error.
    const retry = streamResponse();
    fetchMock.mockResolvedValueOnce(retry.response);
    fetchMock.mockResolvedValueOnce(detail(outcome === "success" ? [
      { authorType: "USER", content: "Question" },
      { authorType: "AI", content: "Saved retry answer" },
    ] : []));
    const sending = click("Send");
    const alertsAtSendStart = alerts();
    expect(button("Sending...").props.disabled).toBe(true);
    expect(textarea().props.disabled).toBe(true);
    if (outcome === "success") {
      retry.chunk("Retry answer");
      retry.close();
    } else {
      retry.error(new Error("Synthetic retry failure"));
    }
    await sending;
    expect(alertsAtSendStart).toEqual([]);
    expect(messageTexts()).toEqual(outcome === "success" ? ["Question", "Saved retry answer"] : []);
    expect(textarea().props.disabled).toBe(false);
    expect(alerts()).toEqual(outcome === "success" ? [] : ["Failed to send message."]);
    const sends = fetchMock.mock.calls.filter(([url]) => url === "/research/research-id/chat");
    expect(sends).toHaveLength(2);
    expect(sends[0][1]?.body).toBe(sends[1][1]?.body);
    expect(JSON.parse(String(sends[1][1]?.body))).toEqual({ conversationId: "conversation-id", message: "Question" });
  });

  it("keeps the sendError when a blank submission is rejected by the handler guard", async () => {
    await startConversation();
    typeMessage("Question");
    fetchMock.mockRejectedValueOnce(new Error("Synthetic fetch failure"));
    await click("Send");
    expect(alerts()).toEqual(["Failed to send message."]);
    typeMessage(" \t\n ");
    expect(button("Send").props.disabled).toBe(true);
    // Call the handler directly to check the guard, without a browser click.
    await click("Send");
    expect(alerts()).toEqual(["Failed to send message."]);
    expect(messageTexts()).toEqual([]);
    expect(textarea().props.value).toBe(" \t\n ");
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2); // New + failed send only.
  });

  it.each(["Partial answer", ""])("replaces temporary body %j with saved history that has no AI", async (text) => {
    await startConversation();
    typeMessage("Question");
    const stream = streamResponse();
    // This fixture represents a non-stop/no-onFinish stream. No SDK claim.
    fetchMock.mockResolvedValueOnce(stream.response).mockResolvedValueOnce(detail([
      { authorType: "USER", content: "Question" },
    ]));
    const sending = click("Send");
    if (text) stream.chunk(text);
    stream.close();
    await sending;
    expect(messageTexts()).toEqual(["Question"]);
    expect(view().some((node) => node.key === "saved-0")).toBe(true);
    expect(statuses()).toEqual([refreshedStatus]);
    expect(alerts()).toEqual([]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe("/research/research-id/chat/conversations/conversation-id");
  });

  it.each(["http", "json", "network"])("keeps earlier turns and reports unconfirmed saving when history refresh fails: %s", async (failure) => {
    await startConversation();
    const oldSource = { id: "old-source", title: "Old source", url: "https://example.invalid/old" };
    const saved = [...earlierTurns, { authorType: "AI", content: "Sourced earlier answer [source:old-source]" }];
    fetchMock.mockResolvedValueOnce(detail(saved, [oldSource]));
    await selectConversation();
    typeMessage("Question");
    fetchMock.mockResolvedValueOnce(new Response("Raw answer"));
    if (failure === "network") fetchMock.mockRejectedValueOnce(new Error("Offline history failure"));
    else fetchMock.mockResolvedValueOnce(failure === "http"
      ? new Response(null, { status: 500 }) : new Response("invalid json"));
    await click("Send");
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer", "Sourced earlier answer"]);
    expect(alerts()).toEqual([]);
    expect(statuses()).toEqual([unconfirmedStatus]);
    expect(textarea().props.disabled).toBe(false);
    typeMessage("Next question");
    expect(button("Send").props.disabled).toBe(false);
    expect(view().find((node) => node.type === "supporting-sources")?.props.sources).toEqual([oldSource]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("preserves earlier turns on send failure, then restores the server USER through the History callback", async () => {
    await startConversation();
    const history = () => view().find((node) => typeof node.props.onSelectConversation === "function")!;
    fetchMock.mockResolvedValueOnce(detail([
      { authorType: "USER", content: "Earlier question" },
      { authorType: "AI", content: "Earlier answer" },
    ]));
    const restore = () => (history().props.onSelectConversation as (id: string) => Promise<boolean>)("conversation-id");
    expect(await restore()).toBe(true);
    typeMessage("Failed question");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await click("Send");
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(alerts()).toEqual(["Failed to send message."]);
    fetchMock.mockResolvedValueOnce(detail([
      { authorType: "USER", content: "Earlier question" },
      { authorType: "AI", content: "Earlier answer" },
      { authorType: "USER", content: "Failed question" },
    ]));
    expect(await restore()).toBe(true);
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer", "Failed question"]);
    expect(alerts()).toEqual([]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("marks streaming as temporary, checks history once at EOF, and replaces the entire history and sources by saved IDs", async () => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("Question");
    const stream = streamResponse();
    const refresh = deferred<Response>();
    fetchMock.mockResolvedValueOnce(stream.response).mockReturnValueOnce(refresh.promise);
    const sending = click("Send");
    stream.chunk("Raw answer [source:untrusted]");
    await expectPartial("Raw answer");
    expect(statuses()).toEqual(["Generating a temporary response. Saving is not confirmed."]);
    expect(view().some((node) => node.props.children === "AI (temporary)")).toBe(true);
    stream.close();
    for (let i = 0; i < 30 && !statuses().includes(checkingStatus); i++) await Promise.resolve();
    expect(statuses()).toEqual([checkingStatus]);
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(textarea().props.disabled).toBe(true);
    const source = { id: "saved-source", title: "Saved source", url: "https://example.invalid/source" };
    refresh.resolve(detail([
      { id: "changed-earlier", authorType: "AI", content: "Updated saved history" },
      { id: "server-user", authorType: "USER", content: "Server question" },
      { id: "server-ai", authorType: "AI", content: "Canonical answer [source:saved-source]" },
    ], [source]));
    await sending;
    expect(messageTexts()).toEqual(["Updated saved history", "Server question", "Canonical answer"]);
    expect(view().some((node) => node.key === "server-ai")).toBe(true);
    expect(view().find((node) => node.type === "supporting-sources")?.props.sources).toEqual([source]);
    expect(statuses()).toEqual([refreshedStatus]);
    expect(alerts()).toEqual([]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("keeps the communication error and earlier turns when read recovery GET is denied", async () => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("Question");
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response).mockResolvedValueOnce(new Response(null, { status: 401 }));
    const sending = click("Send");
    stream.chunk("Partial");
    await expectPartial("Partial");
    stream.error(new DOMException("Aborted", "AbortError"));
    await sending;
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(alerts()).toEqual(["Failed to send message."]);
    expect(statuses()).toEqual([unconfirmedStatus]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4); // No retry after denied GET.
  });

  it.each([401, 403, 404, 429, 500])("does not fetch recovery history after POST rejection %i", async (status) => {
    await startConversation();
    typeMessage("Question");
    fetchMock.mockResolvedValueOnce(new Response(null, { status }));
    await click("Send");
    expect(alerts()).toEqual(["Failed to send message."]);
    expect(messageTexts()).toEqual([]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a safe 503 message, preserves saved history, and never displays the response body", async () => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("Question");
    fetchMock.mockResolvedValueOnce(Response.json({ error: "Synthetic private service detail", code: "CHAT_RATE_LIMIT_NOT_CONFIGURED" }, { status: 503 }));
    await click("Send");
    expect(alerts()).toEqual(["Chat is temporarily unavailable. Please contact the administrator or try again later."]);
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(statuses()).toEqual([unconfirmedStatus]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3); // No automatic POST retry or recovery GET.
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    expect(await selectConversation()).toBe(true);
    expect(alerts()).toEqual([]);
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
  });

  it.each(["New", "History"].flatMap((navigation) =>
    ["chunk", "read error", "refresh", "refresh error"].map((late) => ({ navigation, late })),
  ))("ignores late $late from an old send after $navigation switches the conversation", async ({ navigation, late }) => {
    await startConversation();
    typeMessage("Old question");
    const stream = streamResponse();
    const refresh = deferred<Response>();
    fetchMock.mockResolvedValueOnce(stream.response);
    if (late.startsWith("refresh")) fetchMock.mockReturnValueOnce(refresh.promise);
    const sending = click("Send");
    stream.chunk("Old temporary answer");
    await expectPartial("Old temporary answer");
    if (late.startsWith("refresh")) {
      stream.close();
      for (let i = 0; i < 30 && fetchMock.mock.calls.length < 3; i++) await Promise.resolve();
      expect(fetchMock).toHaveBeenCalledTimes(3);
    }
    if (navigation === "New") {
      fetchMock.mockResolvedValueOnce(Response.json({ id: "new-conversation", researchId: "research-id" }));
      await click("New");
    } else {
      fetchMock.mockResolvedValueOnce(detail([{ id: "new-ai", authorType: "AI", content: "Selected answer" }], [], "new-conversation"));
      expect(await selectConversation("new-conversation")).toBe(true);
    }
    const expectedMessages = messageTexts();
    const expectedStatuses = statuses();
    // Keep a new send pending too: the old finally must not unlock its input.
    typeMessage("New question");
    const newStream = streamResponse();
    fetchMock.mockResolvedValueOnce(newStream.response).mockResolvedValueOnce(detail([
      { authorType: "USER", content: "New question" },
    ], [], "new-conversation"));
    const newSending = click("Send");
    const pendingMessages = messageTexts();
    if (late === "chunk") { stream.chunk(" Late old chunk"); stream.close(); }
    if (late === "read error") stream.error(new Error("Old read error"));
    if (late === "refresh") refresh.resolve(detail([{ authorType: "AI", content: "Old saved answer" }]));
    if (late === "refresh error") refresh.reject(new Error("Old refresh error"));
    await sending;
    expect(messageTexts()).toEqual(pendingMessages);
    expect(alerts()).toEqual([]);
    expect(textarea().props.disabled).toBe(true);
    expect(statuses()).toEqual(["Generating a temporary response. Saving is not confirmed."]);
    newStream.close();
    await newSending;
    expect(messageTexts()).toEqual(["New question"]);
    expect(expectedMessages).toEqual(navigation === "New" ? [] : ["Selected answer"]);
    expect(expectedStatuses).toEqual(navigation === "New" ? [] : ["Showing saved history from the server."]);
    const sends = fetchMock.mock.calls.filter(([url]) => url === "/research/research-id/chat");
    expect(sends).toHaveLength(2);
    expect(JSON.parse(String(sends[1][1]?.body)).conversationId).toBe("new-conversation");
    expect(fetchMock).toHaveBeenCalledTimes(late.startsWith("refresh") ? 6 : 5);
  });

  it("ignores a pending History selection after New has completed", async () => {
    await startConversation();
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const selecting = selectConversation();
    expect(textarea().props.disabled).toBe(true);
    fetchMock.mockResolvedValueOnce(Response.json({ id: "new-conversation", researchId: "research-id" }));
    await click("New");
    typeMessage("New draft");
    pending.resolve(detail([{ authorType: "AI", content: "Stale history" }]));
    expect(await selecting).toBe(false);
    expect(messageTexts()).toEqual([]);
    expect(textarea().props.value).toBe("New draft");
    expect(textarea().props.disabled).toBe(false);
    expect(alerts()).toEqual([]);
    expect(statuses()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("ignores a late New error after History has completed", async () => {
    await startConversation();
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const creating = click("New");
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    expect(await selectConversation()).toBe(true);
    pending.reject(new Error("Stale creation failure"));
    await creating;
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(textarea().props.disabled).toBe(false);
    expect(button("New").props.disabled).toBe(false);
    expect(alerts()).toEqual([]);
    expect(statuses()).toEqual(["Showing saved history from the server."]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retains the unconfirmed send state when navigation fails during streaming", async () => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("Question");
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response);
    const sending = click("Send");
    stream.chunk("Temporary answer");
    await expectPartial("Temporary answer");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await click("New");
    stream.chunk(" Late answer");
    stream.close();
    await sending;
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(statuses()).toEqual([unconfirmedStatus]);
    expect(alerts()).toEqual(["Failed to create conversation."]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it.each(["failed New", "same History"])("blocks another POST to a pending conversation after %s until its stream settles", async (navigation) => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("First question");
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response);
    const sending = click("Send");
    stream.chunk("Temporary answer");
    await expectPartial("Temporary answer"); // The next reader.read() stays pending.
    if (navigation === "failed New") {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
      await click("New");
    } else {
      fetchMock.mockResolvedValueOnce(detail(earlierTurns));
      expect(await selectConversation()).toBe(true);
    }
    const sends = () => fetchMock.mock.calls.filter(([url]) => url === "/research/research-id/chat");
    const expectedStatus = statuses();
    const expectedAlerts = alerts();
    try {
      // Force the handler even when UI controls are disabled, to test its guard.
      typeMessage("Next question");
      await click("Sending...");
      expect(sends()).toHaveLength(1);
      expect(button("Sending...").props.disabled).toBe(true);
      expect(textarea().props.disabled).toBe(true);
      expect(textarea().props.value).toBe("Next question");

      // A stale chunk is not EOF: dropping its display must not release the lock.
      stream.chunk("Late ignored answer");
      for (let i = 0; i < 30; i++) await Promise.resolve();
      await click("Sending...");
      expect(sends()).toHaveLength(1);
      expect(button("Sending...").props.disabled).toBe(true);
      expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    } finally {
      if (navigation === "failed New") stream.close();
      else stream.error(new DOMException("Old stream interrupted", "AbortError"));
      await sending;
    }
    expect(statuses()).toEqual(expectedStatus);
    expect(alerts()).toEqual(expectedAlerts);
    expect(button("Send").props.disabled).toBe(false);
    expect(textarea().props.disabled).toBe(false);
    expect(sends()).toHaveLength(1); // Completion does not trigger automatic POST.

    fetchMock.mockResolvedValueOnce(new Response("New answer")).mockResolvedValueOnce(detail([
      ...earlierTurns,
      { authorType: "USER", content: "Next question" },
      { authorType: "AI", content: "New saved answer" },
    ]));
    await click("Send");
    expect(sends()).toHaveLength(2);
    expect(JSON.parse(String(sends()[1][1]?.body))).toEqual({
      conversationId: "conversation-id", message: "Next question",
    });
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer", "Next question", "New saved answer"]);
    expect(textarea().props.disabled).toBe(false);
  });
});

describe("Chat presentation and synthetic inner scroll offsets (not browser layout)", () => {
  function scrollFixture() {
    let offset = 0;
    let selection: unknown = null;
    const selectedText = {};
    const viewport = {
      scrollHeight: 1000, clientHeight: 200,
      get scrollTop() { return offset; },
      set scrollTop(value: number) {
        offset = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight));
      },
      contains: (node: unknown) => node === selectedText,
    };
    let resize = () => {};
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal("window", { getSelection: () => selection });
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { resize = callback; }
      observe = observe;
      disconnect = disconnect;
    });
    const region = view().find((node) => node.props.role === "region")!;
    (region.props.ref as { current: unknown }).current = viewport;
    const content = elements(region.props.children)[0];
    (content.props.ref as { current: unknown }).current = {};
    const cleanup = hooks.effects[0]();
    return {
      viewport, observe, disconnect,
      resize: () => resize(),
      cleanup: () => { if (typeof cleanup === "function") cleanup(); },
      selectText: () => { selection = { isCollapsed: false, anchorNode: selectedText, focusNode: selectedText }; },
      update: () => { view(); hooks.effects[1](); },
      scroll: (top: number) => {
        viewport.scrollTop = top;
        const region = view().find((node) => node.props.role === "region")!;
        (region.props.onScroll as (event: unknown) => void)({ currentTarget: viewport });
      },
    };
  }

  it("uses a bounded desktop panel and a mobile panel that fills its dialog", () => {
    const desktop = view();
    expect(desktop[0].props.className).toContain("h-[calc(100dvh-6rem)]");
    expect(desktop[0].props.className).toContain("min-h-0");
    const region = desktop.find((node) => node.props.role === "region")!;
    expect(region.props.className).toContain("flex-1 overflow-y-auto");
    expect(region.props.className).toContain("min-h-0");
    expect(region.props.tabIndex).toBe(0);
    expect(region.props.className).toContain("focus-visible:ring");
    const composer = desktop.find((node) => elements(node.props.children).some((child) => child.type === "textarea") &&
      String(node.props.className).includes("border-t"))!;
    expect(composer.props.className).toContain("shrink-0");
    expect(desktop.some((node) => String(node.props.className).includes("shrink-0 border-b"))).toBe(true);
    const mobile = view("mobile");
    expect(mobile[0].props.className).toContain("h-full flex-1");
    expect(mobile[0].props.className).not.toContain("100dvh");
    expect(mobile.find((node) => node.type === "textarea")?.props.rows).toBe(2);
  });

  it("bounds the mobile Dialog to 90dvh and delegates its sole message scroll area to the shared panel", () => {
    const nodes = elements(ResearchAiMobileDialog({ researchId: "research-id", sources: [] }));
    const dialog = nodes.find((node) => String(node.props.className).includes("h-[90dvh]"))!;
    expect(dialog.props.className).toContain("max-h-[90dvh]");
    expect(dialog.props.className).toContain("overflow-hidden");
    expect(nodes.some((node) => String(node.props.className).includes("overflow-y-auto"))).toBe(false);
    const panel = nodes.find((node) => node.type === ResearchAiPanel)!;
    expect(panel.props.variant).toBe("mobile");
    expect(panel.props.researchId).toBe("research-id");
  });

  it("fits desktop below the Research header before sticky positioning, and updates on scroll/resize", () => {
    let top = 300;
    const panel = { style: { maxHeight: "" }, getBoundingClientRect: () => ({ top }) };
    const listeners = new Map<string, () => void>();
    const remove = vi.fn();
    const windowDouble = {
      innerHeight: 900,
      addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
      removeEventListener: remove,
    };
    vi.stubGlobal("window", windowDouble);
    const root = view()[0];
    (root.props.ref as { current: unknown }).current = panel;
    const cleanup = hooks.effects[2]();
    expect(panel.style.maxHeight).toBe("584px");
    top = 80;
    listeners.get("scroll")!();
    expect(panel.style.maxHeight).toBe("804px");
    windowDouble.innerHeight = 600;
    listeners.get("resize")!();
    expect(panel.style.maxHeight).toBe("504px");
    if (typeof cleanup === "function") cleanup();
    expect(remove).toHaveBeenCalledTimes(2);
    expect(panel.style.maxHeight).toBe("");
    view("mobile");
    expect(hooks.effects[2]()).toBeUndefined();
    expect(panel.style.maxHeight).toBe("");
  });

  it("keeps History within 90dvh with one scroll area and closes only after successful restoration", async () => {
    const { ResearchAiConversationsDialog: HistoryDialog } = await vi.importActual<typeof import("./research-ai-conversations-dialog")>("./research-ai-conversations-dialog");
    const restore = vi.fn<(id: string) => Promise<boolean>>().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    function historyView() {
      hooks.cursor = 0;
      return elements(HistoryDialog({ researchId: "research-id", onSelectConversation: restore }));
    }
    let nodes = historyView();
    const dialog = nodes.find((node) => String(node.props.className).includes("max-h-[90dvh]"))!;
    expect(dialog.props.className).toContain("overflow-hidden");
    expect(nodes.filter((node) => String(node.props.className).includes("overflow-y-auto"))).toHaveLength(1);
    fetchMock.mockResolvedValueOnce(Response.json([{
      id: "saved-conversation", preview: "Earlier question", updatedAt: "2026-10-24T00:00:00Z",
    }]));
    (nodes[0].props.onOpenChange as (open: boolean) => void)(true);
    for (let i = 0; i < 30; i++) await Promise.resolve();
    nodes = historyView();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/research/research-id/chat/conversations");
    async function select() {
      const item = nodes.find((node) => node.type === "button" && typeof node.props.onClick === "function")!;
      await (item.props.onClick as () => Promise<void>)();
      nodes = historyView();
    }
    await select();
    expect(nodes[0].props.open).toBe(true);
    await select();
    expect(nodes[0].props.open).toBe(false);
    expect(restore.mock.calls).toEqual([["saved-conversation"], ["saved-conversation"]]);
  });

  it("keeps User Markdown as plain text and sends only citation-stripped AI text to the renderer", async () => {
    const user = "**User** [source:do-not-parse] <img src=x>";
    const source = { id: "saved-source", title: "Stored Source", url: "https://example.invalid/stored" };
    fetchMock.mockResolvedValueOnce(detail([
      { authorType: "USER", content: user },
      { authorType: "AI", content: "**AI** [source:saved-source] [source:unknown]" },
      { authorType: "AI", content: "[source:saved-source]" },
    ], [source]));
    expect(await selectConversation()).toBe(true);
    const nodes = view();
    const plain = nodes.find((node) => node.type === "p" && node.props.children === user)!;
    expect(plain.props.className).toContain("whitespace-pre-wrap");
    const plainHtml = renderToStaticMarkup(plain);
    expect(plainHtml).toContain("**User** [source:do-not-parse] &lt;img src=x&gt;");
    expect(plainHtml).not.toMatch(/<(img|a|strong)\b/);
    expect(nodes.filter((node) => node.type === ResearchAiMarkdown).map((node) => node.props.children)).toEqual(["**AI**", ""]);
    expect(nodes.filter((node) => node.type === "supporting-sources").map((node) => node.props.sources)).toEqual([[source], [source]]);
    expect(nodes.some((node) => String(node.props.className).includes("bg-muted/50 p-3"))).toBe(true);
    expect(statuses()).toEqual(["Showing saved history from the server."]);
  });

  it("follows new output near the bottom, preserves a reader's older position, and allows explicit return", async () => {
    await startConversation();
    const scroll = scrollFixture();
    expect(scroll.viewport.scrollTop).toBe(800);
    expect(scroll.observe).toHaveBeenCalledTimes(2);
    typeMessage("Question");
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response).mockResolvedValueOnce(detail(earlierTurns));
    const sending = click("Send");
    try {
      stream.chunk("**Partial");
      await expectPartial("**Partial");
      scroll.viewport.scrollHeight = 1400;
      scroll.update();
      expect(scroll.viewport.scrollTop).toBe(1200);
      scroll.scroll(200);
      stream.chunk(" answer**");
      await expectPartial("**Partial answer**");
      scroll.viewport.scrollHeight = 1800;
      scroll.update();
      scroll.resize();
      expect(scroll.viewport.scrollTop).toBe(200);
      await click("Latest messages");
      expect(scroll.viewport.scrollTop).toBe(1600);
      // Near-bottom scrolling resumes following when the viewport is resized.
      scroll.scroll(1570);
      scroll.viewport.clientHeight = 150;
      scroll.resize();
      expect(scroll.viewport.scrollTop).toBe(1650);
    } finally {
      stream.close();
      await sending;
      scroll.cleanup();
    }
    expect(scroll.disconnect).toHaveBeenCalledOnce();
  });

  it("returns to readable saved history even when selecting the same conversation after scrolling up", async () => {
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    const scroll = scrollFixture();
    scroll.scroll(50);
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    expect(await selectConversation()).toBe(true);
    scroll.viewport.scrollHeight = 1600;
    scroll.update();
    expect(scroll.viewport.scrollTop).toBe(1400);
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    scroll.cleanup();
  });

  it("leaves selected answer text in place during automatic updates and resizing", () => {
    const scroll = scrollFixture();
    scroll.selectText();
    scroll.viewport.scrollHeight = 1600;
    scroll.update();
    scroll.resize();
    expect(scroll.viewport.scrollTop).toBe(800);
    scroll.cleanup();
  });
});
