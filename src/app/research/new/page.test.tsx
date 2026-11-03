import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NewResearchPage from "./page";
import { AppShell } from "@/components/layout/app-shell";
import { createResearch } from "@/app/research/_actions/createResearch";

const mocks = vi.hoisted(() => ({ get: vi.fn(), user: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/research/new" }));
vi.mock("@/auth", () => ({ signOut: vi.fn() }));
vi.mock("@/auth/requireUser", () => ({ requireUser: mocks.user }));
vi.mock("@/app/research/_actions/createResearch", () => ({ createResearch: vi.fn() }));

type Element = ReactElement<Record<string, unknown> & { children?: ReactNode }>;
function elements(node: ReactNode): Element[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<Element["props"]>(child)
      ? [child, ...elements(child.props.children)]
      : []);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "reader" });
});

describe("Research creation localization", () => {
  it.each([undefined, "invalid", "en", "ja"])("renders fixed copy through the real Shell for cookie %s", async (value) => {
    mocks.get.mockReturnValue(value === undefined ? undefined : { value });
    const page = await NewResearchPage();
    expect(page.type).toBe(AppShell);
    const html = renderToStaticMarkup(await AppShell(page.props));
    const japanese = value === "ja";
    for (const text of japanese ? [
      "Researchを作成", "新しいResearchを始めて、発見したことを記録しましょう。",
      "タイトル", "説明", 'placeholder="Researchのタイトルを入力"',
      'placeholder="調べたいことを入力してください。"',
    ] : [
      "Create Research", "Start a new research project and document what you discover.",
      "Title", "Description", 'placeholder="Enter a research title"',
      'placeholder="Describe what you want to investigate."',
    ]) expect(html).toContain(text);
    expect(html).toContain(`<main lang="${japanese ? "ja" : "en"}"`);
    expect(html).toContain(`<button type="submit"`);
    expect(html.match(/<select\b[^>]*>/)?.[0]).toContain('disabled=""');
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith("evidence_atlas_locale");
    expect(mocks.user).toHaveBeenCalledTimes(1);
    expect(createResearch).not.toHaveBeenCalled();
  });

  it.each(["en", "ja"] as const)("preserves the native form and Action contract in %s", async (locale) => {
    const page = await NewResearchPage();
    const body = page.props.children(locale);
    const nodes = elements(body);
    const form = nodes.find((node) => node.type === "form")!;
    expect(form.props.action).toBe(createResearch);
    const controls = elements(form.props.children).filter((node) =>
      node.type === "input" || node.type === "textarea" || node.type === "button");
    expect(controls.map(({ type, props }) => ({
      type, id: props.id, name: props.name, inputType: props.type,
      required: props.required, rows: props.rows,
    }))).toEqual([
      { type: "input", id: "title", name: "title", inputType: "text", required: true, rows: undefined },
      { type: "textarea", id: "description", name: "description", inputType: undefined, required: undefined, rows: 6 },
      { type: "button", id: undefined, name: undefined, inputType: "submit", required: undefined, rows: undefined },
    ]);
    expect(nodes.filter((node) => node.type === "label").map((node) => node.props.htmlFor))
      .toEqual(["title", "description"]);
    for (const control of controls) {
      for (const prop of ["value", "defaultValue", "onChange", "disabled", "maxLength", "minLength"])
        expect(control.props).not.toHaveProperty(prop);
    }
    expect(controls[2].props.children).toBe(locale === "ja" ? "Researchを作成" : "Create Research");
  });
});
