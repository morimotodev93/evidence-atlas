import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Browser, BrowserContext, FullConfig } from "@playwright/test";

const fake = vi.hoisted(() => {
  const layers: Record<string, unknown>[] = [];
  const stepEvents: string[] = [];
  const base = {
    extend: (fixtures: Record<string, unknown>) => { layers.push(fixtures); return base; },
    afterEach: vi.fn(),
    step: async (title: string, body: () => unknown) => {
      stepEvents.push(`${title}:entered`);
      try { const value = await body(); stepEvents.push(`${title}:ok`); return value; }
      catch (error) { stepEvents.push(`${title}:failed`); throw error; }
    },
  };
  return {
    layers, stepEvents, base, config: vi.fn(), state: vi.fn(), preflight: vi.fn(),
    boundary: vi.fn(), assert: Object.assign(vi.fn(), { beginShutdown: vi.fn(), drain: vi.fn(async () => {}) }), chat: vi.fn(),
  };
});
vi.mock("@playwright/test", () => ({ test: fake.base }));
vi.mock("../e2e-c2/global-setup.ts", () => ({ requireC2Config: fake.config }));
vi.mock("./c2-playwright-state.ts", () => ({ loadC2State: fake.state }));
vi.mock("./c2-playwright-policy.ts", async (original) => ({ ...await original<object>(), preflight: fake.preflight }));
vi.mock("./c2-playwright-network.ts", () => ({ installNetworkBoundary: fake.boundary }));
vi.mock("../e2e-c2/conversation-mocks.ts", () => ({ installConversationMocks: fake.chat }));
import "../e2e-c2/fixtures.ts";

type ContextFixture = (args: { browser: Browser }, provide: (context: BrowserContext) => Promise<void>, info: { config: FullConfig }) => Promise<void>;
type ChatFixture = (args: { context: BrowserContext }, provide: (mock: unknown) => Promise<void>) => Promise<void>;
const contextFixture = fake.layers[0].context as ContextFixture;
const chatFixture = (fake.layers[1].conversationMocks as [ChatFixture])[0];
const info = { config: {} as FullConfig };

function setup() {
  const context = {
    request: {}, close: vi.fn(async () => {}),
    grantPermissions: vi.fn(async () => {}),
    setDefaultTimeout: vi.fn(), setDefaultNavigationTimeout: vi.fn(),
  } as unknown as BrowserContext;
  const newContext = vi.fn(async () => context);
  const browser = { newContext } as unknown as Browser;
  return { context, newContext, browser };
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.stepEvents.length = 0;
  fake.config.mockReset(); fake.preflight.mockReset(); fake.assert.mockReset();
  fake.state.mockReset().mockResolvedValue({ storageState: { cookies: [], origins: [] } });
  fake.boundary.mockReset().mockResolvedValue(fake.assert);
  vi.stubEnv("C2_FIXTURE_USER_ID", "offline-user");
  vi.stubEnv("C2_FIXTURE_USER_EMAIL", "offline@example.invalid");
});
afterEach(() => vi.unstubAllEnvs());

describe("Actual C2 fixture callbacks with synthetic dependencies (offline)", () => {
  it("installs the boundary and preflights before providing context, then checks late requests", async () => {
    const s = setup();
    const provide = vi.fn(async (context: BrowserContext) => {
      expect(context).toBe(s.context);
      expect(fake.boundary).toHaveBeenCalledWith(context, false, undefined, expect.any(Function));
      expect(fake.preflight).toHaveBeenCalledWith(context.request, { id: "offline-user", email: "offline@example.invalid" });
    });
    await contextFixture(s, provide, info);
    expect(s.newContext).toHaveBeenCalledWith({ storageState: { cookies: [], origins: [] }, viewport: { width: 1280, height: 720 }, serviceWorkers: "block" });
    expect(s.context.grantPermissions).toHaveBeenCalledWith(["local-network-access"], { origin: "http://localhost:3001" });
    expect(s.context.grantPermissions).toHaveBeenCalledOnce();
    expect(provide).toHaveBeenCalledOnce();
    expect(s.context.close).toHaveBeenCalledOnce();
    expect(fake.assert).toHaveBeenCalledOnce();
    expect(fake.assert.beginShutdown).toHaveBeenCalledOnce();
    expect(fake.assert.drain).toHaveBeenCalledTimes(2);
    expect(fake.stepEvents).toEqual([
      "C2 fixture config:entered", "C2 fixture config:ok", "C2 fixture state:entered", "C2 fixture state:ok",
      "C2 context creation:entered", "C2 context creation:ok", "C2 loopback permission:entered", "C2 loopback permission:ok",
      "C2 network installation:entered", "C2 network installation:ok",
      "C2 context preflight:entered", "C2 context preflight:ok", "C2 context close:entered", "C2 context close:ok",
    ]);
  });

  it.each(["config", "state", "create", "permission", "boundary", "preflight"])("localizes %s failures without providing context or exposing details", async (phase) => {
    const s = setup();
    const error = new Error("synthetic-private-error");
    if (phase === "config") fake.config.mockImplementationOnce(() => { throw error; });
    if (phase === "state") fake.state.mockRejectedValueOnce(error);
    if (phase === "create") s.newContext.mockRejectedValueOnce(error);
    if (phase === "permission") vi.mocked(s.context.grantPermissions).mockRejectedValueOnce(error);
    if (phase === "boundary") fake.boundary.mockRejectedValueOnce(error);
    if (phase === "preflight") fake.preflight.mockRejectedValueOnce(error);
    const provide = vi.fn();
    await expect(contextFixture(s, provide, info)).rejects.toThrow();
    expect(provide).not.toHaveBeenCalled();
    expect(fake.stepEvents.filter((event) => event.endsWith(":failed"))).toHaveLength(1);
    expect(fake.stepEvents.join("\n")).not.toContain("synthetic-private");
    if (["permission", "boundary", "preflight"].includes(phase)) expect(s.context.close).toHaveBeenCalledOnce();
    else expect(fake.preflight).not.toHaveBeenCalled();
  });

  it("continues to reject network violations discovered during context teardown", async () => {
    const s = setup();
    fake.assert.mockImplementationOnce(() => { throw new Error("C2 E2E refused: network-policy."); });
    await expect(contextFixture(s, async () => {}, info)).rejects.toThrow("network-policy");
    expect(s.context.close).toHaveBeenCalledOnce();
  });

  it("keeps Chat mocks per context and disposes them when a scenario fails", async () => {
    const s = setup();
    const mock = { dispose: vi.fn(async () => {}), assert: vi.fn() };
    fake.chat.mockResolvedValueOnce(mock);
    await expect(chatFixture(s, async () => { throw new Error("synthetic assertion"); })).rejects.toThrow("synthetic assertion");
    expect(fake.chat).toHaveBeenCalledWith(s.context);
    expect(mock.dispose).toHaveBeenCalledOnce();
    expect(mock.assert).toHaveBeenCalledOnce();
  });
});
