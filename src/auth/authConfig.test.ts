import type { NextAuthConfig } from "next-auth";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  config: undefined as NextAuthConfig | undefined,
  database: {},
  adapter: {
    createUser: vi.fn(), getUser: vi.fn(), getUserByEmail: vi.fn(), getUserByAccount: vi.fn(),
    updateUser: vi.fn(), linkAccount: vi.fn(), createSession: vi.fn(),
    getSessionAndUser: vi.fn(), updateSession: vi.fn(), deleteSession: vi.fn(),
  },
  factory: vi.fn(), fetch: vi.fn(),
  cookieSet: vi.fn(), redirect: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "example.test", "x-forwarded-proto": "https",
    referer: "https://example.test/auth/signin?callbackUrl=%2Fresearch" }),
  cookies: async () => ({ set: state.cookieSet }),
}));
vi.mock("next/navigation", () => ({ redirect: state.redirect }));
vi.mock("@/auth/authDB", () => ({ authDb: state.database }));
vi.mock("@auth/kysely-adapter", () => ({ KyselyAdapter: state.factory }));
vi.mock("next-auth", async original => {
  const actual = await original<typeof import("next-auth")>();
  return { ...actual, default: (config: NextAuthConfig) => {
    state.config = config;
    return actual.default(config);
  } };
});

let handlers: typeof import("@/auth")["handlers"];
let signIn: typeof import("@/auth")["signIn"];
const redirected = new Error("NEXT_REDIRECT");
const origin = "https://example.test";
const request = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest(origin + "/api/auth/" + path, init);
const cookieHeader = (response: Response) => response.headers.getSetCookie().map(cookie => cookie.split(";")[0]).join("; ");

