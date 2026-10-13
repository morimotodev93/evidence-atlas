import type { Browser, BrowserContext, BrowserType, CDPSession } from "@playwright/test";
import { exactProbeRequest, probeFailure, PROBE_CLEANUP_MS, PROBE_TARGET, PROBE_TIMEOUT_MS, type PausedRequest, type ProbeCode } from "./c2-browser-https-probe-policy.ts";

// Injection is solely for offline tests. Runtime uses the installed Chromium.
export async function runProbe(engine: Pick<BrowserType, "launch">, env: Record<string, string>, report: (code: ProbeCode) => void): Promise<ProbeCode> {
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let cdp: CDPSession | undefined;
  let stopped = false;
  let terminal: ProbeCode | undefined;
  let resolveResult!: (code: ProbeCode) => void;
  const result = new Promise<ProbeCode>((resolve) => { resolveResult = resolve; });
  const finish = (code: ProbeCode) => {
    if (stopped) return;
    stopped = true; terminal = code; resolveResult(code); report(code);
  };
  const timer = setTimeout(() => finish("HTTPS_TIMEOUT"), PROBE_TIMEOUT_MS);
  const startedAt = Date.now();
  const left = () => Math.max(1, PROBE_TIMEOUT_MS - (Date.now() - startedAt));
  let rootFrame = "";
  let approvedId: string | undefined;
  let networkId: string | undefined;
  let intentionalAbort = false;
  const abort = async (requestId: string): Promise<boolean> => {
    // Never disable/detach Fetch while a response is paused: that can release it.
    intentionalAbort = true;
    try {
      await cdp!.send("Fetch.failRequest", { requestId, errorReason: "Aborted" });
      return true;
    } catch {
      finish("HTTPS_ABORT_FAILED"); // No response result may be claimed without abort acknowledgement.
      return false;
    }
  };
  const paused = async (event: PausedRequest) => {
    try {
      if (stopped) { await abort(event.requestId); return; }
      const responseStage = event.responseStatusCode !== undefined || event.responseErrorReason !== undefined;
      if (!exactProbeRequest(event, rootFrame)) {
        if (await abort(event.requestId)) finish(responseStage ? "HTTPS_RESPONSE_METADATA_MISMATCH" : "HTTPS_REQUEST_METADATA_MISMATCH");
        return;
      }
      if (!responseStage) {
        if (approvedId) {
          // IDs are compared only; never log identifiers or relax the one-request gate.
          const code: ProbeCode = event.requestId === approvedId ? "HTTPS_REPAUSED_FETCH_ID"
            : networkId && event.networkId === networkId ? "HTTPS_SECOND_FETCH_SAME_NETWORK"
            : "HTTPS_SECOND_FETCH_UNLINKED";
          if (await abort(event.requestId)) finish(code);
          return;
        }
        approvedId = event.requestId; networkId = event.networkId;
        report("HTTPS_REQUEST_STARTED");
        // The only continuation is one reviewed request, before native Chromium
        // DNS/TCP/TLS. Response interception is also explicitly requested here.
        try {
          await cdp!.send("Fetch.continueRequest", { requestId: event.requestId, interceptResponse: true });
        } catch {
          finish("HTTPS_CONTINUE_FAILED");
        }
        return;
      }
      if (!approvedId || (event.requestId !== approvedId && (!networkId || event.networkId !== networkId))) {
        if (await abort(event.requestId)) finish("HTTPS_RESPONSE_ID_MISMATCH"); return;
      }
      let code: ProbeCode;
      if (event.responseErrorReason) code = probeFailure(event.responseErrorReason);
      else if (!Number.isInteger(event.responseStatusCode) || event.responseStatusCode! < 200 || event.responseStatusCode! > 599) code = "HTTPS_PROBE_REFUSED";
      else code = event.responseStatusCode! >= 300 && event.responseStatusCode! < 400 ? "HTTPS_REDIRECT_REFUSED" : "HTTPS_RESPONSE_RECEIVED";
      // Abort every response at headers: no Location follow, body consumption,
      // remote document/JS rendering, response forwarding or credential prompt.
      if (await abort(event.requestId)) finish(code);
    } catch { finish("HTTPS_PROBE_REFUSED"); }
  };
  const setup = async () => {
    browser = await engine.launch({ headless: true, channel: "chromium", timeout: left(), env });
    if (stopped) { await browser.close(); return; }
    report("CHROMIUM_STARTED");
    context = await browser.newContext({ serviceWorkers: "block", javaScriptEnabled: false, acceptDownloads: false, ignoreHTTPSErrors: false });
    if (stopped) { await context.close(); return; }
    const page = await context.newPage();
    if (stopped) return;
    cdp = await context.newCDPSession(page);
    if (stopped) return;
    const tree = await cdp.send("Page.getFrameTree");
    rootFrame = tree.frameTree.frame.id;
    if (!rootFrame) { finish("HTTPS_PROBE_REFUSED"); return; }
    if (stopped) return;
    cdp.on("Fetch.requestPaused", (event: PausedRequest) => { void paused(event); });
    cdp.on("Fetch.authRequired", (event: { requestId: string }) => {
      intentionalAbort = true;
      void cdp!.send("Fetch.continueWithAuth", { requestId: event.requestId, authChallengeResponse: { response: "CancelAuth" } })
        .then(() => finish("HTTPS_AUTH_CHALLENGE_REFUSED"), () => finish("HTTPS_PROBE_REFUSED"));
    });
    cdp.on("Network.loadingFailed", (event: { requestId: string; errorText: string }) => {
      if (!stopped && !intentionalAbort && networkId && event.requestId === networkId) finish(probeFailure(event.errorText));
    });
    context.on("close", () => finish("HTTPS_CANCELED"));
    browser.on("disconnected", () => finish("HTTPS_CANCELED"));
    await cdp.send("Network.enable");
    if (stopped) return;
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    if (stopped) return;
    // No context.route: Playwright's normal route manager enables Request stage
    // only and could overwrite the CDP Response-stage containment.
    await cdp.send("Fetch.enable", { handleAuthRequests: true, patterns: [
      { urlPattern: "*", requestStage: "Request" }, { urlPattern: "*", requestStage: "Response" },
    ] });
    if (stopped) return;
    // Browser-native navigation. Expected rejection follows our response abort;
    // generic goto exception text is never interpreted or printed.
    void page.goto(PROBE_TARGET, { waitUntil: "commit", timeout: left() }).catch((error: unknown) => {
      if (!stopped && !intentionalAbort) finish(error instanceof Error && error.name === "TimeoutError" ? "HTTPS_TIMEOUT" : "HTTPS_NAVIGATION_FAILED");
    });
  };
  const work = setup().catch((error: unknown) => finish(error instanceof Error && error.name === "TimeoutError" ? "HTTPS_TIMEOUT" : "HTTPS_PROBE_REFUSED"));
  try {
    await result;
  } finally {
    clearTimeout(timer); stopped = true;
    // Close both even if one rejects. Paused Fetch remains enabled until the page
    // is destroyed. Bound cleanup separately; a missing ack is explicit failure.
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = Promise.allSettled([
      context?.close() ?? Promise.resolve(), browser?.close() ?? Promise.resolve(), work,
    ]).then((results) => results.every((entry) => entry.status === "fulfilled"));
    const cleaned = await Promise.race([cleanup, new Promise<boolean>((resolve) => { cleanupTimer = setTimeout(() => resolve(false), PROBE_CLEANUP_MS); })]);
    if (cleanupTimer) clearTimeout(cleanupTimer);
    if (!cleaned) { report("HTTPS_CLEANUP_FAILED"); terminal = "HTTPS_PROBE_REFUSED"; }
  }
  return terminal ?? "HTTPS_PROBE_REFUSED";
}
