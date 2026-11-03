import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { MAX_COMMENT_LENGTH } from "@/types/research/comment";
import { MAX_TAG_LENGTH } from "@/types/research/tag";
import { MAX_CONCLUSION_LENGTH } from "@/types/research/conclusion";
import { AddCommentDialog } from "./add-comment-dialog";
import { EditCommentDialog } from "./edit-comment-dialog";
import { DeleteCommentDialog } from "./delete-comment-dialog";
import { AddTagDialog } from "./add-tag-dialog";
import { DetachTagDialog } from "./detach-tag-dialog";
import { EditConclusionDialog } from "./edit-conclusion-dialog";

const state = vi.hoisted(() => ({
  value: undefined as string | undefined, pending: false, result: { error: null as string | null },
  createComment: vi.fn(), updateComment: vi.fn(), deleteComment: vi.fn(), createTag: vi.fn(), detachTag: vi.fn(), updateConclusion: vi.fn(),
  dispatch: vi.fn(), useActionState: vi.fn(),
}));
vi.mock("../_actions/createComment", () => ({ createComment: state.createComment }));
vi.mock("../_actions/updateComment", () => ({ updateComment: state.updateComment }));
vi.mock("../_actions/deleteComment", () => ({ deleteComment: state.deleteComment }));
vi.mock("../_actions/createTag", () => ({ createTag: state.createTag }));
vi.mock("../_actions/detachTag", () => ({ detachTag: state.detachTag }));
vi.mock("../_actions/updateConclusion", () => ({ updateConclusion: state.updateConclusion }));
// Follow Source/Finding hook-double tests: inspect real handlers and wrapper
// trees, without claiming browser scheduling, portal/focus or native submission.
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useActionState: state.useActionState,
  useState(initial: string) {
    state.value ??= initial;
    return [state.value, (value: string) => { state.value = value; }];
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
const originalText = "原文 / Original text\n[source:original-id] https://Example.COM/Paper#Citation";
const originalTag = " Original Tag / 原文 ";
const cases = [
  { kind: "addComment", view: (locale?: Locale) => AddCommentDialog({ researchId: "research-original", locale }),
    action: state.createComment, ids: ["research-original"], field: "content", max: MAX_COMMENT_LENGTH,
    trigger: ["Add Comment", "コメントを追加"], title: ["Add Comment", "コメントを追加"],
    description: ["Add a question, interpretation, or unresolved point to this research.", "このResearchに疑問や解釈、未解決の論点を追加します。"],
    submit: ["Add Comment", "コメントを追加"], pending: ["Adding...", "追加中..."], label: ["Comment", "コメント"] },
  { kind: "editComment", view: (locale?: Locale) => EditCommentDialog({ commentId: "comment-original", content: originalText, locale }),
    action: state.updateComment, ids: ["comment-original"], field: "content", max: MAX_COMMENT_LENGTH,
    trigger: ["Edit", "編集"], title: ["Edit Comment", "コメントを編集"],
    description: ["Update this discussion comment.", "このディスカッションのコメントを更新します。"],
    submit: ["Save Changes", "変更を保存"], pending: ["Saving...", "保存中..."], label: ["Comment", "コメント"] },
  { kind: "deleteComment", view: (locale?: Locale) => DeleteCommentDialog({ commentId: "comment-original", locale }),
    action: state.deleteComment, ids: ["comment-original"], field: null, max: 0,
    trigger: ["Delete", "削除"], title: ["Delete Comment", "コメントを削除"],
    description: ["Are you sure you want to delete this comment? This action cannot be undone.", "このコメントを削除しますか？この操作は取り消せません。"],
    submit: ["Delete Comment", "コメントを削除"], pending: ["Deleting...", "削除中..."], label: [] },
  { kind: "addTag", view: (locale?: Locale) => AddTagDialog({ researchId: "research-original", locale }),
    action: state.createTag, ids: ["research-original"], field: "name", max: MAX_TAG_LENGTH,
    trigger: ["Add tag", "タグを追加"], title: ["Add tag", "タグを追加"],
    description: ["Add a tag to organize this research.", "このResearchを整理するためのタグを追加します。"],
    submit: ["Add Tag", "タグを追加"], pending: ["Adding...", "追加中..."], label: ["Tag", "タグ"] },
  { kind: "detachTag", view: (locale?: Locale) => DetachTagDialog({ researchId: "research-original", tagId: "tag-original", locale }),
    action: state.detachTag, ids: ["research-original", "tag-original"], field: null, max: 0,
    trigger: ["Detach tag", "タグの関連付けを解除"], title: ["Detach Tag", "タグの関連付けを解除"],
    description: ["Are you sure you want to detach this tag from the research?", "このResearchからタグの関連付けを解除しますか？"],
    submit: ["Detach Tag", "タグの関連付けを解除"], pending: ["Detach...", "解除中..."], label: [] },
  { kind: "conclusion", view: (locale?: Locale) => EditConclusionDialog({ researchId: "research-original", initialConclusion: originalText, locale }),
    action: state.updateConclusion, ids: ["research-original"], field: "conclusion", max: MAX_CONCLUSION_LENGTH,
    trigger: ["Edit", "編集"], title: ["Edit conclusion", "結論を編集"],
    description: ["Update the current conclusion for this research.", "このResearchの現在の結論を更新します。"],
    submit: ["Save Changes", "変更を保存"], pending: ["Saving...", "保存中..."], label: ["Conclusion", "結論"] },
];
const field = (tree: ReactNode) => nodes(tree).find((node) => node.type === Input || node.type === Textarea)!;
function change(testCase: typeof cases[number], value: string) {
  (field(testCase.view("ja")).props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
}
beforeEach(() => {
  vi.resetAllMocks();
  state.value = undefined;
  state.pending = false;
  state.result = { error: null };
  state.useActionState.mockImplementation(() => [state.result, state.dispatch, state.pending]);
});

describe.each(cases)("$kind localization", (testCase) => {
  it.each([undefined, "en", "ja", "invalid"])("translates fixed UI and portaled Popup/Close with locale %s", (value) => {
    const index = value === "ja" ? 1 : 0;
    const language = index ? "ja" : "en";
    const tree = testCase.view(value as Locale | undefined);
    expect(tree.type).toBe(Dialog);
    expect(Object.keys(tree.props)).toEqual(["children"]); // Existing uncontrolled Dialog.
    const trigger = find(tree, DialogTrigger).props.render as Node;
    expect(trigger.type).toBe(Button);
    expect(testCase.kind === "detachTag" ? trigger.props["aria-label"] : trigger.props.children).toBe(testCase.trigger[index]);
    expect(find(tree, DialogTitle).props.children).toBe(testCase.title[index]);
    expect(find(tree, DialogDescription).props.children).toBe(testCase.description[index]);
    expect(find(tree, Button).props.children).toBe(testCase.submit[index]);
    const dialog = find(tree, DialogContent);
    expect(dialog.props.locale).toBe(language);
    const popup = DialogContent(dialog.props).props.children[1];
    expect(popup.props.lang).toBe(language);
    expect(nodes(popup.props.children).find((node) => node.type === "span" && node.props.className === "sr-only")?.props)
      .toMatchObject({ lang: language, children: index ? "閉じる" : "Close" });
    if (testCase.field) expect(find(tree, Label).props.children).toBe(testCase.label[index]);
    expect(testCase.action).not.toHaveBeenCalled();
  });

  describe.each(["en", "ja"] as const)("%s form and state contracts", (locale) => {
    it("preserves field attributes, original values, bound IDs and FormData", async () => {
      const tree = testCase.view(locale);
      expect(find(tree, "form").props.action).toBe(state.dispatch);
      const fields = nodes(tree).filter((node) => node.type === Textarea || node.type === Input);
      expect(fields.map((node) => node.props.name)).toEqual(testCase.field ? [testCase.field] : []);
      if (testCase.field) {
        const input = field(tree);
        expect(input.props.value).toBe(["editComment", "conclusion"].includes(testCase.kind) ? originalText : "");
        expect(find(tree, Label).props.htmlFor).toBe(input.props.id);
        expect(input.props.id).toBe(testCase.kind === "addTag" ? "name" : testCase.kind === "conclusion" ? "conclusion-content-research-original" : testCase.kind === "editComment" ? "comment-content-comment-original" : "comment-content");
        expect(input.props.required).toBe(testCase.field === "content" ? true : undefined);
        expect(input.props.maxLength).toBe(testCase.field === "content" ? undefined : testCase.max + 1);
        expect(input.props.disabled).toBeUndefined();
        expect(input.props.placeholder).toBe(testCase.kind === "addComment" ? (locale === "ja" ? "疑問や解釈、未解決の論点を入力してください..." : "Add a question, interpretation, or unresolved point...") : undefined);
      }
      const [bound, initial] = state.useActionState.mock.calls[0];
      expect(initial).toEqual({ error: null });
      const data = new FormData();
      const original = testCase.field === "name" ? originalTag : originalText;
      if (testCase.field) data.set(testCase.field, original);
      await bound(initial, data); // Invokes only the mocked Action.
      expect(testCase.action).toHaveBeenCalledExactlyOnceWith(...testCase.ids, initial, data);
      expect(testCase.action.mock.calls[0].at(-1)).toBe(data);
      expect([...data.entries()]).toEqual(testCase.field ? [[testCase.field, original]] : []);
    });

    it("keeps existing pending labels and button disablement", () => {
      if (testCase.kind === "addTag") {
        expect(find(testCase.view(locale), Button).props.disabled).toBe(true);
        change(testCase, originalTag);
      }
      expect(find(testCase.view(locale), Button).props.disabled).toBe(false);
      state.pending = true;
      const tree = testCase.view(locale);
      expect(find(tree, Button).props).toMatchObject({ type: "submit", disabled: true, children: testCase.pending[locale === "ja" ? 1 : 0] });
      if (testCase.field) expect(field(tree).props.disabled).toBeUndefined();
      state.pending = false;
      expect(find(testCase.view(locale), Button).props.disabled).toBe(false);
    });

    it.each(["Research not found.", "Comment not found.", "Tag is already attached.", "Failed to remove tag. Please try again.", "Original unknown Action error"])("keeps Action error verbatim: %s", (error) => {
      state.result = { error };
      const alert = nodes(testCase.view(locale)).find((node) => node.props.role === "alert")!;
      expect(alert.props).toMatchObject({ children: error, lang: "en" });
      expect(testCase.action).not.toHaveBeenCalled();
    });
  });

  if (testCase.field) {
    it("retains edited input across locale rerenders and preserves length counters/limits", () => {
      const original = testCase.field === "name" ? originalTag : originalText;
      change(testCase, original);
      expect(field(testCase.view("en")).props.value).toBe(original);
      const counter = nodes(testCase.view("ja")).find((node) => node.props["aria-live"] === "polite")!;
      expect(counter.props.children).toEqual([original.length, testCase.kind === "addTag" ? "/" : " / ", testCase.max]);
      change(testCase, "x".repeat(testCase.max));
      expect(find(testCase.view("ja"), Button).props.disabled).toBe(false);
      change(testCase, "x".repeat(testCase.max + 1));
      expect(find(testCase.view("ja"), Button).props.disabled).toBe(true);
      change(testCase, "");
      expect(find(testCase.view("ja"), Button).props.disabled).toBe(testCase.kind === "addTag");
      if (testCase.kind === "addTag") {
        change(testCase, "  \n  ");
        expect(find(testCase.view("ja"), Button).props.disabled).toBe(true);
      }
    });
  }
});

it.each([null, "", originalText])("preserves conclusion default/trigger and clear-to-empty contract for %s", async (initialConclusion) => {
  const render = (locale: Locale) => EditConclusionDialog({ researchId: "research-original", initialConclusion, locale });
  for (const locale of ["en", "ja"] as const) {
    const tree = render(locale);
    const trigger = find(tree, DialogTrigger).props.render as Node;
    expect(trigger.props.children).toBe(initialConclusion ? (locale === "ja" ? "編集" : "Edit") : (locale === "ja" ? "結論を追加" : "Add conclusion"));
    expect(field(tree).props.value).toBe(initialConclusion ?? "");
  }
  (field(render("ja")).props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "" } });
  expect(field(render("en")).props.value).toBe("");
  expect(find(render("ja"), Button).props.disabled).toBe(false);
  const data = new FormData();
  data.set("conclusion", "");
  const [bound, initial] = state.useActionState.mock.calls[0];
  await bound(initial, data);
  expect(state.updateConclusion).toHaveBeenCalledExactlyOnceWith("research-original", initial, data);
});

it.each(["saasComment.add", "saasTag.detachLabel", "saasConclusion.editTitle"] as const)("falls back per missing Japanese entry: %s", (key) => {
  const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
  const saved = partial[key];
  try {
    delete partial[key];
    if (key === "saasComment.add") expect(find(cases[0].view("ja"), DialogTitle).props.children).toBe("Add Comment");
    else if (key === "saasTag.detachLabel") expect((find(cases[4].view("ja"), DialogTrigger).props.render as Node).props["aria-label"]).toBe("Detach tag");
    else expect(find(cases[5].view("ja"), DialogTitle).props.children).toBe("Edit conclusion");
  } finally { partial[key] = saved; }
});
