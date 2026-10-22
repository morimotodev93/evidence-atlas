import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResearchAiPanel } from "./research-ai-panel";

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState<T>(initial: T | (() => T)) {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) {
      hooks.slots[index] = typeof initial === "function" ? (initial as () => T)() : initial;
    }
    return [hooks.slots[index], (next: T | ((previous: T) => T)) => {
      hooks.slots[index] = typeof next === "function"
        ? (next as (previous: T) => T)(hooks.slots[index] as T) : next;
    }];
  },
}));
vi.mock("@/components/ui/button", () => ({ Button: "button" }));
vi.mock("./research-ai-conversations-dialog", () => ({ ResearchAiConversationsDialog: "history-dialog" }));
vi.mock("./research-ai-supporting-sources", () => ({ ResearchAiSupportingSources: "supporting-sources" }));

// Execute the production handler closures and functional state updates with a
// small hook double. No React mount, DOM, browser, network or real SDK is used.
// This does not verify React scheduling, focus, paint or History dialog behavior.
type Element = ReactElement<Record<string, unknown> & { children?: ReactNode }>;
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Element["props"]>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function view() {
  hooks.cursor = 0;
  return elements(ResearchAiPanel({ researchId: "research-id", sources: [] }));
}
function button(label: string) {
  const element = view().find((node) => node.type === "button" && node.props.children === label);
  expect(element, `button ${label}`).toBeDefined();
  return element!;
}
function textarea() {
  return view().find((node) => node.type === "textarea")!;
}
function alerts() {
  return view().filter((node) => node.props.role === "alert").map((node) => node.props.children);
}
function messageTexts() {
  return view().filter((node) => node.type === "p" &&
    String(node.props.className).includes("whitespace-pre-wrap")).map((node) => node.props.children);
}
function typeMessage(text: string) {
  (textarea().props.onChange as (event: { target: { value: string } }) => void)({ target: { value: text } });
}
function click(label: string) {
  return (button(label).props.onClick as () => Promise<void>)();
}
const fetchMock = vi.fn<typeof fetch>();
async function startConversation() {
  fetchMock.mockResolvedValueOnce(Response.json({ id: "conversation-id", researchId: "research-id" }));
  await click("New");
}
function streamResponse() {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const cancel = vi.fn();
  const response = new Response(new ReadableStream<Uint8Array>({
    start(value) { controller = value; }, cancel,
  }));
  return {
    response, cancel,
    chunk(text: string) { controller.enqueue(new TextEncoder().encode(text)); },
    error(error: Error) { controller.error(error); },
    close() { controller.close(); },
  };
}
async function expectPartial(text: string) {
  // Bounded microtask drain; a failed assertion cannot hang on a pending read.
  for (let i = 0; i < 30 && !messageTexts().includes(text); i++) await Promise.resolve();
  expect(messageTexts()).toContain(text);
}
function detail(messages: { authorType: string; content: string }[] = []) {
  return Response.json({ id: "conversation-id", researchId: "research-id", messages, sources: [] });
}

