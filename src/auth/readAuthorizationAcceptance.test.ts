import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";
import Onboarding from "@/app/onboarding/page";
import ResearchList from "@/app/research/page";
import OrganizationSettings from "@/app/settings/organization/page";
import WorkspaceSettings from "@/app/settings/workspace/page";
import { CURRENT_WORKSPACE_COOKIE } from "@/workspace/currentWorkspace";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

type Row = Record<string, unknown>;
const mocks = vi.hoisted(() => {
  function model() {
    return { rows: [] as Row[], where: vi.fn(), first: vi.fn(), all: vi.fn(),
      create: vi.fn(), update: vi.fn(), delete: vi.fn() };
  }
  return {
    models: { Workspace: model(), WorkspaceMembership: model(), Membership: model(),
      Organization: model(), Research: model(), Source: model(), Finding: model(), Tag: model() },
    auth: vi.fn(), redirect: vi.fn(), notFound: vi.fn(), cookieGet: vi.fn(),
    cookieSet: vi.fn(), transaction: vi.fn(), refresh: vi.fn(), revalidatePath: vi.fn(),
  };
});

// Exercise all access/selection helpers, including getAccessibleWorkspaces.
// Replace external I/O, shell framing and interactive children; no real session or DB.
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/prisma/db", () => ({ db: {
  orm: { public: mocks.models }, transaction: mocks.transaction,
} }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: mocks.cookieGet, set: mocks.cookieSet,
}) }));
vi.mock("next/cache", () => ({ refresh: mocks.refresh, revalidatePath: mocks.revalidatePath }));
// Keep authorization checks on real page bodies without rendering the async RSC shell.
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children, header }: { children: ReactNode | ((locale: Locale) => ReactNode); header?: ReactNode }) =>
    createElement("div", { "data-testid": "mock-app-shell" }, header,
      typeof children === "function" ? children(resolveLocale(mocks.cookieGet("evidence_atlas_locale")?.value)) : children),
}));
vi.mock("@/components/workspace/workspace-selector", () => ({
  WorkspaceSelector: () => null,
}));
vi.mock("@/app/onboarding/_components/onboarding-form", () => ({
  OnboardingForm: () => createElement("form", { "data-onboarding": true }),
}));
vi.mock("@/app/settings/organization/_components/organization-member-role-form", () => ({
  OrganizationMemberRoleForm: ({ locale, initialRole, organizationId, userId }: {
    locale?: Locale; initialRole: string; organizationId: string; userId: string;
  }) => createElement("span", { "data-locale": locale, "data-role": initialRole,
    "data-organization": organizationId, "data-user": userId }, "organization-role-control"),
}));
vi.mock("@/app/settings/workspace/_components/workspace-member-role-form", () => ({
  WorkspaceMemberRoleForm: ({ locale, initialRole, workspaceId, userId }: {
    locale?: Locale; initialRole: string; workspaceId: string; userId: string;
  }) => createElement("span", { "data-locale": locale, "data-role": initialRole,
    "data-workspace": workspaceId, "data-user": userId }, "workspace-role-control"),
}));

const userId = "reader";
const workspace = { id: "selected-workspace", organizationId: "selected-organization", name: "Selected workspace" };
const otherWorkspace = { id: "other-workspace", organizationId: "other-organization", name: "Other workspace" };
const member = { userId, workspaceId: workspace.id, role: "MEMBER", workspace };
const redirectError = new Error("NEXT_REDIRECT");
const notFoundError = new Error("NEXT_NOT_FOUND");

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PUBLIC_DEMO_MODE", "false");
  mocks.auth.mockResolvedValue({ user: { id: userId } });
  mocks.redirect.mockImplementation(() => { throw redirectError; });
  mocks.notFound.mockImplementation(() => { throw notFoundError; });
  mocks.cookieGet.mockImplementation((name) =>
    name === CURRENT_WORKSPACE_COOKIE ? { value: workspace.id } : undefined);
  for (const model of Object.values(mocks.models)) {
    model.rows = [];
    const matching = (filter: Row) => model.rows.filter((row) =>
      Object.entries(filter).every(([key, value]) => row[key] === value));
    model.first.mockImplementation(async (filter: Row) => matching(filter)[0] ?? null);
    model.all.mockImplementation(async (filter: Row) => matching(filter));
    model.where.mockImplementation((filter: Row) => {
      const query = {
        first: () => model.first(filter), all: () => model.all(filter),
        include: vi.fn(), update: model.update, delete: model.delete,
      };
      query.include.mockReturnValue(query);
      return query;
    });
  }
  mocks.models.Workspace.rows = [workspace];
  mocks.models.WorkspaceMembership.rows = [member];
  mocks.models.Membership.rows = [{ userId, organizationId: workspace.organizationId, role: "MEMBER" }];
});
afterEach(() => vi.unstubAllEnvs());

