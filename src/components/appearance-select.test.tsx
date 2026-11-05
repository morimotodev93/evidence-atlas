import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppearanceSelect } from "./appearance-select";
import { AppSidebar, AppNavigationMenu } from "./layout/app-navigation";
import DemoLayout from "@/app/demo/layout";
import type { Locale } from "@/lib/i18n/locales";
import { SelectContent } from "@/components/ui/select";
import { ja } from "@/lib/i18n/dictionaries/ja";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("@base-ui/react/dialog", () => ({ Dialog: {
  Root: "dialog-root", Trigger: "button", Portal: "dialog-portal", Backdrop: "dialog-backdrop",
  Popup: "dialog-popup", Title: "h2", Close: "dialog-close",
} }));

const state = vi.hoisted(() => ({ mounted: false, theme: undefined as string | undefined, setTheme: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => state }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useId: () => "appearance-label",
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => boolean, getServerSnapshot: () => boolean) =>
    state.mounted ? getSnapshot() : getServerSnapshot(),
}));

beforeEach(() => { state.mounted = false; state.theme = undefined; state.setTheme.mockReset(); });

describe("Appearance selector", () => {
  it("keeps Japanese boundaries when an Appearance entry falls back to English", () => {
    const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
    const saved = partial["appearance.dark"];
    try {
      delete partial["appearance.dark"];
      state.mounted = true;
      state.theme = "dark";
      const tree = AppearanceSelect({ locale: "ja" });
      expect(tree.props.lang).toBe("ja");
      expect(tree.props.children[1].props.items[1]).toEqual({ value: "dark", label: "Dark" });
      expect(tree.props.children[1].props.children[1].props.lang).toBe("ja");
      expect(renderToStaticMarkup(tree)).toContain(">Dark<");
    } finally { partial["appearance.dark"] = saved; }
  });

  it.each([undefined, "en", "ja", "invalid"])("marks the control and portaled content with resolved language for %s", (value) => {
    const locale = value as Locale | undefined;
    const expected = value === "ja" ? "ja" : "en";
    expect(AppearanceSelect({ locale }).props.lang).toBe(expected);
    state.mounted = true;
    const tree = AppearanceSelect({ locale });
    expect(tree.props.lang).toBe(expected);
    const content = tree.props.children[1].props.children[1];
    expect(content.type).toBe(SelectContent);
    expect(content.props.lang).toBe(expected);
    expect(content.props.align).toBe("start");
  });

  it.each(["en", "ja"] as const)("uses existing %s labels and preserves theme values and changes", (locale) => {
    const initial = renderToStaticMarkup(<AppearanceSelect locale={locale} />);
    expect(initial).toContain(locale === "ja" ? "外観" : "Appearance");
    expect(initial).toContain(locale === "ja" ? "テーマ" : "Theme");
    state.mounted = true;
    state.theme = "dark";
    const selector = AppearanceSelect({ locale }).props.children[1];
    expect(selector.props.items).toEqual(locale === "ja" ? [
      { value: "light", label: "ライト" }, { value: "dark", label: "ダーク" }, { value: "system", label: "システム" },
    ] : [
      { value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" },
    ]);
    expect(selector.props.value).toBe("dark");
    const mounted = renderToStaticMarkup(<AppearanceSelect locale={locale} />);
    expect(mounted).toContain(locale === "ja" ? ">ダーク<" : ">Dark<");
    expect(mounted).toContain('aria-labelledby="appearance-label"');
    for (const value of ["light", "dark", "system", "invalid", null]) selector.props.onValueChange(value);
    expect(state.setTheme.mock.calls).toEqual([["light"], ["dark"], ["system"]]);
  });

  it("renders the same static placeholder for SSR and the initial hydration snapshot regardless of preference", () => {
    const server = renderToStaticMarkup(<AppearanceSelect />);
    state.theme = "dark";
    expect(renderToStaticMarkup(<AppearanceSelect />)).toBe(server);
    expect(server).not.toMatch(/<button|<input|<select|role="combobox"|data-slot="select-trigger"/);
    expect(server).toContain('data-slot="appearance-placeholder"');
    expect(server).toContain('aria-hidden="true"');
    expect(server).toContain('id="appearance-label"');
    expect(server).toContain("Appearance");
    expect(server).toContain("Theme");
  });

  it.each(["light", "dark", "system"])("displays the restored %s preference and changes only valid preferences", (theme) => {
    state.mounted = true;
    state.theme = theme;
    const selector = AppearanceSelect({}).props.children[1];
    const html = renderToStaticMarkup(<AppearanceSelect />);
    expect(html).toContain('role="combobox"');
    expect(html).not.toContain('data-slot="appearance-placeholder"');
    expect(html.match(/<button\b[^>]*>/)?.[0]).not.toContain('disabled=""');
    expect(html).toContain(`>${theme[0].toUpperCase()}${theme.slice(1)}<`);
    // Both branches reserve the same width and height; visual zoom/reflow needs a browser.
    for (const size of ["h-9", "min-h-9", "w-28", "shrink-0"]) {
      expect(selector.props.children[0].props.className).toContain(size);
      state.mounted = false;
      expect(renderToStaticMarkup(<AppearanceSelect />)).toContain(size);
      state.mounted = true;
    }
    expect(selector.props.value).toBe(theme);
    expect(selector.props.disabled).toBe(false);
    expect(selector.props.items).toEqual([
      { value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" },
    ]);
    for (const value of ["light", "dark", "system"]) selector.props.onValueChange(value);
    expect(state.setTheme.mock.calls).toEqual([["light"], ["dark"], ["system"]]);
    for (const value of [null, "old", "dark light"]) selector.props.onValueChange(value);
    expect(state.setTheme).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["Sidebar", () => <AppSidebar />],
    ["Mobile Navigation", () => <AppNavigationMenu />],
    ["Demo Header", () => <DemoLayout><main>Demo content</main></DemoLayout>],
  ] as const)("mounts the shared selector after a static placeholder in %s", (_name, render) => {
    const initial = renderToStaticMarkup(render());
    expect(initial).toContain('data-slot="appearance-placeholder"');
    expect(initial).not.toContain('data-slot="select-trigger"');
    state.mounted = true;
    state.theme = "dark";
    const mounted = renderToStaticMarkup(render());
    expect(mounted).not.toContain('data-slot="appearance-placeholder"');
    expect(mounted).toContain('data-slot="select-trigger"');
    expect(mounted).toContain('role="combobox"');
    expect(mounted).toContain(">Dark<");
  });
});
