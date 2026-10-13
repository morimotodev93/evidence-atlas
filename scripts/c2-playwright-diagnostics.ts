export const BOOTSTRAP_CODES = [
  "APP_PREFLIGHT_FAILED", "BROWSER_START_FAILED", "APP_NAVIGATION_FAILED", "SIGNIN_READY", "SIGNIN_UNAVAILABLE",
  "COSMETIC_ICON_LOCAL", "BLOCKED_C2_RESOURCE", "BLOCKED_C2_NAVIGATION", "BLOCKED_EXTERNAL_RESOURCE", "BLOCKED_EXTERNAL_NAVIGATION",
  "AUTH_SUBMIT", "AUTH_REDIRECT", "AUTH_LOCAL_REDIRECT", "AUTH_RESPONSE_INVALID", "REDIRECT_REFUSED", "REDIRECT_STATUS_UNSUPPORTED", "FETCH_FAILED", "FULFILL_FAILED",
  "GOOGLE_NAVIGATION", "LOCAL_RETURN", "NETWORK_REFUSED", "MANUAL_WAIT_FAILED", "RETURN_INVALID", "SESSION_VERIFICATION_FAILED", "STATE_SAVE_FAILED", "STATE_SAVED",
] as const;
export type BootstrapCode = typeof BOOTSTRAP_CODES[number];
export function bootstrapDiagnostic(value: unknown): string {
  // Runtime allowlist prevents an accidentally passed error/URL from escaping.
  const code = typeof value === "string" && (BOOTSTRAP_CODES as readonly string[]).includes(value) ? value : "UNKNOWN";
  return `C2 bootstrap [${code}].`;
}
