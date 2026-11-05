import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/lib/i18n/locales";
import type { DisplayError } from "@/lib/i18n/errors";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { Select, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { OrganizationMemberRoleForm } from "./organization-member-role-form";

const state = vi.hoisted(() => ({
  role: undefined as "ADMIN" | "MEMBER" | undefined, pending: false,
  result: { error: null as DisplayError | null }, update: vi.fn(), useActionState: vi.fn(),
}));
vi.mock("../_actions/updateOrganizationMemberRole", () => ({ updateOrganizationMemberRole: state.update }));
// Inspect the production tree/handlers without mounting Base UI. Browser keyboard
// and layout checks are separate; authorization is tested with real guards.
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useActionState: state.useActionState,
  useState: (initial: "ADMIN" | "MEMBER") => [state.role ?? initial, (role: "ADMIN" | "MEMBER") => { state.role = role; }],
}));
type Node = ReactElement<{
  children?: ReactNode; value?: string; name?: string; disabled?: boolean; lang?: string;
  onValueChange?: (value: string | null) => void;
}>;
function nodes(node: ReactNode): Node[] {
  return Children.toArray(node).flatMap(child => isValidElement<Node["props"]>(child)
    ? [child, ...nodes(child.props.children)] : []);
}
function view(locale?: Locale, initialRole: "ADMIN" | "MEMBER" = "ADMIN") {
  return OrganizationMemberRoleForm({ organizationId: "original-org-id", userId: "original-user-id", initialRole, locale });
}
beforeEach(() => {
  vi.resetAllMocks();
  state.role = undefined;
  state.pending = false;
  state.result = { error: null };
  state.update.mockResolvedValue({ error: null });
  state.useActionState.mockImplementation((action, initial) => {
    expect(initial).toEqual({ error: null });
    return [state.result, (data: FormData) => action(state.result, data), state.pending];
  });
});