function expectNoWrites() {
  for (const model of Object.values(mocks.models)) {
    expect(model.create).not.toHaveBeenCalled();
    expect(model.update).not.toHaveBeenCalled();
    expect(model.delete).not.toHaveBeenCalled();
  }
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.cookieSet).not.toHaveBeenCalled();
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
}

const pages = [
  { name: "overview", run: Home },
  { name: "Research list", run: () => ResearchList({ searchParams: Promise.resolve({}) }) },
  { name: "onboarding", run: Onboarding },
  { name: "Organization settings", run: OrganizationSettings },
  { name: "Workspace settings", run: WorkspaceSettings },
];
it.each(["en", "ja"] as const)("supplies the Shell's %s locale to the Research Workspace selector without another locale read", async (locale) => {
  const page = await ResearchList({ searchParams: Promise.resolve({}) });
  const header = page.props.header(locale);
  expect(header.props.locale).toBe(locale);
  expect(header.props.currentWorkspaceId).toBe(workspace.id);
  expect(header.props.workspaces).toEqual([{ id: workspace.id, name: workspace.name }]);
  expect(mocks.cookieGet.mock.calls.some(([name]) => name === "evidence_atlas_locale")).toBe(false);
  expectNoWrites();
});

it.each(pages)("redirects unauthenticated $name before private reads", async ({ run }) => {
  mocks.auth.mockResolvedValue(null);
  await expect(run()).rejects.toBe(redirectError);
  expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/api/auth/signin");
  for (const model of Object.values(mocks.models)) expect(model.where).not.toHaveBeenCalled();
  expect(mocks.cookieGet).not.toHaveBeenCalled();
  expectNoWrites();
});

