# C2 native Chromium HTTPS probe — out-of-process egress isolation design review

> **Status: DESIGN ONLY / NO LIVE RUN APPROVED** — 2026-10-13 JST  
> **Scope:** The standalone fixed-target diagnostic probe, not normal C2 OAuth or E2E.  
> **Decision:** Keep existing PR #1 Draft. No runtime code, host networking policy, browser, VM, OAuth, fixture or database operation is authorized by this document.

## 1. Why this review exists

The developer's sequence of standalone live native Chromium probes progressed from
`HTTPS_PROBE_REFUSED` through `HTTPS_REQUEST_MISMATCH` and
`HTTPS_DUPLICATE_REQUEST` to
`CHROMIUM_STARTED → HTTPS_REQUEST_STARTED → HTTPS_SECOND_FETCH_SAME_NETWORK`
(`ExitCode=1`). The latter repeated after universal Fetch Response interception
was removed, leaving universal Request interception and per-request
`interceptResponse: true`. The latest source revision passed developer-reported
**72/72** focused mocked Vitest tests, TypeScript, targeted ESLint and diff check.

**Established:** a second matching *request-stage CDP pause* had a distinct
Fetch request ID but the same present Network request ID; the probe aborted it.
**Not established:** a second outbound HTTP GET, response headers, a DNS/TLS
failure, a Chromium defect, or the original Auth.js/Google OAuth stall's cause.

CDP Fetch.RequestId is not a one-to-one identifier for HTTP requests. We should
not turn a repeated CDP pause into permission to issue a second
`Fetch.continueRequest`, or keep increasing diagnostic codes.

## 2. Security invariants (do not silently weaken)

1. Only the explicit, reviewed `https://accounts.google.com/robots.txt`
   navigation is requested; no alternate URL, method, query, fragment, redirect
   hop, OAuth endpoint, or local Evidence Atlas endpoint.
2. **One on-wire HTTP GET at most** was the original strict objective. If
   architecture cannot independently prove this, mark it **UNMET**; neither
   one CDP event nor one CONNECT tunnel establishes it.
3. No other outbound destination is reachable from the *probe browser
   workload*. This requires a network boundary **outside Chromium**, not
   merely Playwright proxy options or page-scoped CDP.
4. Chromium validates Google's normal TLS certificate. No
   `ignoreHTTPSErrors`, custom trust CA, TLS MITM, security flags, or
   certificate/proxy bypass.
5. No response body, cookies, bearer tokens, OAuth URL/state, browser profile,
   app/User/DB credentials or fixture identity is imported, emitted or saved.
6. No browser JS, service worker, download, persistent profile or retries.
   Fail closed on unexpected navigation, second pause, auth challenge, proxy
   error, missing enforcement or cleanup failure.
7. Bounded measurement (15 seconds) and cleanup (5 seconds) remain a target,
   but VM/gateway teardown must have **its own verified bounds** rather than
   claiming those existing timeouts cover infrastructure cleanup.
8. C2 eight-row fixture is read-only/protected; no application server,
   OAuth bootstrap, Playwright C2 E2E, seed/reset/migration, or host-wide
   firewall/DNS/proxy/certificate change.

## 3. Security boundaries, not just observability

### Recommended candidate (only if host-only egress is accepted)

```text
Unmodified developer browser / C2 app / eight-row fixture
                         (not involved)
                                   |
                    Disposable, credential-free VM
                    ┌─────────────────────────────┐
                    │ Chromium + fresh Playwright  │
                    │ ephemeral browser context    │
                    │ no direct Internet route     │
                    │ outbound DENY by default     │
                    │ allow only gateway IP:port   │
                    └──────────────┬──────────────┘
                                   │ isolated virtual switch
                                   ▼
                    Fixed-policy HTTPS CONNECT gateway
                    - no open-proxy mode or bypass
                    - deny HTTP forward/other methods
                    - allow only CONNECT accounts.google.com:443
                    - at most one tunnel per run
                    - deny any other host/port and redirects to them
                    - DNS resolved/checked by trusted gateway
                                   │ TLS tunnel: bytes NOT decrypted
                                   ▼
                        accounts.google.com:443
```

