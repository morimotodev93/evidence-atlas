import { Children, isValidElement, type ReactNode } from "react";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";
import ResearchList from "@/app/research/page";
import ResearchDetail from "@/app/research/[id]/page";
import ResearchEdit from "@/app/research/[id]/edit/page";
import ResearchNew from "@/app/research/new/page";
import WorkspaceSettings from "@/app/settings/workspace/page";
import OrganizationSettings from "@/app/settings/organization/page";
import Onboarding from "@/app/onboarding/page";
import { GET, POST } from "@/app/api/auth/[...nextauth]/route";
import { AppHeader } from "@/components/layout/app-header";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), signOut: vi.fn(), get: vi.fn(), post: vi.fn(),
  adapter: vi.fn(), database: vi.fn(), notFound: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/auth", () => ({
  auth: mocks.auth, signOut: mocks.signOut, handlers: { GET: mocks.get, POST: mocks.post },
}));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: new Proxy({}, {
  get: () => ({ where: mocks.database, create: mocks.database }),
}) } } }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));
vi.mock("@/inngest/request-research-index", () => ({ requestResearchIndex: vi.fn() }));

const notFoundError = new Error("NEXT_HTTP_ERROR_FALLBACK;404");
const redirectError = new Error("NEXT_REDIRECT");
const params = () => Promise.resolve({ id: "private-research" });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PUBLIC_DEMO_MODE", "true");
  mocks.auth.mockResolvedValue({ user: { id: "existing-session-user" } });
  mocks.notFound.mockImplementation(() => { throw notFoundError; });
  mocks.redirect.mockImplementation(() => { throw redirectError; });
  mocks.database.mockImplementation(() => { throw new Error("Protected database access"); });
  mocks.get.mockImplementation(async () => { mocks.adapter(); return new Response("normal GET"); });
  mocks.post.mockImplementation(async () => { mocks.adapter(); return new Response("normal POST"); });
});
afterEach(() => vi.unstubAllEnvs());

describe("Public deployment page boundary", () => {
  it("redirects root to Demo before authentication or database work", async () => {
    await expect(Home()).rejects.toBe(redirectError);
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/demo");
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.database).not.toHaveBeenCalled();
  });

  const pages = [
    { name: "Research list", run: () => ResearchList({ searchParams: Promise.resolve({}) }) },
    { name: "Research detail", run: () => ResearchDetail({ params: params() }) },
    { name: "Research edit", run: () => ResearchEdit({ params: params() }) },
    { name: "Research new", run: () => ResearchNew() },
    { name: "Workspace settings", run: () => WorkspaceSettings() },
    { name: "Organization settings", run: () => OrganizationSettings() },
    { name: "onboarding", run: () => Onboarding() },
  ];
  it.each(pages)("rejects $name despite a valid-session-shaped auth mock", async ({ run }) => {
    await expect(run()).rejects.toBe(notFoundError);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.database).not.toHaveBeenCalled();
  });

  it("keeps normal root sign-in behavior", async () => {
    vi.stubEnv("PUBLIC_DEMO_MODE", "false");
    mocks.auth.mockResolvedValue(null);
    await expect(Home()).rejects.toBe(redirectError);
    expect(mocks.redirect).toHaveBeenCalledWith("/api/auth/signin");
    expect(mocks.auth).toHaveBeenCalledTimes(1);
  });
});

describe("Auth catch-all deployment dispatch", () => {
  const cases = [GET, POST].flatMap((handler) =>
    ["signin", "callback/google", "session", "signout", "providers", "csrf", "error"].map((path) => ({
      method: handler === GET ? "GET" : "POST", handler, path,
    })));
  it.each(cases)("blocks $method $path before Auth.js or adapter dispatch", async ({ method, handler, path }) => {
    const request = new NextRequest(`https://example.test/api/auth/${path}`, {
      method, headers: { cookie: "authjs.session-token=existing-session" },
    });
    const response = await handler(request);
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.adapter).not.toHaveBeenCalled();
  });

  it.each([undefined, "false"])("delegates the original request and response in normal mode %s", async (value) => {
    vi.stubEnv("PUBLIC_DEMO_MODE", value);
    for (const [handler, mock] of [[GET, mocks.get], [POST, mocks.post]] as const) {
      const request = new NextRequest("https://example.test/api/auth/session");
      const response = new Response("unchanged", { status: 202 });
      mock.mockResolvedValueOnce(response);
      expect(await handler(request)).toBe(response);
      expect(mock).toHaveBeenCalledExactlyOnceWith(request);
    }
  });
});

function findFormAction(node: ReactNode): (() => Promise<void>) | undefined {
  if (!isValidElement<{ children?: ReactNode; action?: unknown }>(node)) return;
  if (node.type === "form" && typeof node.props.action === "function") {
    return node.props.action as () => Promise<void>;
  }
  for (const child of Children.toArray(node.props.children)) {
    const action = findFormAction(child);
    if (action) return action;
  }
}

describe("Inline sign-out deployment guard", () => {
  it("rejects the actual header Action before signOut", async () => {
    const action = findFormAction(AppHeader({}));
    expect(action).toBeDefined();
    await expect(action!()).rejects.toBe(notFoundError);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("preserves normal sign-out", async () => {
    vi.stubEnv("PUBLIC_DEMO_MODE", "false");
    const action = findFormAction(AppHeader({}));
    await action!();
    expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ redirectTo: "/api/auth/signin" });
  });
});
