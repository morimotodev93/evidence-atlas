import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import type { Locale } from "@/lib/i18n/locales";
import type { DisplayError } from "@/lib/i18n/errors";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { EditResearchStatusDialog } from "./edit-research-status-dialog";

type Status = "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
const state = vi.hoisted(() => ({
  selection: undefined as Status | undefined, pending: false,
  result: { error: null as DisplayError | null },
  update: vi.fn(), dispatch: vi.fn(), useActionState: vi.fn(),
}));
vi.mock("../_actions/updateResearchStatus", () => ({ updateResearchStatus: state.update }));
// Inspect the real component tree and handlers with hook doubles, following the
// member-role form tests. React scheduling and browser portal/focus behavior are
// not exercised; the existing Action suites test the real guards with mocked I/O.
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useActionState: state.useActionState,
  useState(initial: Status) {
    if (state.selection === undefined) state.selection = initial;
    return [state.selection, (next: Status) => { state.selection = next; }];
  },
}));

type Node = ReactElement<Record<string, unknown> & { children?: ReactNode }>;
function nodes(node: ReactNode): Node[] {
  return Children.toArray(node).flatMap((child) => isValidElement<Node["props"]>(child)
    ? [child, ...nodes(child.props.children)] : []);
}
function view(locale?: Locale, initialStatus: Status = "IN_PROGRESS") {
  return EditResearchStatusDialog({ researchId: "original-research-id", initialStatus, locale });
}
function find(tree: ReactNode, type: unknown) {
  return nodes(tree).find((node) => node.type === type)!;
}
function select(value: string | null, locale: Locale = "ja") {
  const onValueChange = find(view(locale), Select).props.onValueChange as (value: string | null) => void;
  onValueChange(value);
}

beforeEach(() => {
  vi.resetAllMocks();
  state.selection = undefined;
  state.pending = false;
  state.result = { error: null };
  state.useActionState.mockImplementation(() => [state.result, state.dispatch, state.pending]);
});

