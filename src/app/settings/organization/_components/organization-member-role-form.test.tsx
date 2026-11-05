import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/lib/i18n/locales";
import { Select, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { OrganizationMemberRoleForm } from "./organization-member-role-form";

const state = vi.hoisted(() => ({
  role: undefined as "ADMIN" | "MEMBER" | undefined, pending: false,
  result: { error: null as string | null }, update: vi.fn(), useActionState: vi.fn(),
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

  it.each([undefined, "en", "ja", "invalid"])("preserves existing English Action error text and presentation for %s", (value) => {
    state.result = { error: "An organization must have at least one admin." };
    const error = nodes(view(value as Locale | undefined)).find(node => node.type === "p")!;
    expect(error.props.children).toBe(state.result.error);
    expect(error.props.lang).toBe("en");
    expect(error.props).not.toHaveProperty("role");
    expect(state.update).not.toHaveBeenCalled();
  });
});
