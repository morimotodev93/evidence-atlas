import type { TranslationKey } from "./dictionaries/en";
import { defaultLocale } from "./locales";
import { translate } from "./translate";

// Display data only: callers must choose codes from structured failure conditions,
// never by matching exception messages. This does not replace Action state types.
export type DisplayError =
  | { readonly code: "INPUT_TOO_LONG"; readonly params: { readonly maxLength: number } }
  | { readonly code: "INVALID_INPUT" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR" | "ONBOARDING_INVALID_INPUT" | "ONBOARDING_CREATE_FAILED" }
  | { readonly code: "ORGANIZATION_INVALID_ROLE" | "WORKSPACE_INVALID_ROLE" | "MEMBER_NOT_FOUND" | "ORGANIZATION_LAST_ADMIN" | "WORKSPACE_LAST_ADMIN" | "MEMBER_ROLE_UPDATE_FAILED" }
  | { readonly code: "RESEARCH_INVALID_STATUS" | "RESEARCH_NOT_FOUND" | "RESEARCH_STATUS_UPDATE_FAILED" };

export type ErrorCode = DisplayError["code"];

const errorKeys = {
  INVALID_INPUT: "errors.invalidInput",
  INPUT_TOO_LONG: "errors.inputTooLong",
  UNAUTHENTICATED: "errors.unauthenticated",
  FORBIDDEN: "errors.forbidden",
  NOT_FOUND: "errors.notFound",
  CONFLICT: "errors.conflict",
  INTERNAL_ERROR: "errors.internal",
  ONBOARDING_INVALID_INPUT: "errors.onboardingInvalidInput",
  ONBOARDING_CREATE_FAILED: "errors.onboardingCreateFailed",
  ORGANIZATION_INVALID_ROLE: "errors.organizationInvalidRole",
  WORKSPACE_INVALID_ROLE: "errors.workspaceInvalidRole",
  MEMBER_NOT_FOUND: "errors.memberNotFound",
  ORGANIZATION_LAST_ADMIN: "errors.organizationLastAdmin",
  WORKSPACE_LAST_ADMIN: "errors.workspaceLastAdmin",
  MEMBER_ROLE_UPDATE_FAILED: "errors.memberRoleUpdateFailed",
  RESEARCH_INVALID_STATUS: "errors.researchInvalidStatus",
  RESEARCH_NOT_FOUND: "errors.researchNotFound",
  RESEARCH_STATUS_UPDATE_FAILED: "errors.researchStatusUpdateFailed",
} as const satisfies Record<ErrorCode, TranslationKey>;

// Accept unknown boundary data safely; message, cause, stack and other diagnostic
// fields are never read or interpolated. No request state or server/client APIs.
export function getErrorMessage(error: unknown, locale: unknown = defaultLocale): string {
  const fallback = () => translate(errorKeys.INTERNAL_ERROR, locale);
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return fallback();
  }

  const code = error.code;
  if (typeof code !== "string" || !Object.hasOwn(errorKeys, code)) {
    return fallback();
  }

  if (code === "INPUT_TOO_LONG") {
    if (!("params" in error) || typeof error.params !== "object" || error.params === null
      || !("maxLength" in error.params)) {
      return fallback();
    }
    const maxLength = error.params.maxLength;
    if (typeof maxLength !== "number" || !Number.isSafeInteger(maxLength) || maxLength <= 0) {
      return fallback();
    }
    return translate(errorKeys.INPUT_TOO_LONG, locale, { maxLength });
  }

  return translate(errorKeys[code as ErrorCode], locale);
}
