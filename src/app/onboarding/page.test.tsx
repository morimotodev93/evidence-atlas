import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "./page";

const mocks = vi.hoisted(() => ({ user: vi.fn(), workspaces: vi.fn(), cookies: vi.fn(), get: vi.fn(), redirect: vi.fn() }));
vi.mock("@/auth/requireUser", () => ({ requireUser: mocks.user }));
vi.mock("@/workspace/getAccessibleWorkspaces", () => ({ getAccessibleWorkspaces: mocks.workspaces }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("./_components/onboarding-form", () => ({
  OnboardingForm: ({ locale }: { locale?: string }) => createElement("form", { "data-locale": locale }),
}));

const redirectError = new Error("NEXT_REDIRECT");
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "original-user-id" });
  mocks.workspaces.mockResolvedValue([]);
  mocks.cookies.mockResolvedValue({ get: mocks.get });
  mocks.redirect.mockImplementation(() => { throw redirectError; });
});

describe("Onboarding locale delivery", () => {
  it.each([undefined, "", "invalid", "ja-JP", "JA", "en", "ja"])("renders cookie %s with the existing locale fallback", async (value) => {
    mocks.get.mockReturnValue(value === undefined ? undefined : { value });
    const html = renderToStaticMarkup(await OnboardingPage());
    const locale = value === "ja" ? "ja" : "en";
    expect(html).toContain(`<main lang="${locale}"`);
    expect(html).toContain(`data-locale="${locale}"`);
    expect(html).toContain("Evidence Atlas");
    expect(html).toContain(locale === "ja" ? "Workspaceの初期設定" : "Set up your workspace");
    expect(html).toContain(locale === "ja"
      ? "Organizationと最初のWorkspaceを作成して、Researchの整理を始めましょう。"
      : "Create your organization and first workspace to start organizing research.");
    expect(html).not.toContain("<select");
    expect(mocks.user).toHaveBeenCalledTimes(1);
    expect(mocks.workspaces).toHaveBeenCalledExactlyOnceWith("original-user-id");
    expect(mocks.cookies).toHaveBeenCalledTimes(1);
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith("evidence_atlas_locale");
  });

  it("keeps provisioned users redirected before locale delivery", async () => {
    mocks.workspaces.mockResolvedValue([{ id: "existing-workspace" }]);
    await expect(OnboardingPage()).rejects.toBe(redirectError);
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/");
    expect(mocks.cookies).not.toHaveBeenCalled();
  });

  it("propagates the authentication guard before workspace or locale reads", async () => {
    mocks.user.mockRejectedValue(redirectError);
    await expect(OnboardingPage()).rejects.toBe(redirectError);
    expect(mocks.workspaces).not.toHaveBeenCalled();
    expect(mocks.cookies).not.toHaveBeenCalled();
  });
});
