// Match only exact framework fixture titles and our own static step labels.
// Never emit a received title, error, parameters, URL, locator or test identity.
const steps = [
  ["fixture", 'Fixture "browser"', "BROWSER_FIXTURE"],
  ["fixture", 'Fixture "context"', "CONTEXT_FIXTURE"],
  ["fixture", 'Fixture "page"', "PAGE_FIXTURE"],
  ["fixture", 'Fixture "assertNetwork"', "NETWORK_FIXTURE"],
  ["fixture", 'Fixture "conversationMocks"', "CHAT_MOCK_FIXTURE"],
  ["test.step", "C2 fixture config", "CONTEXT_CONFIG"],
  ["test.step", "C2 fixture state", "CONTEXT_STATE"],
  ["test.step", "C2 context creation", "CONTEXT_CREATE"],
  ["test.step", "C2 loopback permission", "LOOPBACK_PERMISSION"],
  ["test.step", "C2 network installation", "NETWORK_INSTALL"],
  ["test.step", "C2 context preflight", "CONTEXT_PREFLIGHT"],
  ["test.step", "C2 navigation", "NAVIGATION"],
  ["test.step", "C2 context close", "CONTEXT_CLOSE"],
  ["test.step", "C2 Chat research heading", "CHAT_RESEARCH_HEADING"],
  ["test.step", "C2 Chat panel", "CHAT_PANEL"],
  ["test.step", "C2 Chat initial state", "CHAT_INITIAL_STATE"],
  ["test.step", "C2 Chat creation", "CHAT_CREATE"],
] as const;
type Outcome = "ENTERED" | "OK" | "FAILED";
const caseLabels = ["CASE_1", "CASE_2", "CASE_3", "CASE_4", "CASE_5", "CASE_6"] as const;
type CaseCode = `${typeof caseLabels[number]}_${"PASSED" | "FAILED"}`;
export type C2ScenarioCode = `${typeof steps[number][2]}_${Outcome}` | "ASSERTION_FAILED" | CaseCode;

const networkCodes = [
  "NET_METHOD_REFUSED", "NET_ORIGIN_REFUSED", "NET_PATH_REFUSED", "NET_QUERY_REFUSED",
  "NET_STATIC_REFUSED", "NET_DEVTOOLS_REFUSED", "NET_WEBSOCKET_REFUSED", "NET_FRAME_REFUSED",
  "NET_REDIRECT_REFUSED", "NET_FETCH_FAILED", "NET_FULFILL_FAILED", "NET_POLICY_REFUSED",
  "NET_REDIRECT_TO_AUTH", "NET_REDIRECT_TO_ONBOARDING", "NET_REDIRECT_LOCAL", "NET_REDIRECT_EXTERNAL",
] as const;
export type C2NetworkCode = typeof networkCodes[number];
const networkLines = new Map(networkCodes.map((code) => [`C2 boundary [${code}].`, code]));

export function networkDiagnosticLine(code: C2NetworkCode): string {
  return `C2 boundary [${code}].`;
}

export function parseNetworkDiagnosticLine(line: string): C2NetworkCode | undefined {
  return networkLines.get(line);
}

const knownLines = new Map<string, C2ScenarioCode>();
for (const [, , code] of steps) {
  for (const outcome of ["ENTERED", "OK", "FAILED"] as const) {
    const value = `${code}_${outcome}` as const;
    knownLines.set(`C2 step [${value}].`, value);
  }
}
knownLines.set("C2 step [ASSERTION_FAILED].", "ASSERTION_FAILED");
for (const label of caseLabels) {
  for (const outcome of ["PASSED", "FAILED"] as const) knownLines.set(`C2 case [${label}_${outcome}].`, `${label}_${outcome}`);
}

export function scenarioCaseLine(index: number, passed: boolean): string | undefined {
  if (!Number.isInteger(index) || index < 0 || index >= caseLabels.length) return;
  return `C2 case [${caseLabels[index]}_${passed ? "PASSED" : "FAILED"}].`;
}

export function scenarioStepLine(step: { category: string; title: string }, outcome: Outcome): string | undefined {
  if (step.category === "expect" && outcome === "FAILED") return "C2 step [ASSERTION_FAILED].";
  const entry = steps.find(([category, title]) => step.category === category && step.title === title);
  return entry ? `C2 step [${entry[2]}_${outcome}].` : undefined;
}

export function parseScenarioStepLine(line: string): C2ScenarioCode | undefined {
  return knownLines.get(line);
}
