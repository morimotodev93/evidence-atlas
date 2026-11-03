import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ResearchEditPage from "./page";
import { AppShell } from "@/components/layout/app-shell";
import { updateResearch } from "@/app/research/_actions/updateResearch";
import { research } from "@/lib/demo/test-fixtures";

const mocks = vi.hoisted(() => ({ get: vi.fn(), user: vi.fn(), access: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/research/research-id/edit", notFound: vi.fn() }));
vi.mock("@/auth", () => ({ signOut: vi.fn() }));
vi.mock("@/auth/requireUser", () => ({ requireUser: mocks.user }));
vi.mock("@/auth/requireResearchAccess", async (original) => ({
  ...await original<typeof import("@/auth/requireResearchAccess")>(),
  requireResearchAccess: mocks.access,
}));
vi.mock("@/app/research/_actions/updateResearch", () => ({ updateResearch: vi.fn() }));
// The access helper's real authorization chain is covered by researchPages.test.ts.
// Its import still needs a DB double; no query or write is made in this suite.
vi.mock("@/prisma/db", () => ({ db: {} }));

const originalTitle = 'Original Research 日本語 <Title> & "quoted"';
const originalDescription = 'Original description\n日本語 <text> & "quoted"';
type Element = ReactElement<Record<string, unknown> & { children?: ReactNode }>;
function elements(node: ReactNode): Element[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<Element["props"]>(child)
      ? [child, ...elements(child.props.children)]
      : []);
}
const page = () => ResearchEditPage({ params: Promise.resolve({ id: research.id }) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "reader" });
  mocks.access.mockResolvedValue({ ...research, title: originalTitle, description: originalDescription });
});

describe("Research editing localization", () => {
  it.each([undefined, "invalid", "en", "ja"])("renders fixed copy and original data through the real Shell for cookie %s", async (value) => {
    mocks.get.mockReturnValue(value === undefined ? undefined : { value });
    const result = await page();
    expect(result.type).toBe(AppShell);
    const html = renderToStaticMarkup(await AppShell(result.props));
    const japanese = value === "ja";
    for (const text of japanese ? [
      "← Researchに戻る", "Researchを編集", "Researchのタイトルと説明を更新します。",
      "タイトル", "説明", "キャンセル", "変更を保存",
    ] : [
      "← Back to Research", "Edit Research", "Update the research title and description.",
      "Title", "Description", "Cancel", "Save Changes",
    ]) expect(html).toContain(text);
    expect(html).toContain('value="Original Research 日本語 &lt;Title&gt; &amp; &quot;quoted&quot;"');
    expect(html).toContain('Original description\n日本語 &lt;text&gt; &amp; &quot;quoted&quot;');
    expect(html).toContain(`<main lang="${japanese ? "ja" : "en"}"`);
    expect(html.match(new RegExp(`href="/research/${research.id}"`, "g"))).toHaveLength(2);
    expect(html.match(/<select\b[^>]*>/)?.[0]).toContain('disabled=""');
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith("evidence_atlas_locale");
    expect(mocks.user).toHaveBeenCalledTimes(1);
    expect(mocks.access).toHaveBeenCalledExactlyOnceWith("reader", research.id);
    expect(updateResearch).not.toHaveBeenCalled();
  });

  it.each(["en", "ja"] as const)("preserves native inputs, links and the bound Action in %s", async (locale) => {
    const result = await page();
    const nodes = elements(result.props.children(locale));
    const form = nodes.find((node) => node.type === "form")!;
    const controls = elements(form.props.children).filter((node) =>
      node.type === "input" || node.type === "textarea" || node.type === "button");
    expect(controls.map(({ type, props }) => ({
      type, id: props.id, name: props.name, inputType: props.type,
      required: props.required, rows: props.rows, defaultValue: props.defaultValue,
    }))).toEqual([
      { type: "input", id: "title", name: "title", inputType: "text", required: true, rows: undefined, defaultValue: originalTitle },
      { type: "textarea", id: "description", name: "description", inputType: undefined, required: undefined, rows: 6, defaultValue: originalDescription },
      { type: "button", id: undefined, name: undefined, inputType: "submit", required: undefined, rows: undefined, defaultValue: undefined },
    ]);
    expect(nodes.filter((node) => node.type === "label").map((node) => node.props.htmlFor))
      .toEqual(["title", "description"]);
    for (const control of controls) {
      for (const prop of ["value", "onChange", "disabled", "maxLength", "minLength"])
        expect(control.props).not.toHaveProperty(prop);
    }
    const links = nodes.filter((node) => node.type === Link);
    expect(links.map((node) => ({ href: node.props.href, text: node.props.children }))).toEqual([
      { href: `/research/${research.id}`, text: locale === "ja" ? "← Researchに戻る" : "← Back to Research" },
      { href: `/research/${research.id}`, text: locale === "ja" ? "キャンセル" : "Cancel" },
    ]);
    expect(controls[2].props.children).toBe(locale === "ja" ? "変更を保存" : "Save Changes");
    const data = new FormData();
    data.set("title", originalTitle);
    data.set("description", originalDescription);
    // Invoke only the mocked Action to verify bind's ID and unchanged FormData.
    await (form.props.action as (data: FormData) => Promise<void>)(data);
    expect(updateResearch).toHaveBeenCalledExactlyOnceWith(research.id, data);
    expect(vi.mocked(updateResearch).mock.calls[0][1]).toBe(data);
    expect([...data.entries()]).toEqual([["title", originalTitle], ["description", originalDescription]]);
  });

  it.each(["en", "ja"] as const)("retains an empty initial description for null in %s", async (locale) => {
    mocks.access.mockResolvedValue({ ...research, description: null });
    const result = await page();
    const textarea = elements(result.props.children(locale)).find((node) => node.type === "textarea")!;
    expect(textarea.props.defaultValue).toBe("");
    expect(renderToStaticMarkup(result.props.children(locale))).toMatch(/<textarea\b[^>]*><\/textarea>/);
    expect(updateResearch).not.toHaveBeenCalled();
  });
});
