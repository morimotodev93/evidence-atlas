import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoChatAnswerView, DemoChatClientPanel } from "./demo-chat-client-panel";
import { DemoResearchChatPanel } from "./demo-research-chat-panel";
import { DemoChatTurnstile } from "./demo-chat-turnstile";

// Same offline hook-double / production-handler pattern as research-ai-panel.test.tsx.
// No DOM mount, React scheduling, hydration or actual Cloudflare script is tested.
const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void | (() => void))[] }));
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
  useEffect(effect: () => void | (() => void)) { hooks.effects.push(effect); },
  useSyncExternalStore(_subscribe: unknown, getSnapshot: () => unknown) { return getSnapshot(); },
}));
vi.mock("@/components/ui/button", () => ({ Button: "button" }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: "textarea" }));
vi.mock("next/script", () => ({ default: "turnstile-script" }));
type Element = ReactElement<Record<string, unknown> & { children?: ReactNode }>;
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Element["props"]>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function view() {
  hooks.cursor = 0; hooks.effects = [];
  return elements(DemoChatClientPanel({ researchId: "public-research", researchTitle: "Public Research", siteKey: "public-site-key", sources: [] }));
}
const fetcher = vi.fn<typeof fetch>();
const threadId = "t".repeat(43);
function button(text: string) { return view().find((node) => node.type === "button" && node.props.children === text)!; }
function textarea() { return view().find((node) => node.type === "textarea")!; }
function start() { (button("Start verified session").props.onClick as () => void)(); }
async function ready() {
  start();
  fetcher.mockResolvedValueOnce(Response.json({ threadId }, { status: 201 }));
  const widget = view().find((node) => node.type === DemoChatTurnstile)!;
  (widget.props.onToken as (token: string) => void)("synthetic-token");
  for (let i = 0; i < 30 && textarea().props.disabled; i++) await Promise.resolve();
  expect(textarea().props.disabled).toBe(false);
}
beforeEach(() => { hooks.slots = []; hooks.cursor = 0; hooks.effects = []; fetcher.mockReset(); vi.stubGlobal("fetch", fetcher); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("Demo Chat UI wiring", () => {
  it("inserts editable random questions without sending, avoids repeats and protects edited drafts", async () => {
    expect(button("Random question").props.disabled).toBe(true);
    await ready();
    const focus = vi.fn();
    const input = textarea();
    (input.props.ref as { current: unknown }).current = { focus };
    const posts = fetcher.mock.calls.length;
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      (button("Random question").props.onClick as () => void)();
      const first = textarea().props.value;
      expect(typeof first).toBe("string");
      expect(first).not.toBe("");
      expect(button("Send question").props.disabled).toBe(false);
      expect(button("Random question").props.type).toBe("button");
      (button("Random question").props.onClick as () => void)();
      expect(textarea().props.value).not.toBe(first);
      expect(focus).toHaveBeenCalledTimes(2);
      expect(fetcher).toHaveBeenCalledTimes(posts);
      (textarea().props.onChange as (event: { target: { value: string } }) => void)({ target: { value: `${first} My edit` } });
      expect(button("Random question").props.disabled).toBe(true);
      (button("Random question").props.onClick as () => void)();
      expect(textarea().props.value).toBe(`${first} My edit`);
      (textarea().props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "" } });
      expect(button("Random question").props.disabled).toBe(false);
    } finally { random.mockRestore(); }
  });
  it("protects user-written text, including whitespace, and leaves a pending response alone", async () => {
    await ready();
    const change = (value: string) => (textarea().props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
    for (const draft of ["My own question", " "]) {
      change(draft);
      expect(button("Random question").props.disabled).toBe(true);
      (button("Random question").props.onClick as () => void)();
      expect(textarea().props.value).toBe(draft);
    }
    change("");
    (button("Random question").props.onClick as () => void)();
    const question = textarea().props.value;
    fetcher.mockReturnValueOnce(new Promise(() => {}));
    (view().find((node) => node.type === "form")!.props.onSubmit as (event: { preventDefault: () => void }) => void)({ preventDefault() {} });
    expect(button("Random question").props.disabled).toBe(true);
    (button("Random question").props.onClick as () => void)();
    expect(textarea().props.value).toBe(question);
    expect(view().find((node) => node.props.role === "region")!.props["aria-busy"]).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("separates paragraphs and section labels while retaining values, limitations and Source attribution", () => {
    const html = renderToStaticMarkup(<DemoChatAnswerView answer={{
      answer: "Study comparison:\nMETR measured 19% slower completion (internal_metr).\n\nGitHub measured 55% faster completion (internal_github).\nNot a universal effect. Unknown internal_unknown and prefix_internal_metr remain.",
      sources: [
        { id: "internal_metr", title: "METR", url: "https://example.com/metr" },
        { id: "internal_github", title: "GitHub", url: "https://example.com/github" },
      ],
      insufficientEvidence: false, contextTruncated: true, evidenceNotice: "Stored metadata only.",
    }} />);
    expect(html).toContain('whitespace-pre-wrap font-medium">Study comparison:</p>');
    expect(html).toContain("19% slower completion (Source 1)");
    expect(html).toContain("55% faster completion (Source 2)");
    expect(html).toContain("Not a universal effect.");
    expect(html).toContain("internal_unknown and prefix_internal_metr remain");
    expect(html).toContain('space-y-4 text-sm leading-7');
    expect(html).toContain('[overflow-wrap:anywhere]');
    expect(html).toContain('border-t pt-4');
    expect(html).toContain("Supporting sources</h3>");
    expect(html).toContain("Source 1: ");
    expect(html).toContain("Source 2: ");
    expect(html.match(/<a /g)).toHaveLength(2);
    expect(html).toContain("Stored metadata only.");
  });
  it("keeps disabled Coming soon UI with no widget, script, form or fetch", () => {
    const html = renderToStaticMarkup(<DemoResearchChatPanel researchTitle="Research" />);
    expect(html).toContain("Coming soon");
    expect(html).not.toMatch(/<form|<script|turnstile-script/);
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("keys client scope by Research, resetting state on Research switch", () => {
    const first = DemoResearchChatPanel({ researchId: "first", researchTitle: "One", siteKey: "site" });
    const second = DemoResearchChatPanel({ researchId: "second", researchTitle: "Two", siteKey: "site" });
    expect(first.type).toBe(DemoChatClientPanel);
    expect(first.key).not.toBe(second.key);
  });
  it("starts verification only through explicit action and keeps question disabled until ready", async () => {
    expect(textarea().props.disabled).toBe(true);
    expect(view().some((node) => node.type === DemoChatTurnstile)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    await ready();
    expect(view().some((node) => node.type === DemoChatTurnstile)).toBe(false);
    expect(button("Send question").props.disabled).toBe(true);
  });
  it.each([false, true])("announces widget failure/expiry %s as an alert with a manual fresh start", (expired) => {
    start();
    const widget = view().find((node) => node.type === DemoChatTurnstile)!;
    (widget.props.onFailure as (expired: boolean) => void)(expired);
    expect(view().find((node) => node.props.role === "alert")!.props.children).toContain(expired ? "expired" : "failed");
    expect(button("Start verified session")).toBeDefined();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("uses a named keyboard-submittable form and disables duplicate operations while sending", async () => {
    await ready();
    (textarea().props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "Question" } });
    expect(button("Send question").props.disabled).toBe(false);
    fetcher.mockReturnValueOnce(new Promise(() => {}));
    const submit = view().find((node) => node.type === "form")!.props.onSubmit as (event: { preventDefault: () => void }) => void;
    const preventDefault = vi.fn();
    submit({ preventDefault }); submit({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(textarea().props.disabled).toBe(true);
    expect(button("Sending…").props.disabled).toBe(true);
    expect(view().find((node) => node.props.role === "region")!.props["aria-busy"]).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(view().find((node) => node.type === "label")!.props.htmlFor).toBe(textarea().props.id);
  });
  it("renders AI prose, question-like markup and notices as escaped text; only Sources become links", () => {
    const html = renderToStaticMarkup(<DemoChatAnswerView answer={{
      answer: '<img src=x onerror="alert(1)"> [link](javascript:alert(1))',
      sources: [{ id: "source", title: "<script>title</script>", url: "https://example.com/evidence" }],
      insufficientEvidence: false, contextTruncated: true, evidenceNotice: "<script>notice</script>",
    }} />);
    expect(html).not.toMatch(/<img|<script|href="javascript:/);
    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;script&gt;notice");
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Only part of this Research");
  });
});

describe("Turnstile explicit-render adapter (synthetic API only)", () => {
  function mountWidget() {
    const onToken = vi.fn(), onFailure = vi.fn();
    const render = vi.fn().mockReturnValue("widget-id"), remove = vi.fn();
    vi.stubGlobal("window", { turnstile: { render, remove } });
    const tree = elements(DemoChatTurnstile({ siteKey: "public-site-key", onToken, onFailure }));
    (hooks.slots[0] as { current: unknown }).current = {};
    const cleanups = hooks.effects.map((effect) => effect());
    const script = tree.find((node) => node.type === "turnstile-script")!;
    (script.props.onReady as () => void)();
    return { onToken, onFailure, render, remove, script, options: render.mock.calls[0][1], cleanups };
  }
  it("uses only the public key, fixed action, explicit script and no token form field or widget retries", () => {
    const { options, script, remove, cleanups } = mountWidget();
    expect(script.props.src).toBe("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
    expect(options).toMatchObject({ sitekey: "public-site-key", action: "demo-chat", size: "compact", retry: "never", "refresh-expired": "never", "refresh-timeout": "never", "response-field": false });
    cleanups.forEach((cleanup) => cleanup?.());
    expect(remove).toHaveBeenCalledExactlyOnceWith("widget-id");
  });
  it("consumes successful tokens only once and ignores subsequent callbacks", () => {
    const { options, onToken, onFailure } = mountWidget();
    options.callback("token"); options.callback("token"); options["expired-callback"]();
    expect(onToken).toHaveBeenCalledExactlyOnceWith("token");
    expect(onFailure).not.toHaveBeenCalled();
  });
  it.each(["error-callback", "expired-callback", "timeout-callback"])("handles %s without session API calls", (name) => {
    const { options, onFailure, onToken } = mountWidget();
    options[name](); options.callback("late-token");
    expect(onFailure).toHaveBeenCalledExactlyOnceWith(name !== "error-callback");
    expect(onToken).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("handles script loading failure", () => {
    const { script, onFailure } = mountWidget();
    (script.props.onError as () => void)();
    expect(onFailure).toHaveBeenCalledExactlyOnceWith(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
