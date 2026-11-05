import { describe, expect, it } from "vitest";
import { getAuthErrorMessage, getPublicAuthError } from "./public-errors";

describe("Public authentication error allowlist", () => {
  it.each([
    ["Default", "Unable to sign in. Please try again.", "ログインできませんでした。もう一度お試しください。"],
    ["Configuration", "There is a problem with the server configuration. Please try again later.", "サーバーの設定に問題があります。時間をおいてから、もう一度お試しください。"],
    ["AccessDenied", "You do not have permission to sign in.", "ログインする権限がありません。"],
    ["Verification", "Unable to sign in. Please try again.", "ログインできませんでした。もう一度お試しください。"],
    ...["Signin", "OAuthSignin", "OAuthCallbackError", "OAuthCreateAccount", "Callback"].map(type => [type, "Try signing in with a different account.", "別のアカウントでログインをお試しください。"]),
    ...["OAuthAccountNotLinked", "AccountNotLinked"].map(type => [type, "To confirm your identity, sign in with the same account you used originally.", "本人確認のため、最初にログインしたときと同じアカウントでログインしてください。"]),
    ...["SessionRequired", "MissingCSRF"].map(type => [type, "Please sign in to access this page.", "このページを表示するには、ログインしてください。"]),
  ])("maps only public identifier %s to static messages", (type, en, ja) => {
    expect(getPublicAuthError(type)).toBe(type);
    expect(getAuthErrorMessage(type, "en")).toBe(en);
    expect(getAuthErrorMessage(type, "ja")).toBe(ja);
  });

  it.each([undefined, null, "", "accessdenied", "AccessDenied ", "__proto__", "constructor", "toString",
    "AdapterError", "OAuthSignInError", "CredentialsSignin", "EmailSignin", "private-token",
    "Try signing in with a different account.", ["AccessDenied"], { error: "AccessDenied" }])("uses generic feedback for unsupported input %j", (value) => {
    expect(getPublicAuthError(value)).toBe("Default");
    expect(getAuthErrorMessage(value, "en")).toBe("Unable to sign in. Please try again.");
    expect(getAuthErrorMessage(value, "ja")).toBe("ログインできませんでした。もう一度お試しください。");
  });
});
