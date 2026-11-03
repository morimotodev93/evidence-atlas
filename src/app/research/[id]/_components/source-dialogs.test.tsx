import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { MAX_SOURCE_TITLE_LENGTH, MAX_SOURCE_URL_LENGTH } from "@/types/research/source";
import { AddSourceDialog } from "./add-source-dialog";
import { EditSourceDialog } from "./edit-source-dialog";
import { DeleteSourceDialog } from "./delete-source-dialog";

const state = vi.hoisted(() => ({
  values: [] as string[], cursor: 0, pending: false,
  result: { error: null as string | null },
  create: vi.fn(), update: vi.fn(), remove: vi.fn(), dispatch: vi.fn(), useActionState: vi.fn(),
}));
vi.mock("../_actions/createSource", () => ({ createSource: state.create }));
vi.mock("../_actions/updateSource", () => ({ updateSource: state.update }));
vi.mock("../_actions/deleteSource", () => ({ deleteSource: state.remove }));
// Hook doubles inspect existing handlers and contracts; they do not simulate
// React scheduling, native form submission, or browser portal/focus behavior.
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useActionState: state.useActionState,
  useState(initial: string) {
    const index = state.cursor++;
    state.values[index] ??= initial;
    return [state.values[index], (value: string) => { state.values[index] = value; }];
  },
}));

type Node = ReactElement<Record<string, unknown> & { children?: ReactNode }>;
function nodes(node: ReactNode): Node[] {
  return Children.toArray(node).flatMap((child) => isValidElement<Node["props"]>(child)
    ? [child, ...nodes(child.props.children)] : []);
}
function find(tree: ReactNode, type: unknown) {
  return nodes(tree).find((node) => node.type === type)!;
}
const title = "Original citation — 原文 2026, p. 12";
const url = "HTTPS://Example.COM/Original%2FPath?lang=en&ref=Paper#Section";
const cases = [
  { kind: "add", view: (locale?: Locale) => AddSourceDialog({ researchId: "research-original", locale }),
    action: state.create, id: "research-original", trigger: ["Add Source", "Sourceを追加"],
    heading: ["Add Source", "Sourceを追加"],
    description: ["Add an external source used in this research.", "このResearchで使用する外部のSourceを追加します。"],
    submit: ["Add Source", "Sourceを追加"], pending: ["Adding...", "追加中..."] },
  { kind: "edit", view: (locale?: Locale) => EditSourceDialog({ sourceId: "source-original", title, url, locale }),
    action: state.update, id: "source-original", trigger: ["Edit", "編集"], heading: ["Edit Source", "Sourceを編集"],
    description: ["Update the source used in this research.", "このResearchで使用するSourceを更新します。"],
    submit: ["Save Changes", "変更を保存"], pending: ["Saving...", "保存中..."] },
  { kind: "delete", view: (locale?: Locale) => DeleteSourceDialog({ sourceId: "source-original", locale }),
    action: state.remove, id: "source-original", trigger: ["Delete", "削除"], heading: ["Delete Source", "Sourceを削除"],
    description: ["Are you sure you want to delete this source? This action cannot be undone.", "このSourceを削除しますか？この操作は取り消せません。"],
    submit: ["Delete Source", "Sourceを削除"], pending: ["Deleting...", "削除中..."] },
];
function view(testCase: typeof cases[number], locale?: Locale) {
  state.cursor = 0;
  return testCase.view(locale);
}
beforeEach(() => {
  vi.resetAllMocks();
  state.values = [];
  state.pending = false;
  state.result = { error: null };
  state.useActionState.mockImplementation(() => [state.result, state.dispatch, state.pending]);
});

