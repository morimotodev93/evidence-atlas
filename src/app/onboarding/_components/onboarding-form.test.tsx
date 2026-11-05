import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/lib/i18n/locales";
import type { DisplayError } from "@/lib/i18n/errors";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OnboardingForm } from "./onboarding-form";

const state = vi.hoisted(() => ({
  pending: false, result: { error: null as DisplayError | null }, create: vi.fn(), useActionState: vi.fn(),
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
      ["ONBOARDING_INVALID_INPUT", "Enter an organization name and workspace name.", "Organization名とWorkspace名を入力してください。"],
      ["ONBOARDING_CREATE_FAILED", "Failed to create your workspace. Please try again.", "Workspaceを作成できませんでした。もう一度お試しください。"],
    ] as const)("renders structured %s with equivalent meaning", (code, en, ja) => {
      state.result = { error: { code } };
      const tree = OnboardingForm({ locale: value as Locale | undefined });
      expect(nodes(tree).find(node => node.type === "p")?.props.children).toBe(value === "ja" ? ja : en);
      expect(nodes(tree).find(node => node.type === "p")?.props.lang).toBe(value === "ja" ? "ja" : "en");
      expect(nodes(tree).find(node => node.type === "p")?.props).not.toHaveProperty("role");
      expect(renderToStaticMarkup(tree)).toContain(value === "ja" ? ja : en);
      expect(state.create).not.toHaveBeenCalled();
    });

    it.each([
      "private-legacy-error", "Enter an organization name and workspace name.",
      "Failed to create your workspace. Please try again.", {}, { code: "UNKNOWN" }, { code: "__proto__" },
      { code: "constructor" }, { code: 42 }, { code: null }, { code: ["ONBOARDING_CREATE_FAILED"] },
      { code: "onboarding_create_failed" }, { code: "ONBOARDING_CREATE_FAILED " },
      { message: "private exception", stack: "private stack", cause: "private cause" },
    ])("uses safe English fallback for unexpected error data %j", (error) => {
      state.result = { error: error as DisplayError };
      const tree = OnboardingForm({ locale: value as Locale | undefined });
      const paragraph = nodes(tree).find(node => node.type === "p")!;
      expect(paragraph.props.children).toBe("Something went wrong. Please try again.");
      expect(paragraph.props.lang).toBe("en");
      expect(renderToStaticMarkup(tree)).not.toMatch(/private|UNKNOWN|__proto__|constructor|onboarding_create_failed/);
      expect(state.create).not.toHaveBeenCalled();
    });
  });

  it.each(["ONBOARDING_INVALID_INPUT", "ONBOARDING_CREATE_FAILED"] as const)("ignores diagnostics alongside known code %s and preserves pending/submission state", async code => {
    const diagnostics = { code,
      get message(): never { throw new Error("private message was read"); },
      get cause(): never { throw new Error("private cause was read"); },
      get stack(): never { throw new Error("private stack was read"); },
    };
    state.result = { error: diagnostics };
    state.pending = true;
    const pending = OnboardingForm({ locale: "ja" });
    expect(nodes(pending).filter(node => node.type === Input || node.type === Button).every(node => node.props.disabled)).toBe(true);
    expect(nodes(pending).find(node => node.type === "p")?.props.lang).toBe("ja");
    state.pending = false;
    const tree = OnboardingForm({ locale: "ja" });
    const data = new FormData();
    data.set("organizationName", "  Original Organization 原文  ");
    data.set("workspaceName", "Original Workspace / 日本語");
    await tree.props.action(data);
    expect(state.create).toHaveBeenCalledTimes(1);
    expect(state.create.mock.calls[0][0]).toBe(state.result);
    expect(state.create.mock.calls[0][1]).toBe(data);
    expect(data.get("organizationName")).toBe("  Original Organization 原文  ");
    expect(nodes(tree).filter(node => node.type === Input || node.type === Button).every(node => node.props.disabled === false)).toBe(true);
  });

  it.each([
    ["ONBOARDING_INVALID_INPUT", "errors.onboardingInvalidInput", "Enter an organization name and workspace name."],
    ["ONBOARDING_CREATE_FAILED", "errors.onboardingCreateFailed", "Failed to create your workspace. Please try again."],
  ] as const)("falls back per missing Japanese dictionary entry for %s", (code, key, english) => {
    const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
    const saved = partial[key];
    try {
      delete partial[key];
      state.result = { error: { code } };
      const tree = OnboardingForm({ locale: "ja" });
      expect(nodes(tree).find(node => node.type === "p")?.props.children).toBe(english);
      expect(nodes(tree).find(node => node.type === "p")?.props.lang).toBe("ja");
    } finally { partial[key] = saved; }
  });
});
