import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import type { Locator, Page } from "@playwright/test";
import { C2_ORIGIN, RESEARCH_PATH } from "./c2-playwright-policy.ts";
import { HISTORY_PREVIEW, type ConversationMocks } from "../e2e-c2/conversation-mocks.ts";

const chat = vi.hoisted(() => {
  const cases = new Map<string, (args: { page: Page; conversationMocks: ConversationMocks }) => Promise<void>>();
  const test = Object.assign((title: string, body: (args: { page: Page; conversationMocks: ConversationMocks }) => Promise<void>) => cases.set(title, body), {
    step: async (_title: string, body: () => Promise<unknown>) => body(),
  });
  return { cases, test };
});
vi.mock("../e2e-c2/fixtures.ts", () => ({ chatTest: chat.test }));
import "../e2e-c2/chat.spec.ts";

type SyntheticElement = { nodeType: 1; role?: string; text?: string; children: SyntheticElement[] };
type HasEngine = { queryAll(root: SyntheticElement, body: { parsed: string }): SyntheticElement[] };
type OfflineLocator = Locator & {
  _selector: string;
  _expect(expression: string, options: { expectedNumber?: number }): Promise<{ matches: boolean; received?: number; log?: string[] }>;
};
type InstalledLocators = {
  Locator: { new(frame: object, selector: string): OfflineLocator; prototype: OfflineLocator };
  getByRoleSelector(role: string, options?: object): string;
  getByTextSelector(text: string, options?: object): string;
};

function installedSource() {
  const require = createRequire(import.meta.url);
  const testRequire = createRequire(require.resolve("@playwright/test/package.json"));
  const playwrightRequire = createRequire(testRequire.resolve("playwright/package.json"));
  return readFileSync(join(dirname(playwrightRequire.resolve("playwright-core/package.json")), "lib/coreBundle.js"), "utf8");
}

function section(source: string, start: string, end: string, from = 0) {
  const begin = source.indexOf(start, from);
  const finish = source.indexOf(end, begin);
  expect(begin).toBeGreaterThanOrEqual(0);
  expect(finish).toBeGreaterThan(begin);
  return source.slice(begin, finish);
}

// Run the installed Locator constructor/builders and injected `has` engine.
// The frame, descendant tree and matcher protocol are synthetic; no browser,
// C2 state, rendering, HTTP request or database is involved.
function installedLocators() {
  const source = installedSource();
  const strings = section(source, "function escapeRegexForSelector", "function trimString");
  const selectors = section(source, "function getByAttributeTextSelector", "var init_locatorUtils");
  const locator = section(source, "Locator = class _Locator", "FrameLocator = class", 2_000_000);
  const api = runInNewContext(`let Locator; ${strings}\n${selectors}\n${locator}\n({ Locator, getByRoleSelector, getByTextSelector })`, {
    import_util3: { inspect: {} }, isString: (value: unknown) => typeof value === "string",
  }) as InstalledLocators;
  const encodedEngine = section(source, "_createHasEngine() {\\n", "_createHasNotEngine()").trim();
  const engineMethod = JSON.parse(`"${encodedEngine}"`) as string;
  const createHasEngine = runInNewContext(`({ ${engineMethod} })._createHasEngine`) as (this: {
    querySelector(selector: string, root: SyntheticElement): SyntheticElement | undefined;
  }) => HasEngine;
  return { ...api, createHasEngine };
}

function descendants(root: SyntheticElement): SyntheticElement[] {
  return root.children.flatMap((child) => [child, ...descendants(child)]);
}

// This small DOM substitute resolves only role and exact-text descendants.
// Relative scoping is performed by Playwright's actual injected `has` engine.
function querySelector(selector: string, root: SyntheticElement) {
  let roots = [root];
  for (const part of selector.split(" >> ")) {
    if (part.startsWith("internal:role=")) {
      const role = part.slice("internal:role=".length).split("[")[0];
      roots = roots.flatMap(descendants).filter((element) => element.role === role);
    } else if (part.startsWith("internal:text=") && part.endsWith("s")) {
      const text = JSON.parse(part.slice("internal:text=".length, -1)) as string;
      roots = roots.flatMap(descendants).filter((element) => element.text === text);
    } else {
      throw new Error("Unexpected synthetic-tree selector");
    }
  }
  return roots[0];
}

function syntheticButton(preview = HISTORY_PREVIEW): SyntheticElement {
  return { nodeType: 1, role: "button", children: [
    { nodeType: 1, text: preview, children: [] },
    { nodeType: 1, text: "Synthetic timestamp", children: [] },
  ] };
}

async function executeHistoryScenario(preview = HISTORY_PREVIEW) {
  const installed = installedLocators();
  const engine = installed.createHasEngine.call({ querySelector });
  const selected: string[] = [];
  installed.Locator.prototype._expect = async function (expression, options) {
    if (expression === "to.have.count" && this._selector.includes("internal:role=button >> internal:has=")) {
      const inner = JSON.parse(this._selector.slice(this._selector.lastIndexOf("internal:has=") + "internal:has=".length)) as string;
      selected.push(inner);
      const received = engine.queryAll(syntheticButton(preview), { parsed: inner }).length;
      return { matches: received === options.expectedNumber, received, log: [] };
    }
    // Other UI properties are outside this locator regression's boundary.
    return { matches: true };
  };
  const frame = { click: async () => {} };
  const page = {
    goto: async () => ({ status: () => 200 }), url: () => `${C2_ORIGIN}${RESEARCH_PATH}`,
    locator: (selector: string) => new installed.Locator(frame, selector),
    getByRole: (role: string, options?: object) => new installed.Locator(frame, installed.getByRoleSelector(role, options)),
    getByText: (text: string, options?: object) => new installed.Locator(frame, installed.getByTextSelector(text, options)),
  } as unknown as Page;
  const seedHistory = vi.fn();
  const scenario = chat.cases.get("G: restore synthetic messages from a selected History conversation");
  expect(scenario).toBeDefined();
  await scenario!({ page, conversationMocks: { seedHistory } as unknown as ConversationMocks });
  expect(seedHistory).toHaveBeenCalledOnce();
  return { selected, installed, engine };
}

describe("C2 Chat History selector against installed Playwright (offline)", () => {
  it("runs the actual G callback with an exact text selector relative to each History button", async () => {
    const { selected, installed } = await executeHistoryScenario();
    expect(selected).toEqual([installed.getByTextSelector(HISTORY_PREVIEW, { exact: true })]);
    expect(selected[0]).not.toContain("internal:role=dialog");
  });

  it("reproduces the old dialog-prefixed inner locator failing against the same button", () => {
    const installed = installedLocators();
    const engine = installed.createHasEngine.call({ querySelector });
    const text = installed.getByTextSelector(HISTORY_PREVIEW, { exact: true });
    const old = `${installed.getByRoleSelector("dialog", { name: "Select Conversation", exact: true })} >> ${text}`;
    expect(engine.queryAll(syntheticButton(), { parsed: old })).toEqual([]);
    expect(engine.queryAll(syntheticButton(), { parsed: text })).toHaveLength(1);
  });

  it("keeps G strict when the synthetic History preview differs", async () => {
    await expect(executeHistoryScenario(`${HISTORY_PREVIEW} extra`)).rejects.toThrow();
  });
});