describe("Organization member role display", () => {
  it.each([
    [undefined, ["Admin", "Member"], "Save", "Saving..."],
    ["en", ["Admin", "Member"], "Save", "Saving..."],
    ["ja", ["管理者", "メンバー"], "保存", "保存中..."],
  ] as const)("keeps option values and translated labels for locale %s", (locale, labels, save, saving) => {
    const tree = nodes(view(locale));
    expect(tree.filter(node => node.type === SelectItem).map(node => [node.props.value, node.props.children]))
      .toEqual([["ADMIN", labels[0]], ["MEMBER", labels[1]]]);
    expect(tree.find(node => node.type === Select)?.props.name).toBe("role");
    expect(tree.find(node => node.type === Select)?.props.value).toBe("ADMIN");
    expect(tree.find(node => node.type === SelectContent)?.props.lang).toBe(locale ?? "en");
    expect(tree.find(node => node.type === Button)?.props.children).toBe(save);
    expect(tree.find(node => node.type === Button)?.props.disabled).toBe(true);
    expect(tree.find(node => node.type === SelectValue)?.props.children).toBe(locale === "ja" ? "管理者" : undefined);
    state.pending = true;
    const pendingButton = nodes(view(locale)).find(node => node.type === Button)!;
    expect(pendingButton.props.children).toBe(saving);
    expect(pendingButton.props.disabled).toBe(true);
  });

  it.each(["en", "ja"] as const)("submits original IDs and MEMBER value to the unchanged Action in %s", async (locale) => {
    nodes(view(locale)).find(node => node.type === Select)!.props.onValueChange!("MEMBER");
    const tree = view(locale);
    expect(nodes(tree).find(node => node.type === Select)?.props.value).toBe("MEMBER");
    expect(nodes(tree).find(node => node.type === Button)?.props.disabled).toBe(false);
    const data = new FormData();
    data.set("role", "MEMBER");
    await tree.props.action(data);
    expect(state.update).toHaveBeenCalledExactlyOnceWith("original-org-id", "original-user-id", { error: null }, data);
    expect(data.get("role")).toBe("MEMBER");
    expect(nodes(tree).find(node => node.type === SelectValue)?.props.children).toBe(locale === "ja" ? "メンバー" : undefined);
  });

  it("keeps MEMBER as the initial internal value and ignores null selection", () => {
    const tree = nodes(view("ja", "MEMBER"));
    const select = tree.find(node => node.type === Select)!;
    expect(select.props.value).toBe("MEMBER");
    select.props.onValueChange!(null);
    expect(state.role).toBeUndefined();
    expect(tree.find(node => node.type === SelectValue)?.props.children).toBe("メンバー");
    expect(tree.find(node => node.type === Button)?.props.disabled).toBe(true);
  });

  describe.each([undefined, "en", "ja", "invalid"])("structured error presentation for %s", value => {
    it.each([
      ["ORGANIZATION_INVALID_ROLE", "Invalid organization role.", "Organizationのロールが無効です。"],
      ["MEMBER_NOT_FOUND", "Member not found.", "メンバーが見つかりません。"],
      ["ORGANIZATION_LAST_ADMIN", "An organization must have at least one admin.", "Organizationには管理者が1人以上必要です。"],
      ["MEMBER_ROLE_UPDATE_FAILED", "Failed to update member role. Please try again.", "メンバーのロールを更新できませんでした。もう一度お試しください。"],
    ] as const)("displays %s with the original English meaning", (code, en, ja) => {
      state.result = { error: { code } };
      const error = nodes(view(value as Locale | undefined)).find(node => node.type === "p")!;
      expect(error.props.children).toBe(value === "ja" ? ja : en);
      expect(error.props.lang).toBe(value === "ja" ? "ja" : "en");
      expect(error.props).not.toHaveProperty("role");
      expect(state.update).not.toHaveBeenCalled();
    });

    it.each([
      "Invalid organization role.", "Member not found.", "An organization must have at least one admin.",
      "Failed to update member role. Please try again.", {}, { code: "UNKNOWN" }, { code: "__proto__" },
      { code: "constructor" }, { code: 42 }, { code: null }, { code: ["MEMBER_NOT_FOUND"] },
      { code: "MEMBER_NOT_FOUND " }, { message: "private diagnostic", cause: "private cause" },
    ])("uses safe English feedback for unexpected data %j without message matching", error => {
      state.result = { error: error as DisplayError };
      const paragraph = nodes(view(value as Locale | undefined)).find(node => node.type === "p")!;
      expect(paragraph.props.children).toBe("Something went wrong. Please try again.");
      expect(paragraph.props.lang).toBe("en");
      expect(state.update).not.toHaveBeenCalled();
    });
  });

  it.each([
    ["ORGANIZATION_INVALID_ROLE", "errors.organizationInvalidRole", "Invalid organization role."],
    ["MEMBER_NOT_FOUND", "errors.memberNotFound", "Member not found."],
    ["ORGANIZATION_LAST_ADMIN", "errors.organizationLastAdmin", "An organization must have at least one admin."],
    ["MEMBER_ROLE_UPDATE_FAILED", "errors.memberRoleUpdateFailed", "Failed to update member role. Please try again."],
  ] as const)("keeps per-key English fallback for %s", (code, key, english) => {
    const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
    const saved = partial[key];
    try {
      delete partial[key];
      state.result = { error: { code } };
      const paragraph = nodes(view("ja")).find(node => node.type === "p")!;
      expect(paragraph.props.children).toBe(english);
      expect(paragraph.props.lang).toBe("ja");
    } finally { partial[key] = saved; }
  });

  it("ignores diagnostic getters and preserves selection, pending locks and bound submission after failure", async () => {
    const failure = { code: "MEMBER_ROLE_UPDATE_FAILED" as const,
      get message(): never { throw Error("private message was read"); },
      get cause(): never { throw Error("private cause was read"); },
      get stack(): never { throw Error("private stack was read"); },
    };
    state.result = { error: failure };
    nodes(view("ja")).find(node => node.type === Select)!.props.onValueChange!("MEMBER");
    state.pending = true;
    const pending = nodes(view("ja"));
    expect(pending.find(node => node.type === Select)?.props.value).toBe("MEMBER");
    expect(pending.find(node => node.type === Button)?.props.disabled).toBe(true);
    state.pending = false;
    const tree = view("en");
    expect(nodes(tree).find(node => node.type === Select)?.props.value).toBe("MEMBER");
    expect(nodes(tree).find(node => node.type === Button)?.props.disabled).toBe(false);
    const data = new FormData(); data.set("role", "MEMBER");
    await tree.props.action(data);
    expect(state.update).toHaveBeenCalledTimes(1);
    expect(state.update.mock.calls[0].slice(0, 2)).toEqual(["original-org-id", "original-user-id"]);
    expect(state.update.mock.calls[0][2]).toBe(state.result);
    expect(state.update.mock.calls[0][3]).toBe(data);
    state.result = { error: null };
    expect(nodes(view("ja")).some(node => node.type === "p")).toBe(false);
    expect(nodes(view("ja")).find(node => node.type === Select)?.props.value).toBe("MEMBER");
  });
});
