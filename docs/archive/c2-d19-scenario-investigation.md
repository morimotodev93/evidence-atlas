# C2 D19 scenario investigation and bounded diagnostics

> **Historical status note (2026-10-17 JST):** This document preserves the
> investigation-stage status and stop conditions stated below. References to
> PR #1 as Draft/unmerged or authenticated C2 E2E as pending are historical:
> [PR #1](https://github.com/morimotodev93/evidence-atlas/pull/1) merged
> into `main` at `969af82`. Bounded C2 Smoke 4/4 and Chat mock-only 6/6 were
> developer-reported passes, not Google OAuth or real Chat/AI E2E verification.
> This update grants no authorization for new live operations. See the
> [current roadmap](../planning/roadmap.md#phase-10--testing--quality).

Date: 2026-10-16 JST. Baseline: `fd48697` on
`fix/c2-probe-rejection-diagnostics`. This record distinguishes the
developer-reported authenticated run from offline reproduction. Draft PR #1
remains Draft; authenticated Smoke 4 / Chat mock 6 completion remains pending.

## D19 observations supplied by the developer

Both suites passed configuration validation, saved-state validation, runner
HTTP/session preflight and expected case collection. Both then reported a
scenario failure and exited 1. Session revocation and state-file removal
succeeded; fixture verify found all eight protected rows. HTTP preflight does
not establish PostgreSQL container identity. No operation from D19 was repeated
for this investigation.

`SCENARIO_FAILED` alone identifies neither the failing case nor its phase.
The parent deduplicates codes. `RUNNER_SETUP_ERROR` means reporter `onError`
was called; it does not establish a second independent setup failure. Installed
Playwright 1.63 also calls `onError` when the configured failure limit stops a
run. Therefore these observations cannot distinguish browser startup, per-test
fixture setup, navigation, assertion or cleanup failure.

## Confirmed offline defect: Smoke Workspace summary

The actual Home server component, rendered with synthetic authentication and
database dependencies, produces adjacent block elements without intervening
text whitespace. Its summary text is equivalent to:

```text
Workspace SummaryResearch1 Sources1 Findings1 Tags0
```

The previous Smoke summary regex required whitespace between the heading,
each label and each count, so it rejects that valid rendering. This is a
reproducible assertion defect, but is **not proof that D19 reached it**. It
cannot explain the separate Chat failure.

The Smoke assertion now checks all eight label/count paragraphs exactly, in
order, within the named summary region. The Workspace heading and region
visibility checks remain. No expected fixture values changed. Regression tests
use the actual server rendering, the actual Smoke callback and Playwright's
matcher with a synthetic locator protocol boundary. They verify valid text
passes and incorrect counts or extra paragraphs still fail. This is an offline
assertion regression, not a browser rendering/accessibility verification.

## Shared fixture, browser and Chat review

- The actual C2 fixture callbacks were exercised with synthetic browser, state,
  network-boundary and HTTP dependencies. Boundary installation and per-context
  preflight still precede provision of the context. Cleanup and late-request
  refusal still run. Setup failures do not provide a context. Chat mocks remain
  per-context and are disposed when a scenario fails.
- Existing mock conversation tests cover create/list/restore, exact in-memory
  send responses, errors and citations. They passed; this does not prove that
  the live page reached those routes or completed hydration/interactions.
- The configured Chromium and headless-shell executable files exist in the
  investigation environment. No browser was launched. File presence proves
  neither successful launch nor the state of the D19 execution environment.
- No common Chat/root-cause fix is justified by the available evidence.
  Browser options, route allowlists, fixture values, application authentication
  and Chat UI assertions were preserved.

## Diagnostic patch for a future separately authorized observation

The existing redacted reporter now recognizes exact framework fixture titles
and a small set of explicit static `test.step` labels. It emits only fixed
`C2 step [CODE].` lines. The parent accepts only the enumerated complete lines
and converts them to its existing `C2 runner [CODE].` output.

| Fixed code family | What it observes |
| --- | --- |
| `BROWSER_FIXTURE_*`, `CONTEXT_FIXTURE_*`, `PAGE_FIXTURE_*` | Framework fixture entry/completion/failure; fixture events can also describe teardown. |
| `CONTEXT_CONFIG_*`, `CONTEXT_STATE_*`, `CONTEXT_CREATE_*` | Explicit per-context configuration, private-state loading and context creation steps. |
| `NETWORK_INSTALL_*`, `CONTEXT_PREFLIGHT_*` | Network-boundary installation and per-context authenticated preflight. |
| `NAVIGATION_*` | The existing initial `goto`, HTTP-status and exact-URL checks, now grouped as a static step. |
| `NETWORK_FIXTURE_*`, `CHAT_MOCK_FIXTURE_*`, `CONTEXT_CLOSE_*` | Network assertion fixture, Chat mock fixture and explicit context close step. |
| `ASSERTION_FAILED` | An expect step failed; this can include navigation invariants as well as UI checks. |

The suffix is `ENTERED`, `OK` or `FAILED`. Outer fixture failures may propagate
an inner failure; multiple codes do not imply multiple independent causes.
Parent deduplication still hides case counts and repeated instances. A fixture
`*_OK` alone must not be interpreted as a launch-only or setup-only result.

No received test title, step title, URL, locator, parameter, error message,
stack, identity, cookie or state is interpolated into diagnostic output.
Reporter event tests verify unknown labels and lookalikes are dropped, private
error/parameter contents are not read, and worker stdout cannot introduce the
new step lines through reporter forwarding. Trace, screenshot, video and page
snapshot suppression remain unchanged. Network decision logic is unchanged.

## Offline validation

Focused Vitest selection: `c2-playwright-fixtures`, `c2-playwright-summary`,
`c2-scenario-diagnostics`, `c2-runner-diagnostics`,
`c2-playwright-suite-selection`, `c2-playwright`, and
`c2-playwright-conversation-mocks` under `scripts/`.

- Vitest: **203/203 passed across seven files**, exit 0.
- `pnpm exec tsc --noEmit`: passed, exit 0.
- Targeted `pnpm exec eslint` on all nine changed/new TypeScript files:
  passed, exit 0.
- `git diff --check` and separate whitespace checks on new files: passed.

An extended selection also ran the unchanged
`scripts/c2-playwright-navigation.test.ts`: **18 passed / 1 failed**.
The existing line-73 assertion expects unmodified response fulfillment, while
the existing OAuth redirect bridge supplies an HTML response with status 200.
Both this test file and `scripts/c2-playwright-network.ts` match baseline
`fd48697`; the failure was reproduced with that file run independently. It is
recorded separately and left unchanged rather than changing OAuth behavior or
relaxing a test to obtain a green result. This is a synthetic unit-test failure,
not an OAuth request or an explanation of D19's ordinary C2 failure.

The sandbox initially refused esbuild subprocess startup with `EPERM`.
Focused offline Vitest was subsequently allowed outside that sandbox. No C2
server, browser, OAuth, HTTP request, database operation, Session issuance or
fixture operation was performed. The unrelated untracked planning documents
were left untouched. No commit, push, staging or PR state change was performed.

## Remaining gate

The confirmed Smoke assertion defect is fixed and bounded diagnostics are
prepared. The historical D19 failure phase and Chat failure remain unresolved.
Another Session operation or authenticated E2E run requires fresh explicit user
authorization. This record grants none and provides no live execution command.
Do not mark the ten authenticated scenarios or Phase 10 complete from offline
results.