describe.each(cases)("Source $kind dialog", (testCase) => {
  it.each([undefined, "en", "ja", "invalid"])("translates fixed UI with locale %s and English fallback", (value) => {
    const index = value === "ja" ? 1 : 0;
    const language = index ? "ja" : "en";
    const tree = view(testCase, value as Locale | undefined);
    expect(tree.type).toBe(Dialog);
    expect(Object.keys(tree.props)).toEqual(["children"]);
    const trigger = find(tree, DialogTrigger).props.render as Node;
    expect(trigger.type).toBe(Button);
    expect(trigger.props.children).toBe(testCase.trigger[index]);
    expect(find(tree, DialogTitle).props.children).toBe(testCase.heading[index]);
    expect(find(tree, DialogDescription).props.children).toBe(testCase.description[index]);
    expect(find(tree, Button).props.children).toBe(testCase.submit[index]);
    const content = find(tree, DialogContent);
    expect(content.props.locale).toBe(language);
    const popup = DialogContent(content.props).props.children[1];
    expect(popup.props.lang).toBe(language);
    expect(nodes(popup.props.children).find((node) => node.type === "span" && node.props.className === "sr-only")?.props)
      .toMatchObject({ lang: language, children: index ? "閉じる" : "Close" });
    if (testCase.kind !== "delete") {
      expect(nodes(tree).filter((node) => node.type === Label).map((node) => node.props.children))
        .toEqual([index ? "タイトル" : "Title", "URL"]);
      const inputs = nodes(tree).filter((node) => node.type === Input);
      expect(inputs[0].props.placeholder).toBe(index ? "Sourceのタイトル" : "Source title");
      expect(inputs[1].props.placeholder).toBe(testCase.kind === "add" ? "https://example.com" : undefined);
    }
    expect(testCase.action).not.toHaveBeenCalled();
  });

  describe.each(["en", "ja"] as const)("%s existing behavior", (locale) => {
    it("keeps form fields, initial state, original values and bound Action arguments", async () => {
      const tree = view(testCase, locale);
      expect(find(tree, "form").props.action).toBe(state.dispatch);
      const inputs = nodes(tree).filter((node) => node.type === Input);
      expect(inputs.map((node) => node.props.name)).toEqual(testCase.kind === "delete" ? [] : ["title", "url"]);
      if (inputs.length) {
        expect(inputs.map((node) => node.props.value)).toEqual(testCase.kind === "edit" ? [title, url] : ["", ""]);
        for (const input of inputs) {
          expect(input.props.required).toBe(true);
          expect(input.props.disabled).toBeUndefined();
          expect(nodes(tree).find((node) => node.type === Label && node.props.htmlFor === input.props.id)).toBeDefined();
        }
        expect(inputs[1].props.type).toBe("url");
      }
      const [bound, initial] = state.useActionState.mock.calls[0];
      expect(initial).toEqual({ error: null });
      const data = new FormData();
      if (inputs.length) { data.set("title", title); data.set("url", url); }
      await bound(initial, data); // Calls only the mocked Action, never a real write.
      expect(testCase.action).toHaveBeenCalledExactlyOnceWith(testCase.id, initial, data);
      expect(testCase.action.mock.calls[0][2]).toBe(data);
      expect([...data.entries()]).toEqual(inputs.length ? [["title", title], ["url", url]] : []);
    });

    it("keeps pending disablement and labels", () => {
      expect(find(view(testCase, locale), Button).props.disabled).toBe(false);
      state.pending = true;
      const tree = view(testCase, locale);
      expect(find(tree, Button).props).toMatchObject({ type: "submit", disabled: true, children: testCase.pending[locale === "ja" ? 1 : 0] });
      state.pending = false;
      expect(find(view(testCase, locale), Button).props.disabled).toBe(false);
    });

    it.each(["Please enter a valid URL", "Source not found.", "Research not found.", "Failed to add source. Please try again.", "Unrecognized original Action error"])("renders Action errors verbatim: %s", (error) => {
      state.result = { error };
      const alert = nodes(view(testCase, locale)).find((node) => node.props.role === "alert")!;
      expect(alert.props).toMatchObject({ children: error, lang: "en" });
      expect(testCase.action).not.toHaveBeenCalled();
    });
  });

  if (testCase.kind !== "delete") {
    it("retains edited values across locale rerenders and existing length-limit disablement", () => {
      const change = (name: string, value: string) => {
        const input = nodes(view(testCase, "ja")).find((node) => node.type === Input && node.props.name === name)!;
        (input.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
      };
      change("title", title);
      change("url", url);
      expect(nodes(view(testCase, "en")).filter((node) => node.type === Input).map((node) => node.props.value)).toEqual([title, url]);
      for (const [name, max] of [["title", MAX_SOURCE_TITLE_LENGTH], ["url", MAX_SOURCE_URL_LENGTH]] as const) {
        change(name, "x".repeat(max));
        expect(find(view(testCase, "ja"), Button).props.disabled).toBe(false);
        change(name, "x".repeat(max + 1));
        expect(find(view(testCase, "ja"), Button).props.disabled).toBe(true);
        change(name, name === "title" ? title : url);
      }
      const counter = nodes(view(testCase, "ja")).find((node) => node.props["aria-live"] === "polite")!;
      expect(counter.props.children).toEqual([title.length, " / ", MAX_SOURCE_TITLE_LENGTH]);
      expect(testCase.action).not.toHaveBeenCalled();
    });
  }
});

it("falls back to English for a missing Japanese Source entry", () => {
  const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
  const saved = partial["saasSource.add"];
  try {
    delete partial["saasSource.add"];
    expect(find(view(cases[0], "ja"), DialogTitle).props.children).toBe("Add Source");
  } finally {
    partial["saasSource.add"] = saved;
  }
});
