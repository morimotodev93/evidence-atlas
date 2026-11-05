import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthError } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SignInPage, { generateMetadata as signInMetadata } from "./signin/page";
import AuthErrorPage, { generateMetadata as errorMetadata } from "./error/page";
import { ja } from "@/lib/i18n/dictionaries/ja";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), auth: vi.fn(), cookies: vi.fn(), get: vi.fn(), notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/auth", () => ({ signIn: mocks.signIn, auth: mocks.auth }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));
const redirected = new Error("NEXT_REDIRECT");
const unavailable = new Error("NEXT_HTTP_ERROR_FALLBACK;404");
type Node = ReactElement<{ children?: ReactNode; action?: () => Promise<void> }>;
function nodes(node: ReactNode): Node[] {
  return Children.toArray(node).flatMap(child => isValidElement<Node["props"]>(child)
    ? [child, ...nodes(child.props.children)] : []);
}
const signin = (params: { callbackUrl?: string | string[]; error?: string | string[] } = { callbackUrl: "/" }) =>
  SignInPage({ searchParams: Promise.resolve(params) });
const errorPage = (error?: string | string[]) => AuthErrorPage({ searchParams: Promise.resolve({ error }) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PUBLIC_DEMO_MODE", "false");
  mocks.cookies.mockResolvedValue({ get: mocks.get });
  mocks.redirect.mockImplementation(() => { throw redirected; });
  mocks.notFound.mockImplementation(() => { throw unavailable; });
});
afterEach(() => vi.unstubAllEnvs());

describe("Localized authentication pages", () => {
  it.each([undefined, "en", "ja", "invalid"])("uses resolved SaaS cookie %s for pages and titles without a session", async (value) => {
    mocks.get.mockReturnValue(value === undefined ? undefined : { value });
    const locale = value === "ja" ? "ja" : "en";
    const html = renderToStaticMarkup(await signin());
    expect(html).toContain(`<main lang="${locale}"`);
    expect(html).toContain(value === "ja" ? "Googleでログイン" : "Sign in with Google");
    expect(html).toContain('type="submit"');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toMatch(/<input|<select|<img/);
    const error = renderToStaticMarkup(await errorPage("AccessDenied"));
    expect(error).toContain(`<main lang="${locale}"`);
    expect(error).toContain('role="alert"');
    expect(error).toContain(value === "ja" ? "ログインする権限がありません。" : "You do not have permission to sign in.");
    expect(error).toContain('href="/api/auth/signin"');
    expect(await signInMetadata()).toEqual({ title: value === "ja" ? "ログイン" : "Sign in", robots: { index: false, follow: false } });
    expect(await errorMetadata()).toEqual({ title: value === "ja" ? "ログインできませんでした" : "Unable to sign in", robots: { index: false, follow: false } });
    for (const [name] of mocks.get.mock.calls) expect(name).toBe("evidence_atlas_locale");
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each(["en", "ja"])("shows only safe fixed errors in %s and ignores diagnostics and locale query parameters", async (value) => {
    mocks.get.mockReturnValue({ value });
    const params = { callbackUrl: "/", error: "<script>private-token</script>",
      error_description: "private-description", code: "private-code", message: "private-message", locale: value === "ja" ? "en" : "ja" };
    for (const tree of [await signin(params), await AuthErrorPage({ searchParams: Promise.resolve(params) })]) {
      const html = renderToStaticMarkup(tree);
      expect(html).toContain(value === "ja" ? "ログインできませんでした。もう一度お試しください。" : "Unable to sign in. Please try again.");
      expect(html).not.toMatch(/private-|error_description/);
    }
  });

  it("keeps per-entry English fallback with a Japanese boundary", async () => {
    mocks.get.mockReturnValue({ value: "ja" });
    const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
    const saved = partial["auth.googleSignIn"];
    try {
      delete partial["auth.googleSignIn"];
      const html = renderToStaticMarkup(await signin());
      expect(html).toContain('<main lang="ja"');
      expect(html).toContain("Sign in with Google");
    } finally { partial["auth.googleSignIn"] = saved; }
  });

  it.each(["en", "ja"])("shows an allowlisted sign-in failure in %s without changing its Google button", async value => {
    mocks.get.mockReturnValue({ value });
    const html = renderToStaticMarkup(await signin({ callbackUrl: "/research", error: "OAuthAccountNotLinked" }));
    expect(html).toContain(value === "ja"
      ? "本人確認のため、最初にログインしたときと同じアカウントでログインしてください。"
      : "To confirm your identity, sign in with the same account you used originally.");
    expect(html).toContain(value === "ja" ? "Googleでログイン" : "Sign in with Google");
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
});

describe("Google initiation and redirect ownership", () => {
  it.each(["en", "ja"])("initiates only google in %s with the original callback and no locale/provider override", async (value) => {
    mocks.get.mockReturnValue({ value });
    const callbackUrl = "https://example.test/research/original-id?tag=a&tag=b#sources";
    const tree = await signin({ callbackUrl });
    await nodes(tree).find(node => node.type === "form")!.props.action!();
    expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith("google", { redirectTo: callbackUrl });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each([undefined, "", ["/research", "https://untrusted.test"]])("re-enters Auth.js for absent/ambiguous callback %s to preserve its cookie validation", async (callbackUrl) => {
    await expect(signin({ callbackUrl, error: "OAuthCallbackError" })).rejects.toBe(redirected);
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/api/auth/signin?error=OAuthCallbackError");
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("uses only a fixed Auth.js entrypoint when no callback/error is provided", async () => {
    await expect(signin({})).rejects.toBe(redirected);
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/api/auth/signin");
  });

  it("sanitizes unknown errors on callback recovery without forwarding diagnostics", async () => {
    await expect(signin({ error: "private-token" })).rejects.toBe(redirected);
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/api/auth/signin?error=Default");
  });

  it.each(["AccessDenied", "OAuthAccountNotLinked", "MissingCSRF", "private-type"])("maps thrown AuthError %s without exposing its message/cause", async (type) => {
    const failure = new AuthError("private-message", { cause: { token: "private-token" } });
    failure.type = type as AuthError["type"];
    mocks.signIn.mockRejectedValue(failure);
    const action = nodes(await signin()).find(node => node.type === "form")!.props.action!;
    await expect(action()).rejects.toBe(redirected);
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(`/auth/error?error=${type === "private-type" ? "Default" : type}`);
  });

  it.each([redirected, new Error("unexpected private exception")])("preserves redirect and unexpected exception identity", async (failure) => {
    mocks.signIn.mockRejectedValue(failure);
    const action = nodes(await signin()).find(node => node.type === "form")!.props.action!;
    await expect(action()).rejects.toBe(failure);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("Public Demo restrictions", () => {
  it.each(["true", "unexpected"])("rejects pages, metadata and submission before locale/auth work in mode %s", async (mode) => {
    const action = nodes(await signin()).find(node => node.type === "form")!.props.action!;
    mocks.cookies.mockClear();
    vi.stubEnv("PUBLIC_DEMO_MODE", mode);
    for (const run of [signin, errorPage, signInMetadata, errorMetadata, action]) {
      await expect(run()).rejects.toBe(unavailable);
    }
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
