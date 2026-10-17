import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Page } from "@playwright/test";
import Home from "../src/app/page";
import { fixture } from "./c2-playwright-policy.ts";

const smoke = vi.hoisted(() => {
  const cases = new Map<string, (args: { page: Page }) => Promise<void>>();
  const test = Object.assign((title: string, body: (args: { page: Page }) => Promise<void>) => cases.set(title, body), {
    step: async (_title: string, body: () => Promise<unknown>) => body(),
  });
  return { cases, test };
});
vi.mock("../e2e-c2/fixtures.ts", () => ({ test: smoke.test }));
import "../e2e-c2/authenticated-smoke.spec.ts";

vi.mock("@/lib/deployment-mode", () => ({ isPublicDemoMode: () => false }));
vi.mock("@/auth/requireUser", () => ({ requireUser: async () => ({ id: "offline-user" }) }));
vi.mock("@/workspace/requireCurrentWorkspace", () => ({ requireCurrentWorkspace: async () => fixture.workspace }));
vi.mock("@/workspace/getAccessibleWorkspaces", () => ({ getAccessibleWorkspaces: async () => [fixture.workspace] }));
vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => null }));
vi.mock("@/components/workspace/workspace-selector", () => ({ WorkspaceSelector: () => null }));
vi.mock("@/lib/date", () => ({ formatDate: () => "offline date" }));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: Object.fromEntries(
  ["Research", "Source", "Finding", "Tag"].map((model) => [model, {
    where: () => ({ all: async () => model === "Tag" ? [] : [fixture[model.toLowerCase()]] }),
  }]),
) } } }));

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return [];
    return [child, ...elements(child.props.children as ReactNode)];
  });
}

async function renderedSummary() {
  const summary = elements(await Home()).find((element) =>
    element.type === "section" && element.props["aria-labelledby"] === "workspace-summary-heading");
  expect(summary).toBeDefined();
  const text = (element: ReactNode) => renderToStaticMarkup(element).replace(/<[^>]*>/g, "");
  return {
    text: text(summary),
    paragraphs: elements(summary).filter((element) => element.type === "p").map(text),
  };
}

// Supply only rendered text at the locator protocol boundary. The spec callback
// and Playwright's toHaveText matcher are real; no browser or C2 state is used.
function offlinePage(summary: { text: string; paragraphs: string[] }): Page {
  const normalize = (text: string) => text.trim().replace(/\s+/g, " ");
  const locator = (paragraphs = false) => ({
    _apiName: "Locator", toString: () => "offline summary",
    getByRole: (role: string) => { expect(role).toBe("paragraph"); return locator(true); },
    _expect: async (expression: string, options: { expectedText?: { string?: string; regexSource?: string; regexFlags?: string }[] }) => {
      if (expression === "to.be.visible") return { matches: true };
      const received = paragraphs ? summary.paragraphs : [summary.text];
      const expected = options.expectedText ?? [];
      const matches = received.length === expected.length && expected.every((item, index) => item.regexSource !== undefined
        ? new RegExp(item.regexSource, item.regexFlags).test(received[index])
        : normalize(received[index]) === normalize(item.string ?? ""));
      return { matches, received: { value: paragraphs ? received : received[0] }, log: [] };
    },
  });
  return {
    goto: async () => ({ status: () => 200 }), url: () => "http://localhost:3001/",
    getByRole: () => locator(),
  } as unknown as Page;
}

describe("C2 Workspace summary against actual server rendering (offline)", () => {
  it("does not invent whitespace between adjacent elements and preserves all four label/count pairs", async () => {
    const { text, paragraphs } = await renderedSummary();
    const oldAssertion = /Workspace Summary\s+Research\s+1\s+Sources\s+1\s+Findings\s+1\s+Tags\s+0/;
    expect(oldAssertion.test(text)).toBe(false);
    expect(paragraphs).toEqual(["Research", "1", "Sources", "1", "Findings", "1", "Tags", "0"]);
  });

  it("runs the actual Smoke A assertions against the rendered label/count text", async () => {
    const scenario = smoke.cases.get("A: authenticated Workspace overview");
    expect(scenario).toBeDefined();
    await scenario!({ page: offlinePage(await renderedSummary()) });
  });

  it("keeps the actual Smoke A assertions strict about counts and extra paragraphs", async () => {
    const scenario = smoke.cases.get("A: authenticated Workspace overview")!;
    const summary = await renderedSummary();
    for (const paragraphs of [
      summary.paragraphs.map((value, index) => index === 1 ? "10" : value),
      [...summary.paragraphs, "unexpected"],
    ]) {
      await expect(scenario({ page: offlinePage({ ...summary, paragraphs }) })).rejects.toThrow();
    }
  });
});