The VM must have **no unrestricted second NIC, NAT escape, alternate gateway,
IPv6 route, outbound DNS/DoH, UDP/QUIC or direct TCP path**. A documented,
working deny-by-default **guest/virtual-network outbound policy** must be
independently checked, not inferred from creation of an Internal/Private
Hyper-V virtual switch. The only guest egress allowed is to the gateway
endpoint. The CONNECT gateway is a separate trusted enforcement service,
reachable only from that guest, with one-run lifetime and explicit
`accounts.google.com:443` authority allowlist. Deny CONNECT to IP literals,
alternate ports, non-CONNECT requests, proxy chaining and additional tunnels.
The gateway must not forward any unapproved destination. Treat gateway DNS
resolution and any host firewall exceptions as privileged implementation
details requiring explicit review; avoid globally modifying host settings.

Keep native browser-to-Google TLS end-to-end inside CONNECT: no TLS
interception, no private CA, and no acceptance of certificate errors.
Playwright's documented `browserType.launch({proxy:{server}})` can select
the proxy, but **that option is routing configuration, not a security
boundary**; a verified deny-by-default VM network policy must prevent
direct/browser-background bypass. A tunnel-count limit does not prove
one HTTP GET because HTTP/1.1 keep-alive or HTTP/2 may carry multiple
requests inside one encrypted connection.

An optional browser-level URL/method gate can preserve the original fixed
navigation intent and a response-stage abort on 3xx. It remains
**defense-in-depth**, not independent proof of a single on-wire GET or of
redirect containment for a second path *on the same allowed hostname*.
A redirect to another hostname would be denied by the external gateway;
same-host redirects cannot be distinguished by CONNECT alone.

### Why other proposed shortcuts are not accepted

| Alternative | What it could show | Why it is insufficient |
| --- | --- | --- |
| Retry current CDP gate and continue second Fetch pause on shared networkId | Possibly more progress | Fetch identity is not on-wire request identity; violates the one-continuation policy without evidence |
| Playwright proxy setting alone on host Windows | Requests that honor proxy use it | Browser/system traffic or misconfiguration can bypass; not a verified external egress restriction |
| Windows host-wide Firewall rule or global proxy switch | Constrains some connections | Risks affecting the developer's browser/C2/network; violates no-global-settings rule |
| Standalone container/VM with default networking | Process isolation | Neither implies outbound deny by default; enforcement must be checked explicitly |
| Destination-IP-only firewall allowlist | Blocks unrelated IP/port | DNS/CDN changes, shared hosts and TLS paths: not exact hostname/path/GET control |
| One CONNECT tunnel through HTTPS proxy | Restricts destination/tunnel count | Tunnel is opaque TLS; multiple HTTP requests or same-host redirect can traverse it |
| TLS-inspecting MITM proxy | Can check path, GET count and redirect | Breaks the native unmodified Chromium→Google TLS assurance and needs injected trust; **rejected** |
| Node fetch, Windows TCP or browser event counter | Useful narrower data | Not the native Chromium HTTPS response under the original security contract |

Microsoft documents Hyper-V Internal versus Private virtual switches; neither
alone constitutes outbound policy. Microsoft's Windows-container guidance
also documents permissive outbound defaults. Exact hypervisor support,
edition, virtual switch, firewall capabilities and effective policy on this
developer's Windows machine have **not been inspected**.

## 4. Control matrix / failure handling

| Risk | Required control outside CDP | Residual limitation / stop condition |
| --- | --- | --- |
| Unrelated Chrome background endpoint | VM outbound deny-all, single gateway allow | Blocked attempts must fail closed; cannot trust browser proxy setting alone |
| Direct IPv4/IPv6 or QUIC bypass | No direct guest route; deny both IP families and UDP | Any unverified route means **NO-GO** |
| Wrong hostname, proxy abuse | Gateway strict `CONNECT accounts.google.com:443` policy; no HTTP-forward mode | Trusted gateway still needs reviewed DNS resolution/upstream target |
| Redirect to different hostname | Gateway rejects new CONNECT destination | Same-host redirects are **not** stopped by CONNECT visibility |
| A second GET inside same HTTPS tunnel | No reliable external counter without TLS visibility | **UNMET** under non-MITM native TLS; do not call a CONNECT count an HTTP count |
| Expired/untrusted/mismatched TLS cert | Normal Chromium certificate validation | No override permitted; cannot infer validation from gateway CONNECT success |
| Browser auth challenge | No credentials, cancel or terminate | Challenge is not an OAuth success |
| Browser/gateway/VM remains running | Independent bounded teardown and kill *only scoped disposable resources* | No success claim until verified cleanup; never kill unrelated Chrome |
| Tokens/files/logs | Empty ephemeral guest, no mounted user profile, fixed aggregate codes only | No packet/HAR/keylog/body storage, no CDP raw error output |

