import { translate } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/locales";

// Public Auth.js page identifiers only. Never inspect messages, causes or codes.
// Password/email/WebAuthn-specific errors are outside this Google-only UI.
const publicErrors = {
  Default: "auth.errorDefault",
  Configuration: "auth.errorConfiguration",
  AccessDenied: "auth.errorAccessDenied",
  Verification: "auth.errorDefault",
  Signin: "auth.errorDifferentAccount",
  OAuthSignin: "auth.errorDifferentAccount",
  OAuthCallbackError: "auth.errorDifferentAccount",
  OAuthCreateAccount: "auth.errorDifferentAccount",
  Callback: "auth.errorDifferentAccount",
  OAuthAccountNotLinked: "auth.errorAccountNotLinked",
  AccountNotLinked: "auth.errorAccountNotLinked",
  SessionRequired: "auth.errorSessionRequired",
  MissingCSRF: "auth.errorSessionRequired",
} as const;

export function getPublicAuthError(value: unknown): keyof typeof publicErrors {
  return typeof value === "string" && Object.hasOwn(publicErrors, value)
    ? value as keyof typeof publicErrors
    : "Default";
}

export function getAuthErrorMessage(value: unknown, locale: Locale): string {
  return translate(publicErrors[getPublicAuthError(value)], locale);
}
