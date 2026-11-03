import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/lib/i18n/locales";
import { WorkspaceSelector } from "./workspace-selector";
import { SelectItem } from "@/components/ui/select";

const state = vi.hoisted(() => ({
  pending: false, task: undefined as Promise<void> | undefined, switchWorkspace: vi.fn(),
}));
vi.mock("@/workspace/switchWorkspace", () => ({ switchWorkspace: state.switchWorkspace }));
// Exercise the production handler; real scheduling/keyboard behavior is checked in Review.
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useTransition: () => [state.pending, (action: () => Promise<void>) => {
    state.pending = true;
    state.task = action().finally(() => { state.pending = false; });
  }],
}));

type Node = ReactElement<{ children?: ReactNode; placeholder?: string; value?: string }>;
function descendants(node: ReactNode): Node[] {
  return Children.toArray(node).flatMap((child) => isValidElement<Node["props"]>(child)
    ? [child, ...descendants(child.props.children)] : []);
}
const workspaces = [
  { id: "workspace-one", name: "Original Workspace 日本語" },
  { id: "workspace-two", name: "Other Workspace 原文" },
];
function view(locale?: Locale, currentWorkspaceId = workspaces[0].id) {
  return WorkspaceSelector({ workspaces, currentWorkspaceId, locale });
}
beforeEach(() => {
  vi.resetAllMocks();
  state.pending = false;
  state.task = undefined;
  state.switchWorkspace.mockResolvedValue(undefined);
});

describe("Workspace Selector localization", () => {
  it.each([
    [undefined, "Select workspace"], ["en", "Select workspace"], ["ja", "Workspaceを選択"],
  ] as const)("supplies the %s placeholder to the existing Select primitive", (locale, text) => {
    // A null selection exposes the primitive's placeholder. Production routes
    // supply an authorized current ID and normally show the original name.
    const html = renderToStaticMarkup(cloneElement(view(locale, "missing-id"), { value: null }));
    expect(html).toContain(text);
    expect(descendants(view(locale)).find(node => node.props.placeholder)?.props.placeholder).toBe(text);
    expect(state.switchWorkspace).not.toHaveBeenCalled();
  });

  it.each(["en", "ja"] as const)("preserves names, selected ID, item values and styling in %s", (locale) => {
    const tree = view(locale);
    expect(tree.props.value).toBe("workspace-one");
    expect(tree.props.disabled).toBe(false);
    const nodes = descendants(tree);
    expect(nodes.filter(node => node.type === SelectItem).map(node => [node.props.value, node.props.children]))
      .toEqual(workspaces.map(({ id, name }) => [id, name]));
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Original Workspace 日本語");
    expect(html).toContain("sm:w-56");
    expect(html).not.toContain("Workspaceを選択");
    expect(renderToStaticMarkup(view(locale, "workspace-two"))).toContain("Other Workspace 原文");
  });

  it.each(["en", "ja"] as const)("passes only the selected original ID to the Action in %s", async (locale) => {
    view(locale).props.onValueChange("workspace-two");
    expect(state.switchWorkspace).toHaveBeenCalledExactlyOnceWith("workspace-two");
    expect(view(locale).props.disabled).toBe(true);
    await state.task;
    expect(view(locale, "workspace-two").props.value).toBe("workspace-two");
    expect(view(locale, "workspace-two").props.disabled).toBe(false);
  });

  it.each([null, "", "workspace-one"])("ignores empty or unchanged selection %s", (value) => {
    view("ja").props.onValueChange(value);
    expect(state.switchWorkspace).not.toHaveBeenCalled();
    expect(state.task).toBeUndefined();
  });

  it("keeps the existing error propagation and selected value", async () => {
    const error = new Error("Membership denied");
    state.switchWorkspace.mockRejectedValue(error);
    view("ja").props.onValueChange("workspace-two");
    await expect(state.task).rejects.toBe(error);
    expect(view("ja").props.value).toBe("workspace-one");
    expect(view("ja").props.disabled).toBe(false);
  });
});
