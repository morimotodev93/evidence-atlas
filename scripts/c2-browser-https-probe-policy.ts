export const PROBE_TARGET = "https://accounts.google.com/robots.txt";
export const PROBE_TIMEOUT_MS = 15_000;
export const PROBE_CLEANUP_MS = 5_000;
export const PROBE_CODES = [
  "CHROMIUM_STARTED", "HTTPS_REQUEST_STARTED", "HTTPS_RESPONSE_RECEIVED", "HTTPS_REDIRECT_REFUSED",
  "HTTPS_DNS_FAILURE", "HTTPS_TLS_FAILURE", "HTTPS_NETWORK_FAILURE", "HTTPS_FAILURE_UNCLASSIFIED",
  "HTTPS_TIMEOUT", "HTTPS_PROBE_REFUSED", "HTTPS_CANCELED", "HTTPS_AUTH_CHALLENGE_REFUSED", "HTTPS_CLEANUP_FAILED",
  "HTTPS_CONTINUE_FAILED", "HTTPS_REQUEST_MISMATCH", "HTTPS_ABORT_FAILED", "HTTPS_NAVIGATION_FAILED",
  "HTTPS_REQUEST_METADATA_MISMATCH", "HTTPS_DUPLICATE_REQUEST", "HTTPS_RESPONSE_METADATA_MISMATCH", "HTTPS_RESPONSE_ID_MISMATCH",
  "HTTPS_REPAUSED_FETCH_ID", "HTTPS_SECOND_FETCH_SAME_NETWORK", "HTTPS_SECOND_FETCH_UNLINKED",
] as const;
export type ProbeCode = typeof PROBE_CODES[number];
export type PausedRequest = {
  requestId: string; request: { url: string; method: string }; frameId: string; resourceType: string;
  networkId?: string; redirectedRequestId?: string; responseStatusCode?: number; responseErrorReason?: string;
};
export function probeDiagnostic(value: unknown) {
  const code = typeof value === "string" && (PROBE_CODES as readonly string[]).includes(value) ? value : "HTTPS_PROBE_REFUSED";
  return `C2 HTTPS probe [${code}].`;
}
export function prepareProbe(args: readonly string[], inherited: Record<string, string | undefined>, execArgv: readonly string[] = []) {
  if (args.length !== 1 || args[0] !== "--allow-c2-network-probe" ||
    execArgv.some((arg) => /^-r|^--(?:require|import|(?:experimental-)?loader)(?:=|$)/.test(arg)) ||
    Object.entries(inherited).some(([key, value]) => value && /^(NODE_OPTIONS|NODE_PATH|NODE_DEBUG(?:_NATIVE)?|DEBUG|PWDEBUG|PW_.*|PLAYWRIGHT_.*|HTTPS?_PROXY|ALL_PROXY)$/i.test(key))) throw new Error("Probe invocation refused.");
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(inherited)) {
    if (value !== undefined && /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|LANG|LC_ALL|TZ)$/i.test(key)) env[key] = value;
  }
  return env; // No database, OAuth, user/session, provider or inherited proxy data.
}
export function exactProbeRequest(event: PausedRequest, frameId: string) {
  return event.request.url === PROBE_TARGET && event.request.method === "GET" && event.frameId === frameId &&
    event.resourceType === "Document" && !event.redirectedRequestId;
}
export function probeFailure(value: unknown): ProbeCode {
  if (typeof value !== "string") return "HTTPS_FAILURE_UNCLASSIFIED";
  if (["net::ERR_NAME_NOT_RESOLVED", "NameNotResolved"].includes(value)) return "HTTPS_DNS_FAILURE";
  if (["net::ERR_SSL_PROTOCOL_ERROR", "net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH", "net::ERR_CERT_AUTHORITY_INVALID", "net::ERR_CERT_DATE_INVALID", "net::ERR_CERT_COMMON_NAME_INVALID"].includes(value)) return "HTTPS_TLS_FAILURE";
  if (["net::ERR_CONNECTION_CLOSED", "net::ERR_CONNECTION_RESET", "net::ERR_CONNECTION_REFUSED", "net::ERR_TIMED_OUT", "ConnectionClosed", "ConnectionReset", "ConnectionRefused", "ConnectionFailed", "TimedOut", "InternetDisconnected"].includes(value)) return "HTTPS_NETWORK_FAILURE";
  if (value === "net::ERR_ABORTED" || value === "Aborted") return "HTTPS_CANCELED";
  return "HTTPS_FAILURE_UNCLASSIFIED";
}
