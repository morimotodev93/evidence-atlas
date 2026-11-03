import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { MAX_FINDING_LENGTH } from "@/types/research/finding";
import { AddFindingDialog } from "./add-finding-dialog";
import { EditFindingDialog } from "./edit-finding-dialog";
import { DeleteFindingDialog } from "./delete-finding-dialog";
import { ManageFindingSourcesDialog } from "./add-finding-source-dialog";

const state = vi.hoisted(() => ({
  values: [] as (string | boolean)[], cursor: 0, pending: false,
  result: { error: null as string | null },
  create: vi.fn(), update: vi.fn(), remove: vi.fn(), attach: vi.fn(), dispatch: vi.fn(), useActionState: vi.fn(),
}));
vi.mock("../_actions/createFinding", () => ({ createFinding: state.create }));
vi.mock("../_actions/updateFinding", () => ({ updateFinding: state.update }));
vi.mock("../_actions/deleteFinding", () => ({ deleteFinding: state.remove }));
vi.mock("../_actions/attachFindingSource", () => ({ attachFindingSource: state.attach }));
// As in Source/status tests, inspect real component trees with hook doubles.
// React scheduling, browser focus/portals and native submission are not simulated.
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useActionState: state.useActionState,
  useState(initial: string | boolean) {
    const index = state.cursor++;
    state.values[index] ??= initial;
    return [state.values[index], (value: string | boolean) => { state.values[index] = value; }];
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
const content = "原文 excerpt\nOriginal citation [source:source-original], Paper 2026 p.12 https://Example.COM/Paper#Citation";
const sources = [
  { id: "source-original", title: "Original citation — 原文 2026 p.12" },
  { id: "別の-source-id", title: "日本語の出典 / Untranslated source" },
];
const cases = [
  { kind: "add", render: (locale?: Locale) => AddFindingDialog({ researchId: "research-original", locale }),
    action: state.create, id: "research-original", trigger: ["Add Finding", "Findingを追加"], title: ["Add Finding", "Findingを追加"],
    description: ["Add an evidence or insight from this research.", "このResearchで得られた根拠や知見を追加します。"],
    submit: ["Add Finding", "Findingを追加"], pending: ["Adding...", "追加中..."] },
  { kind: "edit", render: (locale?: Locale) => EditFindingDialog({ findingId: "finding-original", content, locale }),
    action: state.update, id: "finding-original", trigger: ["Edit", "編集"], title: ["Edit Finding", "Findingを編集"],
    description: ["Update this evidence or insight.", "この根拠や知見を更新します。"],
    submit: ["Save Changes", "変更を保存"], pending: ["Saving...", "保存中..."] },
  { kind: "delete", render: (locale?: Locale) => DeleteFindingDialog({ findingId: "finding-original", locale }),
    action: state.remove, id: "finding-original", trigger: ["Delete", "削除"], title: ["Delete Finding", "Findingを削除"],
    description: ["Are you sure you want to delete this finding? This action cannot be undone.", "このFindingを削除しますか？この操作は取り消せません。"],
    submit: ["Delete Finding", "Findingを削除"], pending: ["Deleting...", "削除中..."] },
  { kind: "attach", render: (locale?: Locale) => ManageFindingSourcesDialog({ findingId: "finding-original", sources, locale }),
    action: state.attach, id: "finding-original", trigger: ["Add source", "Sourceを追加"], title: ["Add supporting source", "裏付けとなるSourceを追加"],
    description: ["Select a source from this research to support the finding.", "このResearchのSourceを選び、Findingの裏付けとして関連付けます。"],
    submit: ["Add source", "Sourceを追加"], pending: ["Adding...", "追加中..."] },
];
function view(testCase: typeof cases[number], locale?: Locale) {
  state.cursor = 0;
  return testCase.render(locale);
}
function select(value: string | null, locale: Locale = "ja") {
  (find(view(cases[3], locale), Select).props.onValueChange as (value: string | null) => void)(value);
}
beforeEach(() => {
  vi.resetAllMocks();
  state.values = [];
  state.pending = false;
  state.result = { error: null };
  state.useActionState.mockImplementation(() => [state.result, state.dispatch, state.pending]);
});

describe.each(cases)("Finding $kind dialog", (testCase) => {
  it.each([undefined, "en", "ja", "invalid"])("translates UI and shared Popup language/Close for locale %s", (value) => {
    const index = value === "ja" ? 1 : 0;
    const language = index ? "ja" : "en";
    const tree = view(testCase, value as Locale | undefined);
    expect(tree.type).toBe(Dialog);
    const trigger = find(tree, DialogTrigger);
    const triggerButton = trigger.props.render as Node;
    expect(triggerButton.type).toBe(Button);
    expect(testCase.kind === "attach" ? trigger.props.children : triggerButton.props.children).toBe(testCase.trigger[index]);
    expect(find(tree, DialogTitle).props.children).toBe(testCase.title[index]);
    expect(find(tree, DialogDescription).props.children).toBe(testCase.description[index]);
    expect(find(tree, Button).props.children).toBe(testCase.submit[index]);
    const popup = DialogContent(find(tree, DialogContent).props).props.children[1];
    expect(popup.props.lang).toBe(language);
    expect(nodes(popup.props.children).find((node) => node.type === "span" && node.props.className === "sr-only")?.props)
      .toMatchObject({ lang: language, children: index ? "閉じる" : "Close" });
    if (testCase.kind === "attach") {
      const selectContent = find(tree, SelectContent);
      expect(selectContent.props.lang).toBe(language);
      expect(SelectContent(selectContent.props).props.children.props.children.props.lang).toBe(language);
      expect(find(tree, SelectValue).props.placeholder).toBe(index ? "Sourceを選択" : "Select a source");
    } else {
      expect(Object.keys(tree.props)).toEqual(["children"]); // Existing uncontrolled open/close.
    }
    if (testCase.kind === "add" || testCase.kind === "edit") {
      expect(find(tree, Label).props.children).toBe("Finding");
      expect(find(tree, Textarea).props.placeholder).toBe(testCase.kind === "add" ?
        (index ? "根拠や知見を入力してください..." : "Describe the evidence or insight...") : undefined);
    }
    expect(testCase.action).not.toHaveBeenCalled();
  });

  describe.each(["en", "ja"] as const)("%s contracts", (locale) => {
    it("preserves fields, original content, bound IDs, initial Action state and FormData", async () => {
      const tree = view(testCase, locale);
      expect(find(tree, "form").props.action).toBe(state.dispatch);
      const fields = nodes(tree).filter((node) => node.type === Textarea || node.type === Select);
      const expected = testCase.kind === "delete" ? [] : [testCase.kind === "attach" ? "sourceId" : "content"];
      expect(fields.map((node) => node.props.name)).toEqual(expected);
      if (testCase.kind === "add" || testCase.kind === "edit") {
        const field = find(tree, Textarea);
        expect(field.props).toMatchObject({ name: "content", value: testCase.kind === "edit" ? content : "", rows: 6, required: true });
        expect(field.props.disabled).toBeUndefined();
        expect(find(tree, Label).props.htmlFor).toBe(field.props.id);
      }
      if (testCase.kind === "attach") {
        expect(find(tree, Select).props).toMatchObject({ name: "sourceId", value: "" });
        expect(nodes(tree).filter((node) => node.type === SelectItem).map((node) => [node.props.value, node.props.children]))
          .toEqual(sources.map((source) => [source.id, source.title]));
        expect(find(tree, SelectValue).props.children).toBeUndefined();
      }
      const [bound, initial] = state.useActionState.mock.calls[0];
      expect(initial).toEqual({ error: null });
      const data = new FormData();
      if (testCase.kind === "attach") data.set("sourceId", sources[1].id);
      else if (testCase.kind !== "delete") data.set("content", content);
      await bound(initial, data); // Only a mocked Action is called, never a write.
      expect(testCase.action).toHaveBeenCalledExactlyOnceWith(testCase.id, initial, data);
      expect(testCase.action.mock.calls[0][2]).toBe(data);
      expect([...data.entries()]).toEqual(testCase.kind === "attach" ? [["sourceId", sources[1].id]] : testCase.kind === "delete" ? [] : [["content", content]]);
    });

    it("retains pending labels, disablement and editable controls", () => {
      if (testCase.kind === "attach") {
        expect(find(view(testCase, locale), Button).props.disabled).toBe(true);
        select(sources[0].id, locale);
      }
      expect(find(view(testCase, locale), Button).props.disabled).toBe(false);
      state.pending = true;
      const tree = view(testCase, locale);
      expect(find(tree, Button).props).toMatchObject({ type: "submit", disabled: true, children: testCase.pending[locale === "ja" ? 1 : 0] });
      for (const field of nodes(tree).filter((node) => node.type === Textarea || node.type === Select)) expect(field.props.disabled).toBeUndefined();
      state.pending = false;
      expect(find(view(testCase, locale), Button).props.disabled).toBe(false);
    });

    it.each(["Please select a source.", "Finding not found.", "Source does not belong to this research.", "Failed to attach source. Please try again.", "Original unknown Action error"])("retains verbatim English error: %s", (error) => {
      state.result = { error };
      const tree = view(testCase, locale);
      const alert = nodes(tree).find((node) => node.type === "p" && node.props.children === error)!;
      expect(alert.props.lang).toBe("en");
      // The association form keeps its existing plain paragraph error behavior.
      expect(alert.props.role).toBe(testCase.kind === "attach" ? undefined : "alert");
      expect(testCase.action).not.toHaveBeenCalled();
    });
  });

  if (testCase.kind === "add" || testCase.kind === "edit") {
    it("preserves edits across locale rerenders, counter and existing length limits", () => {
      const change = (value: string) => (find(view(testCase, "ja"), Textarea).props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
      change(content);
      expect(find(view(testCase, "en"), Textarea).props.value).toBe(content);
      expect(nodes(view(testCase, "ja")).find((node) => node.props["aria-live"] === "polite")?.props.children)
        .toEqual([content.length, " / ", MAX_FINDING_LENGTH]);
      change("x".repeat(MAX_FINDING_LENGTH));
      expect(find(view(testCase, "ja"), Button).props.disabled).toBe(false);
      change("x".repeat(MAX_FINDING_LENGTH + 1));
      expect(find(view(testCase, "ja"), Button).props.disabled).toBe(true);
      change(content);
      expect(find(view(testCase, "en"), Button).props.disabled).toBe(false);
    });
  }
});

it("keeps selected Source IDs/titles through locale changes and dialog close/reopen; ignores null/empty selection", () => {
  const testCase = cases[3];
  const open = (value: boolean) => (view(testCase, "ja").props.onOpenChange as (value: boolean) => void)(value);
  expect(view(testCase, "ja").props.open).toBe(false);
  open(true);
  select(sources[1].id);
  open(false);
  expect(view(testCase, "ja").props.open).toBe(false);
  open(true);
  select(null);
  select("");
  const tree = view(testCase, "en");
  expect(tree.props.open).toBe(true);
  expect(find(tree, Select).props.value).toBe(sources[1].id);
  expect(find(tree, SelectValue).props.children).toBe(sources[1].title);
  expect(state.attach).not.toHaveBeenCalled();
});

it("keeps an empty Source list disabled without introducing a new empty state", () => {
  const tree = ManageFindingSourcesDialog({ findingId: "finding-original", sources: [], locale: "ja" });
  expect(nodes(tree).filter((node) => node.type === SelectItem)).toEqual([]);
  expect(find(tree, Button).props.disabled).toBe(true);
});

it.each(["saasFinding.add", "saasFinding.selectSource"] as const)("falls back per missing Japanese key: %s", (key) => {
  const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
  const saved = partial[key];
  try {
    delete partial[key];
    if (key === "saasFinding.add") expect(find(view(cases[0], "ja"), DialogTitle).props.children).toBe("Add Finding");
    else expect(find(view(cases[3], "ja"), SelectValue).props.placeholder).toBe("Select a source");
  } finally { partial[key] = saved; }
});