describe("Research status dialog localization", () => {
  it.each([undefined, "en", "ja", "invalid"])("localizes fixed UI and both portaled popups for locale %s", (value) => {
    const locale = value as Locale | undefined;
    const japanese = value === "ja";
    const language = japanese ? "ja" : "en";
    const tree = view(locale);
    expect(tree.type).toBe(Dialog);
    // Open/dismissal remain uncontrolled and delegated to the existing Dialog.
    expect(Object.keys(tree.props)).toEqual(["children"]);
    const trigger = find(tree, DialogTrigger).props.render as ReactElement<{ children: string }>;
    expect(trigger.type).toBe(Button);
    expect(trigger.props.children).toBe(japanese ? "ステータスを変更" : "Edit status");
    expect(find(tree, DialogTitle).props.children).toBe(japanese ? "Researchのステータスを変更" : "Edit research status");
    expect(find(tree, DialogDescription).props.children).toBe(japanese ? "このResearchの現在のステータスを更新します。" : "Update the current status of this research.");
    expect(find(tree, Label).props.children).toBe(japanese ? "ステータス" : "Status");
    expect(find(tree, Button).props.children).toBe(japanese ? "変更を保存" : "Save Changes");

    const content = find(tree, DialogContent);
    expect(content.props.locale).toBe(language);
    const popup = DialogContent(content.props).props.children[1];
    expect(popup.props.lang).toBe(language);
    expect(nodes(popup.props.children).find((node) => node.type === "span" && node.props.className === "sr-only")?.props)
      .toMatchObject({ lang: language, children: japanese ? "閉じる" : "Close" });
    const selectContent = find(tree, SelectContent);
    expect(selectContent.props.lang).toBe(language);
    const selectPopup = SelectContent(selectContent.props).props.children.props.children;
    expect(selectPopup.props["data-slot"]).toBe("select-content");
    expect(selectPopup.props.lang).toBe(language);
    expect(state.update).not.toHaveBeenCalled();
  });

  describe.each(["en", "ja"] as const)("%s state and Action contract", (locale) => {
    const labels = locale === "ja" ? ["調査中", "完了", "アーカイブ済み"] : ["In progress", "Completed", "Archived"];
    it.each(["IN_PROGRESS", "COMPLETED", "ARCHIVED"] as const)("preserves initial/submitted enum %s and the bound ID", async (status) => {
      const tree = view(locale, status);
      const select = find(tree, Select);
      expect(select.props.name).toBe("status");
      expect(select.props.value).toBe(status);
      expect(select.props.disabled).toBeUndefined();
      expect(nodes(tree).filter((node) => node.type === SelectItem).map((node) => [node.props.value, node.props.children]))
        .toEqual([["IN_PROGRESS", labels[0]], ["COMPLETED", labels[1]], ["ARCHIVED", labels[2]]]);
      const labelIndex = ["IN_PROGRESS", "COMPLETED", "ARCHIVED"].indexOf(status);
      expect(find(tree, SelectValue).props.children).toBe(locale === "ja" ? labels[labelIndex] : undefined);
      expect(find(tree, "form").props.action).toBe(state.dispatch);
      const [bound, initial] = state.useActionState.mock.calls[0];
      expect(initial).toEqual({ error: null });
      const data = new FormData();
      data.set("status", status);
      await bound(initial, data); // Only the mocked Action is invoked.
      expect(state.update).toHaveBeenCalledExactlyOnceWith("original-research-id", initial, data);
      expect(state.update.mock.calls[0][2]).toBe(data);
      expect([...data.entries()]).toEqual([["status", status]]);
    });

    it("retains the pending button behavior without disabling other controls", () => {
      expect(find(view(locale), Button).props.disabled).toBe(false);
      state.pending = true;
      const tree = view(locale);
      expect(find(tree, Button).props).toMatchObject({
        type: "submit", disabled: true, children: locale === "ja" ? "保存中..." : "Saving...",
      });
      expect(find(tree, Select).props.disabled).toBeUndefined();
      expect(find(tree, "form").props.action).toBe(state.dispatch);
      state.pending = false;
      expect(find(view(locale), Button).props.disabled).toBe(false);
    });

  });

  describe.each([undefined, "en", "ja", "invalid"])("structured Action errors for locale %s", value => {
    it.each([
      ["RESEARCH_INVALID_STATUS", "Invalid research status.", "Researchのステータスが無効です。"],
      ["RESEARCH_NOT_FOUND", "Research not found.", "Researchが見つかりません。"],
      ["RESEARCH_STATUS_UPDATE_FAILED", "Failed to update research status. Please try again.", "Researchのステータスを更新できませんでした。もう一度お試しください。"],
    ] as const)("renders %s with the same alert semantics and equivalent meaning", (code, en, ja) => {
      state.result = { error: { code } };
      const alert = nodes(view(value as Locale | undefined)).find(node => node.props.role === "alert")!;
      expect(alert.props.children).toBe(value === "ja" ? ja : en);
      expect(alert.props.lang).toBe(value === "ja" ? "ja" : "en");
      expect(alert.props.className).toBe("rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive-text");
      expect(state.update).not.toHaveBeenCalled();
    });

    it.each([
      "Invalid research status.", "Research not found.", "Failed to update research status. Please try again.",
      {}, { code: "UNKNOWN" }, { code: "__proto__" }, { code: "constructor" }, { code: 42 },
      { code: null }, { code: ["RESEARCH_NOT_FOUND"] }, { code: "RESEARCH_NOT_FOUND " },
      { message: "private diagnostic", stack: "private stack", cause: "private cause" },
    ])("uses safe English feedback for malformed/unrecognized data %j without matching old messages", error => {
      state.result = { error: error as DisplayError };
      const alert = nodes(view(value as Locale | undefined)).find(node => node.props.role === "alert")!;
      expect(alert.props.children).toBe("Something went wrong. Please try again.");
      expect(alert.props.lang).toBe("en");
      expect(state.update).not.toHaveBeenCalled();
    });
  });

  it.each([
    ["RESEARCH_INVALID_STATUS", "errors.researchInvalidStatus", "Invalid research status."],
    ["RESEARCH_NOT_FOUND", "errors.researchNotFound", "Research not found."],
    ["RESEARCH_STATUS_UPDATE_FAILED", "errors.researchStatusUpdateFailed", "Failed to update research status. Please try again."],
  ] as const)("keeps per-key English fallback for %s", (code, key, english) => {
    const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
    const saved = partial[key];
    try {
      delete partial[key];
      state.result = { error: { code } };
      const alert = nodes(view("ja")).find(node => node.props.role === "alert")!;
      expect(alert.props.children).toBe(english);
      expect(alert.props.lang).toBe("ja");
    } finally { partial[key] = saved; }
  });

  it("does not read diagnostics or reset selection/pending/submission state after an error", async () => {
    const failure = { code: "RESEARCH_STATUS_UPDATE_FAILED" as const,
      get message(): never { throw Error("private message was read"); },
      get stack(): never { throw Error("private stack was read"); },
      get cause(): never { throw Error("private cause was read"); },
    };
    state.result = { error: failure };
    select("ARCHIVED", "ja");
    state.pending = true;
    const pending = view("ja");
    expect(find(pending, Select).props.value).toBe("ARCHIVED");
    expect(find(pending, Select).props.disabled).toBeUndefined();
    expect(find(pending, Button).props.disabled).toBe(true);
    expect(nodes(pending).find(node => node.props.role === "alert")?.props.lang).toBe("ja");
    state.pending = false;
    const tree = view("en", "COMPLETED");
    expect(find(tree, Select).props.value).toBe("ARCHIVED");
    expect(find(tree, Button).props.disabled).toBe(false);
    const data = new FormData(); data.set("status", "ARCHIVED");
    const bound = state.useActionState.mock.calls.at(-1)![0];
    await bound(state.result, data);
    expect(state.update).toHaveBeenCalledTimes(1);
    expect(state.update.mock.calls[0][0]).toBe("original-research-id");
    expect(state.update.mock.calls[0][1]).toBe(state.result);
    expect(state.update.mock.calls[0][2]).toBe(data);
    expect(find(tree, "form").props.action).toBe(state.dispatch);
    state.result = { error: null };
    expect(nodes(view("ja")).some(node => node.props.role === "alert")).toBe(false);
    expect(find(view("ja"), Select).props.value).toBe("ARCHIVED");
    expect(Object.keys(view("ja").props)).toEqual(["children"]);
  });

  it("preserves a changed selection across rerenders and ignores empty/null selection", () => {
    select("COMPLETED");
    expect(find(view("ja"), Select).props.value).toBe("COMPLETED");
    expect(find(view("ja"), SelectValue).props.children).toBe("完了");
    select(null);
    select("");
    // Neither a different initial prop nor a locale rerender resets local state.
    expect(find(view("en", "ARCHIVED"), Select).props.value).toBe("COMPLETED");
    expect(find(view("ja", "ARCHIVED"), SelectValue).props.children).toBe("完了");
    expect(state.update).not.toHaveBeenCalled();
  });

  it("falls back per key when Japanese copy is missing", () => {
    const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
    const saved = partial["saasResearch.statusDialogTitle"];
    try {
      delete partial["saasResearch.statusDialogTitle"];
      expect(find(view("ja"), DialogTitle).props.children).toBe("Edit research status");
    } finally {
      partial["saasResearch.statusDialogTitle"] = saved;
    }
  });
});