## 5. Decision: hard one-GET requirement versus destination isolation

The current original requirements include both:
- **Native, unmodified Chromium→Google TLS**; and
- **At most one HTTPS GET for an exact path, no same-host redirect hop**.

An HTTPS CONNECT proxy and network firewall **cannot independently enforce
the second requirement**, because the HTTP method, path, response status and
subsequent HTTP messages are inside encrypted TLS. A single tunnel may
carry multiple HTTP requests; even a perfect destination allowlist does not
restrict `/robots.txt`. A TLS-intercepting gateway could see those details
but would fundamentally change the native TLS experiment and is excluded.

**Decision: NO-GO on a new live probe under the unchanged strict contract.**
The candidate VM + CONNECT gateway is **conditionally acceptable for a
different, explicitly approved question**: "Can this isolated native Chromium
negotiate TLS and receive a response from the Google host while other
destinations are prevented?" That narrower test would still need
separate response-stage validation and clear caveats, plus a reviewed
implementation. It must not silently stand in for the exact one-GET proof.
If the strict original contract is non-negotiable, stop this route and
continue static Chromium/Playwright source investigation only.

## 6. Design review gate for any later implementation

No live execution until a future separately authorized review records:

- [ ] Explicit acceptance/rejection of the **weaker host-only egress** assurance
      and unchanged strict one-GET requirement (the latter remains unmet).
- [ ] Hypervisor availability/version and VM isolation enforcement options
      actually checked on the local Windows machine (no assumptions).
- [ ] Single-purpose VM and gateway lifecycles, with exact cleanup and
      rollback scope; host-wide settings and existing browser profiles untouched.
- [ ] Effective deny-all guest egress policy verified for IPv4, IPv6, DNS,
      UDP/QUIC and direct TCP; only gateway IP:port works.
- [ ] Gateway policies reviewed to deny non-target CONNECT, non-CONNECT,
      redirects to other hosts, proxy chaining and additional tunnels.
- [ ] Browser TLS verification unchanged; no MITM, custom CA, insecure flags,
      credential/state mounts, persistent profiles, downloads or app endpoints.
- [ ] Negative tests prove denials without contacting Google; keep tests
      targeted, do not build extensive synthetic mock suites.
- [ ] Bounded teardown independently proved for gateway and VM; diagnostics
      have a fixed-code allowlist and no personal/HTTP/TLS content.
- [ ] A **new explicit approval** is recorded before any single live execution.
      OAuth, C2 E2E and database/fixture operations remain disallowed.

**Current recommendation:** Stop at design review. Do not add a proxy,
VM/firewall configuration, new live harness or more diagnostic codes to PR #1
until the host-only-versus-exact-request guarantee decision is made.

## References

1. Chrome DevTools Protocol, Fetch domain: https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/Fetch.pdl
2. HTTP Semantics RFC 9110, CONNECT §9.3.6: https://www.rfc-editor.org/rfc/rfc9110.html#section-9.3.6
3. Playwright proxy configuration: https://playwright.dev/docs/network#http-proxy
4. Microsoft Hyper-V networking (internal/private virtual switches):
   https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/plan/plan-hyper-v-networking-in-windows-server
5. Microsoft Windows containers: network isolation/security:
   https://learn.microsoft.com/en-us/virtualization/windowscontainers/container-networking/network-isolation-security
6. Existing C2 evidence and stop condition: `docs/planning/c2-local-runtime.md`,
   Steps 4-B3 through 4-B6.
