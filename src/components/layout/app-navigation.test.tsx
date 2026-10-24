import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppNavigationMenu, AppSidebar } from "./app-navigation";

const state = vi.hoisted(() => ({ pathname: "/", open: false, effect: undefined as (() => (() => void)) | undefined }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string }) => createElement("a", props, children),
}));
// Unit-test our controlled state and links. Browser focus/keyboard/dismissal
// behavior belongs to the real Base UI modal and is not simulated by this double.
vi.mock("@base-ui/react/dialog", () => ({ Dialog: {
  Root: "dialog-root", Trigger: "button", Portal: "dialog-portal", Backdrop: "dialog-backdrop",
  Popup: "dialog-popup", Title: "h2", Close: "dialog-close",
} }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: () => [state.open, (open: boolean) => { state.open = open; }],
  useEffect: (effect: () => (() => void)) => { state.effect = effect; },
}));
type Element = ReactElement<Record<string, unknown> & { children?: ReactNode }>;
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Element["props"]>(node)) return [];
  return [node, ...elements(node.props.children)];
}

beforeEach(() => { state.pathname = "/"; state.open = false; state.effect = undefined; });
afterEach(() => vi.unstubAllGlobals());

describe("Application navigation", () => {
  it.each([
    ["/", "/"], ["/research", "/research"], ["/research/new", "/research"],
    ["/research/id", "/research"], ["/research/id/edit", "/research"],
    ["/settings/organization", "/settings/organization"], ["/settings/workspace", "/settings/workspace"],
  ])("marks exactly the expected destination for %s", (pathname, active) => {
    state.pathname = pathname;
    const html = renderToStaticMarkup(<AppSidebar />);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain(`href="${active}" aria-current="page"`);
    for (const [href, label] of [["/", "Home"], ["/research", "Research"],
      ["/settings/organization", "Organization"], ["/settings/workspace", "Workspace"]]) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(label);
    }
    expect(html).toContain("font-semibold");
    expect(html).toContain("border-primary");
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain("Appearance");
  });

  it("does not mark lookalike route prefixes active", () => {
    state.pathname = "/research-other";
    expect(renderToStaticMarkup(<AppSidebar />)).not.toContain('aria-current="page"');
  });

  it("exposes a Menu trigger, labelled popup and explicit close control", () => {
    const nodes = elements(AppNavigationMenu());
    expect(nodes.find((node) => node.type === "button")?.props.className).toContain("xl:hidden");
    expect(nodes.find((node) => node.type === "h2")?.props.children).toBe("Navigation");
    expect(nodes.find((node) => node.type === "dialog-close")?.props["aria-label"]).toBe("Close navigation");
    expect(nodes.find((node) => node.type === "dialog-popup")?.props.className).toContain("inset-y-0 left-0");
    // Delegate focus containment, Escape and outside dismissal to Base UI.
    expect(nodes[0].props.modal).toBe(true);
    expect(nodes[0].props.disablePointerDismissal).not.toBe(true);
  });

  it("includes Appearance in the overlay Settings group", () => {
    const html = renderToStaticMarkup(<AppNavigationMenu />);
    expect(html).toContain("Settings");
    expect(html).toContain("Appearance");
    expect(html).toContain('data-slot="appearance-placeholder"');
    expect(html).not.toContain('data-slot="select-trigger"');
  });

  it("accepts Base UI open/close events and closes on every navigation link, including the current page", () => {
    const root = AppNavigationMenu();
    const onOpenChange = root.props.onOpenChange as (open: boolean) => void;
    onOpenChange(true);
    expect(state.open).toBe(true);
    const linksComponent = elements(root).find((node) => typeof node.props.onNavigate === "function")!;
    const links = elements((linksComponent.type as (props: typeof linksComponent.props) => ReactNode)(linksComponent.props))
      .filter((node) => typeof node.props.onClick === "function");
    expect(links).toHaveLength(4);
    for (const link of links) {
      onOpenChange(true);
      (link.props.onClick as () => void)();
      expect(state.open).toBe(false);
    }
    onOpenChange(true);
    onOpenChange(false);
    expect(state.open).toBe(false);
  });

  it("releases the modal on desktop resize and removes the media listener on unmount", () => {
    const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const matchMedia = vi.fn(() => media);
    vi.stubGlobal("window", { matchMedia });
    AppNavigationMenu();
    const cleanup = state.effect!();
    expect(matchMedia).toHaveBeenCalledWith("(min-width: 80rem)");
    const listener = media.addEventListener.mock.calls[0][1];
    state.open = true;
    listener();
    expect(state.open).toBe(true);
    media.matches = true;
    listener();
    expect(state.open).toBe(false);
    cleanup();
    expect(media.removeEventListener).toHaveBeenCalledWith("change", listener);
  });
});