describe("onboarding read with real accessible-Workspace lookup", () => {
  it("renders setup only when this User has no accessible Workspace", async () => {
    mocks.models.WorkspaceMembership.rows = [{ ...member, userId: "another-user" }];
    const html = renderToStaticMarkup(await Onboarding());
    expect(html).toContain("data-onboarding");
    expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledExactlyOnceWith({ userId });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("redirects an existing MEMBER to the overview without creating anything", async () => {
    await expect(Onboarding()).rejects.toBe(redirectError);
    expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledExactlyOnceWith({ userId });
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/");
    expectNoWrites();
  });
});

describe("Organization localized presentation with real membership guards", () => {
  it.each([undefined, "invalid", "ja-JP", "en", "ja"])("renders original member data and role-based controls for cookie %s", async (locale) => {
    mocks.cookieGet.mockImplementation((name) => name === CURRENT_WORKSPACE_COOKIE
      ? { value: workspace.id } : name === "evidence_atlas_locale" && locale !== undefined ? { value: locale } : undefined);
    const organization = { id: workspace.organizationId, name: "Original Organization 日本語", memberships: [
      { userId, role: "MEMBER", user: { name: "Original Name 原文", email: "original@example.test" } },
      { userId: "admin-id", role: "ADMIN", user: { name: null, email: "admin@example.test" } },
    ] };
    mocks.models.Organization.first.mockResolvedValue(organization);
    for (const role of ["MEMBER", "ADMIN"]) {
      mocks.models.Membership.rows = [{ userId, organizationId: workspace.organizationId, role }];
      const html = renderToStaticMarkup(await OrganizationSettings());
      for (const text of [organization.name, "Original Name 原文", "original@example.test", "admin@example.test"]) expect(html).toContain(text);
      expect(html).toContain(locale === "ja" ? "メンバー" : "Members");
      expect(html).toContain(locale === "ja" ? "このOrganizationに所属するメンバーです。" : "People who belong to this organization.");
      expect(html).toContain(`<main lang="${locale === "ja" ? "ja" : "en"}"`);
      expect(html.includes("organization-role-control")).toBe(role === "ADMIN");
      if (role === "ADMIN") {
        expect(html).toContain('data-role="ADMIN"');
        expect(html).toContain('data-role="MEMBER"');
        expect(html).toContain(`data-locale="${locale === "ja" ? "ja" : "en"}"`);
        expect(html).toContain(`data-organization="${workspace.organizationId}"`);
        expect(html).toContain('data-user="admin-id"');
      } else {
        expect(html).toContain(locale === "ja" ? "管理者" : "ADMIN");
        expect(html).toContain(locale === "ja" ? "メンバー" : "MEMBER");
      }
      expect(mocks.models.Membership.where).toHaveBeenCalledWith({ userId, organizationId: workspace.organizationId });
      expectNoWrites();
    }
  });
});

describe("Workspace localized presentation with real membership guards", () => {
  it.each([undefined, "invalid", "ja-JP", "en", "ja"])("preserves member data and local role controls for cookie %s", async (locale) => {
    mocks.cookieGet.mockImplementation((name) => name === CURRENT_WORKSPACE_COOKIE
      ? { value: workspace.id } : name === "evidence_atlas_locale" && locale !== undefined ? { value: locale } : undefined);
    const currentWorkspace = { ...workspace, name: "Original Workspace 日本語", memberships: [
      { userId, role: "MEMBER", user: { name: "Original Name 原文", email: "original@example.test" } },
      { userId: "admin-id", role: "ADMIN", user: { name: null, email: "admin@example.test" } },
    ] };
    mocks.models.Workspace.first.mockResolvedValue(currentWorkspace);
    for (const role of ["MEMBER", "ADMIN"]) {
      mocks.models.WorkspaceMembership.rows = [{ ...member, role }];
      // Organization authority must not determine Workspace controls.
      mocks.models.Membership.rows = [{ userId, organizationId: workspace.organizationId, role: role === "MEMBER" ? "ADMIN" : "MEMBER" }];
      const html = renderToStaticMarkup(await WorkspaceSettings());
      for (const text of [currentWorkspace.name, "Original Name 原文", "original@example.test", "admin@example.test"]) expect(html).toContain(text);
      expect(html).toContain(locale === "ja" ? "メンバー" : "Members");
      expect(html).toContain(locale === "ja" ? "このWorkspaceにアクセスできるメンバーです。" : "People who have access to this workspace.");
      expect(html).toContain(`<main lang="${locale === "ja" ? "ja" : "en"}"`);
      expect(html.includes("workspace-role-control")).toBe(role === "ADMIN");
      if (role === "ADMIN") {
        expect(html).toContain('data-role="ADMIN"');
        expect(html).toContain('data-role="MEMBER"');
        expect(html).toContain(`data-locale="${locale === "ja" ? "ja" : "en"}"`);
        expect(html).toContain(`data-workspace="${workspace.id}"`);
        expect(html).toContain('data-user="admin-id"');
      } else {
        expect(html).toContain(locale === "ja" ? "管理者" : "ADMIN");
        expect(html).toContain(locale === "ja" ? "メンバー" : "MEMBER");
      }
      expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledWith({ userId, workspaceId: workspace.id });
      expectNoWrites();
    }
  });
});

const settings = [
  { name: "Organization", run: OrganizationSettings, model: "Organization", memberModel: "Membership",
    filter: { userId, organizationId: workspace.organizationId }, id: workspace.organizationId,
    control: "organization-role-control" },
  { name: "Workspace", run: WorkspaceSettings, model: "Workspace", memberModel: "WorkspaceMembership",
    filter: { userId, workspaceId: workspace.id }, id: workspace.id, control: "workspace-role-control" },
] as const;
describe.each(settings)("$name settings read", (scope) => {
  function record() {
    return { id: scope.id, name: "Scoped settings", memberships: [{
      userId, role: "MEMBER", user: { name: "Scoped member", email: "member@example.test" },
    }] };
  }

  it.each(["MEMBER", "ADMIN"])("permits local %s and exposes controls only to the local ADMIN", async (role) => {
    mocks.models[scope.model].first.mockResolvedValue(record());
    mocks.models[scope.memberModel].rows = [{ ...scope.filter, role }];
    // The opposite scope's ADMIN must not supply settings edit permissions.
    const opposite = scope.memberModel === "Membership" ? "WorkspaceMembership" : "Membership";
    const oppositeRole = role === "MEMBER" ? "ADMIN" : "MEMBER";
    mocks.models[opposite].rows = [scope.memberModel === "Membership"
      ? { ...member, role: oppositeRole }
      : { userId, organizationId: workspace.organizationId, role: oppositeRole }];
    const html = renderToStaticMarkup(await scope.run());
    expect(html).toContain("Scoped member");
    expect(html.includes(scope.control)).toBe(role === "ADMIN");
    expect(mocks.models[scope.memberModel].where).toHaveBeenCalledWith(scope.filter);
    expect(mocks.models[scope.model].where).toHaveBeenLastCalledWith({ id: scope.id });
    expectNoWrites();
  });

  it("uses notFound when the authorized settings target disappears", async () => {
    // Workspace resolution succeeds first; the subsequent settings read is absent.
    mocks.models[scope.model].first.mockImplementation(async () => null);
    if (scope.model === "Workspace") {
      mocks.models.Workspace.first.mockResolvedValueOnce(workspace).mockResolvedValueOnce(null);
    }
    await expect(scope.run()).rejects.toBe(notFoundError);
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
    expectNoWrites();
  });
});

it("rejects Organization settings without local membership despite other-tenant and Workspace ADMIN roles", async () => {
  mocks.models.WorkspaceMembership.rows = [{ ...member, role: "ADMIN" }];
  mocks.models.Membership.rows = [{ userId, organizationId: "other-organization", role: "ADMIN" }];
  await expect(OrganizationSettings()).rejects.toThrow("Forbidden");
  expect(mocks.models.Membership.where).toHaveBeenCalledExactlyOnceWith({
    userId, organizationId: workspace.organizationId,
  });
  expect(mocks.models.Organization.where).not.toHaveBeenCalled();
  expectNoWrites();
});

describe.each(pages.filter(({ name }) => name !== "onboarding"))(
  "$name selected Workspace boundary", ({ name, run }) => {
    it("redirects to onboarding when a foreign cookie and opposite-scope ADMIN grant no Workspace", async () => {
      mocks.models.WorkspaceMembership.rows = [{ ...member, userId: "another-user", role: "ADMIN" }];
      mocks.models.Membership.rows = [{ userId, organizationId: workspace.organizationId, role: "ADMIN" }];
      await expect(run()).rejects.toBe(redirectError);
      expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/onboarding");
      expect(mocks.models.Workspace.where).not.toHaveBeenCalled();
      expect(mocks.models.Organization.where).not.toHaveBeenCalled();
      expect(mocks.models.Research.where).not.toHaveBeenCalled();
      expectNoWrites();
    });

    if (name === "overview" || name === "Research list") {
      it("reads only the selected second Workspace among multiple memberships", async () => {
        mocks.models.Workspace.rows = [workspace, otherWorkspace];
        mocks.models.WorkspaceMembership.rows = [
          { ...member, role: "ADMIN" },
          { ...member, workspaceId: otherWorkspace.id, workspace: otherWorkspace },
          { ...member, userId: "another-user", workspaceId: "foreign-workspace" },
        ];
        mocks.cookieGet.mockReturnValue({ value: otherWorkspace.id });
        await run();
        expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledWith({ userId, workspaceId: otherWorkspace.id });
        expect(mocks.models.WorkspaceMembership.where).toHaveBeenCalledWith({ userId });
        expect(mocks.models.Research.where).toHaveBeenCalledExactlyOnceWith({ workspaceId: otherWorkspace.id });
        if (name === "overview") {
          expect(mocks.models.Tag.where).toHaveBeenCalledExactlyOnceWith({ workspaceId: otherWorkspace.id });
        }
        expectNoWrites();
      });
    }
  },
);
