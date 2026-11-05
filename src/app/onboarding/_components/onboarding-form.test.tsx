import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/lib/i18n/locales";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OnboardingForm } from "./onboarding-form";

const state = vi.hoisted(() => ({
  pending: false, result: { error: null as string | null }, create: vi.fn(), useActionState: vi.fn(),
}));
vi.mock("../_actions/createInitialWorkspace", () => ({ createInitialWorkspace: state.create }));
// Replace only the Action hook/I/O; keep the actual Input and Button markup.
// This checks production props/handlers, not real React transition scheduling.
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(), useActionState: state.useActionState,
}));
type Node = ReactElement<{
  children?: ReactNode; id?: string; name?: string; htmlFor?: string;
  placeholder?: string; required?: boolean; disabled?: boolean; lang?: string;
  value?: string; defaultValue?: string; minLength?: number; maxLength?: number;
}>;
function nodes(node: ReactNode): Node[] {
  return Children.toArray(node).flatMap(child => isValidElement<Node["props"]>(child)
    ? [child, ...nodes(child.props.children)] : []);
}
beforeEach(() => {
  vi.resetAllMocks();
  state.pending = false;
  state.result = { error: null };
  state.create.mockResolvedValue({ error: null });
  state.useActionState.mockImplementation((action, initial) => {
    expect(initial).toEqual({ error: null });
    return [state.result, (data: FormData) => action(state.result, data), state.pending];
  });
});

describe("Onboarding form localization", () => {
  it.each([undefined, "en", "ja"] as const)("preserves inputs, labels and idle/pending behavior in %s", (locale) => {
    const tree = OnboardingForm({ locale });
    const elements = nodes(tree);
    const labels = elements.filter(node => node.type === "label");
    expect(labels.map(node => [node.props.htmlFor, node.props.children])).toEqual([
      ["organizationName", locale === "ja" ? "Organization名" : "Organization name"],
      ["workspaceName", locale === "ja" ? "Workspace名" : "Workspace name"],
    ]);
    const inputs = elements.filter(node => node.type === Input);
    expect(inputs.map(node => [node.props.id, node.props.name, node.props.placeholder])).toEqual([
      ["organizationName", "organizationName", "Acme Research"], ["workspaceName", "workspaceName", "Research"],
    ]);
    for (const input of inputs) {
      expect(input.props.required).toBe(true);
      expect(input.props.disabled).toBe(false);
      for (const prop of ["value", "defaultValue", "minLength", "maxLength"] as const) expect(input.props[prop]).toBeUndefined();
    }
    expect(elements.find(node => node.type === Button)?.props.disabled).toBe(false);
    expect(elements.find(node => node.type === Button)?.props.children).toBe(locale === "ja" ? "Workspaceを作成" : "Create workspace");
    const html = renderToStaticMarkup(tree);
    expect(html).toContain('for="organizationName"');
    expect(html).toContain('id="organizationName"');
    expect(html).not.toContain("<select");
    state.pending = true;
    const pending = OnboardingForm({ locale });
    const controls = nodes(pending).filter(node => node.type === Input || node.type === Button);
    expect(controls).toHaveLength(3);
    expect(controls.every(node => node.props.disabled === true)).toBe(true);
    expect(renderToStaticMarkup(pending)).toContain(locale === "ja" ? "作成中..." : "Creating...");
  });

  it("defaults to the existing English UI without props", () => {
    expect(renderToStaticMarkup(OnboardingForm())).toContain("Create workspace");
  });

  it.each(["en", "ja"] as const)("passes the original FormData to the unchanged Action in %s", async (locale: Locale) => {
    const tree = OnboardingForm({ locale });
    const data = new FormData();
    data.set("organizationName", "  Original Organization 原文  ");
    data.set("workspaceName", "Original Workspace / 日本語");
    await tree.props.action(data);
    expect(state.useActionState).toHaveBeenCalledExactlyOnceWith(state.create, { error: null });
    expect(state.create).toHaveBeenCalledExactlyOnceWith({ error: null }, data);
    expect([...data]).toEqual([
      ["organizationName", "  Original Organization 原文  "], ["workspaceName", "Original Workspace / 日本語"],
    ]);
  });

  describe.each([undefined, "en", "ja", "invalid"])("Action errors for locale %s", (value) => {
    it.each([
      "Enter an organization name and workspace name.",
      "Failed to create your workspace. Please try again.",
    ])("keeps the Action error unchanged: %s", (error) => {
      state.result = { error };
      const tree = OnboardingForm({ locale: value as Locale | undefined });
      expect(nodes(tree).find(node => node.type === "p")?.props.children).toBe(error);
      expect(nodes(tree).find(node => node.type === "p")?.props.lang).toBe("en");
      expect(nodes(tree).find(node => node.type === "p")?.props).not.toHaveProperty("role");
      expect(renderToStaticMarkup(tree)).toContain(error);
      expect(state.create).not.toHaveBeenCalled();
    });
  });
});
