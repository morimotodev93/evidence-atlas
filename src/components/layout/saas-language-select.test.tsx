import { isValidElement, type ChangeEvent, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Locale } from "@/lib/i18n/locales";
import { SaasLanguageSelect } from "./saas-language-select";

const state = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, pending: false,
  task: undefined as Promise<void> | undefined,
  pathname: "/" as string | null,
  save: vi.fn(), push: vi.fn(), replace: vi.fn(), refresh: vi.fn(),
}));
vi.mock("@/lib/i18n/set-saas-locale", () => ({ setSaasLocale: state.save }));
vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ push: state.push, replace: state.replace, refresh: state.refresh }),
}));
// Exercise production event handlers with the same small hook-double approach
// as the existing AI Panel tests. This does not mount React or test scheduling,
// native keyboard behavior, RSC merging or browser state preservation.
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useId: () => "saas-language",
  useState<T>(initial: T) {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = initial;
    return [state.slots[index], (next: T) => { state.slots[index] = next; }];
  },
  useRef<T>(initial: T) {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = { current: initial };
    return state.slots[index];
  },
  useTransition: () => [state.pending, (action: () => Promise<void>) => {
    state.pending = true;
    state.task = action().finally(() => { state.pending = false; });
  }],
}));

type Element = ReactElement<Record<string, unknown> & { children?: ReactNode }>;
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Element["props"]>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function view(locale: Locale = "en") {
  state.cursor = 0;
  return elements(SaasLanguageSelect({ locale }));
}
function select(locale: Locale = "en") {
  return view(locale).find((node) => node.type === "select")!;
}
function change(value: string, locale: Locale = "en") {
  const handler = select(locale).props.onChange as (event: ChangeEvent<HTMLSelectElement>) => void;
  handler({ target: { value } } as ChangeEvent<HTMLSelectElement>);
}

beforeEach(() => {
  vi.resetAllMocks();
  state.slots = []; state.cursor = 0; state.pending = false;
  state.task = undefined; state.pathname = "/";
});
afterEach(() => vi.unstubAllGlobals());

describe("SaaS language select", () => {
  it.each(["en", "ja"] as const)("starts with the server-provided %s locale and an accessible native select", (locale) => {
    const nodes = view(locale);
    expect(select(locale).props.value).toBe(locale);
    expect(select(locale).props.disabled).toBe(false);
    expect(nodes.find((node) => node.type === "label")?.props.htmlFor).toBe(select(locale).props.id);
    expect(nodes.filter((node) => node.type === "option").map((node) => node.props.children)).toEqual(["English", "日本語"]);
    expect(state.save).not.toHaveBeenCalled();
  });

  it.each([["en", "ja"], ["ja", "en"]] as const)("saves %s → %s and accepts updated server props without navigating", async (previous, next) => {
    const location = { href: "https://example.test/?query=a&query=b#section", assign: vi.fn(), reload: vi.fn() };
    vi.stubGlobal("window", { location });
    change(next, previous);
    expect(state.save).toHaveBeenCalledExactlyOnceWith(next);
    expect(select(previous).props.disabled).toBe(true);
    await state.task;
    expect(select(next).props.value).toBe(next);
    expect(select(next).props.disabled).toBe(false);
    expect(location.href).toBe("https://example.test/?query=a&query=b#section");
    for (const navigate of [location.assign, location.reload, state.push, state.replace, state.refresh]) {
      expect(navigate).not.toHaveBeenCalled();
    }
    expect(view(next).some((node) => node.type === "a" || node.type === "form")).toBe(false);
  });

  it("blocks repeated events before rerender and throughout a pending save", async () => {
    let finish!: () => void;
    state.save.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    const onChange = select().props.onChange as (event: ChangeEvent<HTMLSelectElement>) => void;
    const event = { target: { value: "ja" } } as ChangeEvent<HTMLSelectElement>;
    onChange(event);
    onChange(event); // Same stale closure, before disabled has rendered.
    change("ja");
    expect(state.save).toHaveBeenCalledTimes(1);
    expect(select().props.value).toBe("ja");
    expect(select().props.disabled).toBe(true);
    expect(view()[0].props["aria-busy"]).toBe(true);
    finish();
    await state.task;
    expect(select("ja").props.disabled).toBe(false);
  });

  it.each(["en", "ja"] as const)("restores %s and announces a failed save, then permits retry", async (locale) => {
    const next = locale === "en" ? "ja" : "en";
    state.save.mockRejectedValueOnce(new Error("Private server diagnostics"));
    change(next, locale);
    await state.task;
    expect(select(locale).props.value).toBe(locale);
    expect(select(locale).props.disabled).toBe(false);
    expect(select(locale).props["aria-describedby"]).toBe("saas-language-error");
    expect(view(locale).find((node) => node.props.role === "alert")?.props.children).toBe("Could not save language. Try again.");
    change(next, locale);
    await state.task;
    expect(state.save).toHaveBeenCalledTimes(2);
    expect(view(next).some((node) => node.props.role === "alert")).toBe(false);
  });

  it.each(["en", "fr", "ja-JP", "JA", ""])("ignores unchanged or unsupported selection %s", (value) => {
    change(value);
    expect(state.save).not.toHaveBeenCalled();
  });

  it.each([
    "/research", "/research/new", "/research/id", "/research/id/edit",
    "/settings/workspace", "/settings/organization", "/onboarding",
    "/demo", "/ja/demo", "/unknown", null,
  ])("prevents cookie mutation and server rerender on unverified route %s", (pathname) => {
    state.pathname = pathname;
    const nodes = view("ja");
    expect(select("ja").props.disabled).toBe(true);
    expect(select("ja").props.value).toBe("ja");
    expect(select("ja").props["aria-describedby"]).toBe("saas-language-restriction");
    expect(nodes.find((node) => node.props.id === "saas-language-restriction")).toBeDefined();
    expect(select("ja").props.title).toContain("unsaved input and AI conversations");
    change("en", "ja");
    expect(state.save).not.toHaveBeenCalled();
    expect(state.task).toBeUndefined();
  });
});