beforeEach(() => {
  hooks.slots = [];
  hooks.cursor = 0;
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => { throw new Error("Unexpected offline fetch"); });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Chat panel synthetic stream handlers (not mounted browser recovery)", () => {
  it.each(["Error", "AbortError"])("drops partial display and releases sending after read rejects with %s", async (name) => {
    await startConversation();
    typeMessage("Question");
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response);
    const sending = click("Send");
    expect(button("Sending...").props.disabled).toBe(true);
    expect(textarea().props.disabled).toBe(true);
    stream.chunk("Partial answer");
    await expectPartial("Partial answer");
    stream.error(new DOMException("Synthetic private stream failure", name));
    await sending;
    expect(messageTexts()).toEqual([]);
    expect(alerts()).toEqual(["Failed to send message."]);
    expect(textarea().props.value).toBe(""); // Draft is not restored.
    expect(textarea().props.disabled).toBe(false);
    typeMessage("Question");
    expect(button("Send").props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2); // New + send; no automatic retry/refresh.
    const init = fetchMock.mock.calls[1][1];
    expect(init).not.toHaveProperty("signal");
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(view().some((node) => node.props.children === "Stop")).toBe(false);
  });

  it.each(["success", "failure"])("clears the prior sendError when a valid resend starts, then handles %s", async (outcome) => {
    await startConversation();
    typeMessage("Question");
    fetchMock.mockRejectedValueOnce(new Error("Synthetic fetch failure"));
    await click("Send");
    expect(alerts()).toEqual(["Failed to send message."]);
    typeMessage("Question");
    expect(alerts()).toEqual(["Failed to send message."]); // Editing alone keeps the error.
    const retry = streamResponse();
    fetchMock.mockResolvedValueOnce(retry.response);
    if (outcome === "success") fetchMock.mockResolvedValueOnce(detail());
    const sending = click("Send");
    const alertsAtSendStart = alerts();
    expect(button("Sending...").props.disabled).toBe(true);
    expect(textarea().props.disabled).toBe(true);
    if (outcome === "success") {
      retry.chunk("Retry answer");
      retry.close();
    } else {
      retry.error(new Error("Synthetic retry failure"));
    }
    await sending;
    expect(alertsAtSendStart).toEqual([]);
    expect(messageTexts()).toEqual(outcome === "success" ? ["Question", "Retry answer"] : []);
    expect(textarea().props.disabled).toBe(false);
    expect(alerts()).toEqual(outcome === "success" ? [] : ["Failed to send message."]);
    const sends = fetchMock.mock.calls.filter(([url]) => url === "/research/research-id/chat");
    expect(sends).toHaveLength(2);
    expect(sends[0][1]?.body).toBe(sends[1][1]?.body);
    expect(JSON.parse(String(sends[1][1]?.body))).toEqual({ conversationId: "conversation-id", message: "Question" });
  });

  it("keeps the sendError when a blank submission is rejected by the handler guard", async () => {
    await startConversation();
    typeMessage("Question");
    fetchMock.mockRejectedValueOnce(new Error("Synthetic fetch failure"));
    await click("Send");
    expect(alerts()).toEqual(["Failed to send message."]);
    typeMessage(" \t\n ");
    expect(button("Send").props.disabled).toBe(true);
    // Call the handler directly to check the guard, without a browser click.
    await click("Send");
    expect(alerts()).toEqual(["Failed to send message."]);
    expect(messageTexts()).toEqual([]);
    expect(textarea().props.value).toBe(" \t\n ");
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2); // New + failed send only.
  });

  it.each(["Partial answer", ""])("accepts clean EOF with body %j without a completion/persistence signal", async (text) => {
    await startConversation();
    typeMessage("Question");
    const stream = streamResponse();
    // This fixture represents a non-stop/no-onFinish stream. No SDK claim.
    fetchMock.mockResolvedValueOnce(stream.response).mockResolvedValueOnce(detail([
      { authorType: "USER", content: "Question" },
    ]));
    const sending = click("Send");
    if (text) stream.chunk(text);
    stream.close();
    await sending;
    expect(messageTexts()).toEqual(["Question", text]);
    expect(alerts()).toEqual([]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // Refresh only consumes sources, so server history lacking AI is ignored.
    expect(fetchMock.mock.calls[2][0]).toBe("/research/research-id/chat/conversations/conversation-id");
  });

  it("keeps streamed display and shows no alert when the post-stream history refresh fails", async () => {
    await startConversation();
    typeMessage("Question");
    fetchMock.mockResolvedValueOnce(new Response("Raw answer"))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    await click("Send");
    expect(messageTexts()).toEqual(["Question", "Raw answer"]);
    expect(alerts()).toEqual([]);
    expect(textarea().props.disabled).toBe(false);
    expect(console.error).toHaveBeenCalledWith("Failed to refresh conversation sources.", expect.any(Error));
  });

  it("preserves earlier turns on send failure, then restores the server USER through the History callback", async () => {
    await startConversation();
    const history = () => view().find((node) => typeof node.props.onSelectConversation === "function")!;
    fetchMock.mockResolvedValueOnce(detail([
      { authorType: "USER", content: "Earlier question" },
      { authorType: "AI", content: "Earlier answer" },
    ]));
    const restore = () => (history().props.onSelectConversation as (id: string) => Promise<boolean>)("conversation-id");
    expect(await restore()).toBe(true);
    typeMessage("Failed question");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await click("Send");
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(alerts()).toEqual(["Failed to send message."]);
    fetchMock.mockResolvedValueOnce(detail([
      { authorType: "USER", content: "Earlier question" },
      { authorType: "AI", content: "Earlier answer" },
      { authorType: "USER", content: "Failed question" },
    ]));
    expect(await restore()).toBe(true);
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer", "Failed question"]);
    expect(alerts()).toEqual([]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