beforeAll(async () => {
  for (const [key, value] of Object.entries({
    AUTH_SECRET: "offline-auth-test-secret-never-used-outside-tests",
    AUTH_GOOGLE_ID: "offline-google-client", AUTH_GOOGLE_SECRET: "offline-google-secret",
    AUTH_TRUST_HOST: "true", AUTH_URL: undefined, NEXTAUTH_URL: undefined, AUTH_REDIRECT_PROXY_URL: undefined,
  })) vi.stubEnv(key, value);
  state.factory.mockReturnValue(state.adapter);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal("fetch", state.fetch);
  ({ handlers, signIn } = await import("@/auth"));
});
beforeEach(() => {
  for (const method of Object.values(state.adapter)) method.mockReset();
  state.cookieSet.mockReset();
  state.redirect.mockReset().mockImplementation(() => { throw redirected; });
  state.fetch.mockReset().mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url !== "https://accounts.google.com/.well-known/openid-configuration") throw Error("Unexpected offline fetch");
    return Response.json({ issuer: "https://accounts.google.com",
      authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      token_endpoint: "https://oauth2.googleapis.com/token", jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
      userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
    });
  });
});
afterAll(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Auth.js configuration and real offline handlers", () => {
  it("adds only presentation pages while preserving Google, adapter, database sessions and default callbacks/checks", () => {
    const config = state.config!;
    expect(state.factory).toHaveBeenCalledExactlyOnceWith(state.database);
    expect(config.adapter).toBe(state.adapter);
    expect(config.session).toEqual({ strategy: "database" });
    expect(config.pages).toEqual({ signIn: "/auth/signin", error: "/auth/error" });
    expect(config.providers).toHaveLength(1);
    expect(config.providers[0]).toMatchObject({ id: "google", name: "Google", type: "oidc", issuer: "https://accounts.google.com",
      options: { clientId: "offline-google-client", clientSecret: "offline-google-secret" } });
    expect(config.providers[0]).not.toHaveProperty("checks");
    expect(config.providers[0]).not.toHaveProperty("allowDangerousEmailAccountLinking");
    expect(Object.keys(config.callbacks!)).toEqual(["session"]);
    for (const key of ["cookies", "skipCSRFCheck", "redirectProxyUrl", "jwt", "events"]) expect(config[key as keyof NextAuthConfig]).toBeUndefined();
  });

  it.each([
    [undefined, origin], ["/research/original?tag=a&tag=b#sources", origin + "/research/original?tag=a&tag=b#sources"],
    [origin + "/settings/workspace", origin + "/settings/workspace"],
    ["https://untrusted.test/steal", origin], ["https://example.test.untrusted.test", origin],
    ["https://example.test@untrusted.test", origin],
    ["//untrusted.test/steal", origin + "//untrusted.test/steal"],
  ])("keeps Auth.js callback validation for %s without introducing an application redirect callback", async (callbackUrl, expected) => {
    const query = callbackUrl === undefined ? "" : "?" + new URLSearchParams({ callbackUrl });
    const response = await handlers.GET(request("signin" + query));
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location")!, origin);
    expect(location.origin).toBe(origin);
    expect(location.pathname).toBe("/auth/signin");
    expect(location.searchParams.get("callbackUrl")).toBe(expected);
    expect(new URL(location.searchParams.get("callbackUrl")!).origin).toBe(origin);
    expect(state.fetch).not.toHaveBeenCalled();
    for (const method of Object.values(state.adapter)) expect(method).not.toHaveBeenCalled();
  });

  it.each(["javascript:alert(1)", "not-a-url", "https://["])("keeps Auth.js's configuration-error rejection for malformed callback %s", async callbackUrl => {
    const response = await handlers.GET(request("signin?" + new URLSearchParams({ callbackUrl })));
    expect(response.headers.get("location")).toBe(origin + "/auth/error?error=Configuration");
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it("preserves saved callback-cookie resolution on failure recovery and sign-out's existing entrypoint", async () => {
    const target = origin + "/research/original-id";
    const first = await handlers.GET(request("signin?" + new URLSearchParams({ callbackUrl: target })));
    const recovered = await handlers.GET(request("signin?error=OAuthCallbackError", { headers: { cookie: cookieHeader(first) } }));
    const location = new URL(recovered.headers.get("location")!, origin);
    expect(location.pathname).toBe("/auth/signin");
    expect(location.searchParams.get("callbackUrl")).toBe(target);
    expect(location.searchParams.get("error")).toBe("OAuthCallbackError");
    const signoutTarget = await handlers.GET(request("signin?" + new URLSearchParams({ callbackUrl: origin })));
    expect(new URL(signoutTarget.headers.get("location")!, origin).pathname).toBe("/auth/signin");
  });

  it("keeps Google public provider identity and callback endpoint", async () => {
    const response = await handlers.GET(request("providers"));
    expect(await response.json()).toEqual({ google: { id: "google", name: "Google", type: "oidc",
      signinUrl: origin + "/api/auth/signin/google", callbackUrl: origin + "/api/auth/callback/google" } });
  });

  it.each(["Configuration", "AccessDenied", "Verification", "Default"])("routes Auth.js error %s to the standalone page", async error => {
    const response = await handlers.GET(request("error?" + new URLSearchParams({ error })));
    const location = new URL(response.headers.get("location")!, origin);
    expect(location.pathname).toBe("/auth/error");
    expect(location.searchParams.get("error")).toBe(error);
    for (const method of Object.values(state.adapter)) expect(method).not.toHaveBeenCalled();
  });

  it.each([undefined, "wrong-token"])("rejects Google initiation with missing/invalid CSRF %s before provider discovery", async csrfToken => {
    const response = await handlers.POST(request("signin/google", { method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ callbackUrl: "/research", ...(csrfToken ? { csrfToken } : {}) }),
    }));
    const location = new URL(response.headers.get("location")!, origin);
    expect(location.pathname).toBe("/auth/signin");
    expect(location.searchParams.get("error")).toBe("MissingCSRF");
    expect(state.fetch).not.toHaveBeenCalled();
    for (const method of Object.values(state.adapter)) expect(method).not.toHaveBeenCalled();
  });

  it("rejects a CSRF body token that does not match its real Auth.js cookie", async () => {
    const csrf = await handlers.GET(request("csrf"));
    const response = await handlers.POST(request("signin/google", { method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookieHeader(csrf) },
      body: new URLSearchParams({ csrfToken: "nonmatching-token", callbackUrl: "/research" }),
    }));
    expect(new URL(response.headers.get("location")!, origin).searchParams.get("error")).toBe("MissingCSRF");
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it("retains valid-CSRF Google initiation, PKCE, callback validation and OAuth endpoints using only local discovery data", async () => {
    const csrf = await handlers.GET(request("csrf?" + new URLSearchParams({ callbackUrl: "/research" })));
    const { csrfToken } = await csrf.json();
    const response = await handlers.POST(request("signin/google", { method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookieHeader(csrf) },
      body: new URLSearchParams({ csrfToken, callbackUrl: "https://untrusted.test/steal" }),
    }));
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.searchParams.get("client_id")).toBe("offline-google-client");
    expect(location.searchParams.get("redirect_uri")).toBe(origin + "/api/auth/callback/google");
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(location.searchParams.get("code_challenge")).toBeTruthy();
    const cookies = response.headers.getSetCookie();
    expect(cookies.some(cookie => cookie.startsWith("__Secure-authjs.pkce.code_verifier="))).toBe(true);
    expect(cookies.find(cookie => cookie.startsWith("__Secure-authjs.callback-url="))).toContain(encodeURIComponent(origin));
    expect(state.fetch).toHaveBeenCalledTimes(1);
    for (const method of Object.values(state.adapter)) expect(method).not.toHaveBeenCalled();
  });

  it("keeps unauthenticated session reads empty and authenticated database session identity unchanged", async () => {
    expect(await (await handlers.GET(request("session"))).json()).toBeNull();
    expect(state.adapter.getSessionAndUser).not.toHaveBeenCalled();
    state.adapter.getSessionAndUser.mockResolvedValue({
      user: { id: "original-user", name: "Original Name", email: "original@example.test", image: null },
      session: { sessionToken: "offline-existing-session", userId: "original-user", expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
    const response = await handlers.GET(request("session", { headers: { cookie: "__Secure-authjs.session-token=offline-existing-session" } }));
    expect((await response.json()).user).toEqual({ id: "original-user", name: "Original Name", email: "original@example.test", image: null });
    expect(state.adapter.getSessionAndUser).toHaveBeenCalledExactlyOnceWith("offline-existing-session");
    for (const [name, method] of Object.entries(state.adapter)) if (name !== "getSessionAndUser") expect(method).not.toHaveBeenCalled();
  });

  it.each([
    ["error=access_denied&error_description=private-diagnostic", "/auth/signin", "OAuthCallbackError"],
    ["code=offline-unusable-code", "/auth/error", "Configuration"],
  ])("rejects an incomplete/denied callback %s without token exchange, diagnostics or adapter writes", async (query, path, error) => {
    const response = await handlers.GET(request("callback/google?" + query));
    const location = new URL(response.headers.get("location")!, origin);
    expect(location.pathname).toBe(path);
    expect(location.searchParams.get("error")).toBe(error);
    expect(location.href).not.toMatch(/private-|offline-unusable-code/);
    expect(state.fetch).toHaveBeenCalledTimes(1);
    for (const [input] of state.fetch.mock.calls) expect(String(input)).toBe("https://accounts.google.com/.well-known/openid-configuration");
    for (const method of Object.values(state.adapter)) expect(method).not.toHaveBeenCalled();
  });

  it.each([
    ["/research/original?tag=a&tag=b#sources", origin + "/research/original?tag=a&tag=b#sources"],
    ["https://untrusted.test/steal", origin],
  ])("the real exported Server Action helper validates callback %s and retains its OAuth redirect exception", async (redirectTo, expected) => {
    await expect(signIn("google", { redirectTo })).rejects.toBe(redirected);
    expect(state.redirect).toHaveBeenCalledOnce();
    const target = new URL(state.redirect.mock.calls[0][0]);
    expect(target.origin).toBe("https://accounts.google.com");
    expect(target.searchParams.get("redirect_uri")).toBe(origin + "/api/auth/callback/google");
    expect(target.searchParams.get("code_challenge_method")).toBe("S256");
    expect(state.cookieSet.mock.calls.find(([name]) => name === "__Secure-authjs.callback-url")?.[1]).toBe(expected);
    expect(state.cookieSet.mock.calls.some(([name]) => name === "__Secure-authjs.pkce.code_verifier")).toBe(true);
    for (const method of Object.values(state.adapter)) expect(method).not.toHaveBeenCalled();
  });
});
