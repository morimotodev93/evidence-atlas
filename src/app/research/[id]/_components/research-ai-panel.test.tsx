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
  useRef<T>(initial: T) {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
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
function statuses() {
  return view().filter((node) => node.props.role === "status").map((node) => node.props.children);
}
const refreshedStatus = "Showing saved history from the server. The result of this send could not be confirmed individually.";
const unconfirmedStatus = "The result of this send is unconfirmed. Open History to check saved messages.";
const checkingStatus = "Checking saved history...";
function selectConversation(id = "conversation-id") {
  const history = view().find((node) => typeof node.props.onSelectConversation === "function")!;
  return (history.props.onSelectConversation as (id: string) => Promise<boolean>)(id);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
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
type SavedMessage = { id?: string; authorType: string; content: string };
type Source = { id: string; title: string; url: string };
function detail(messages: SavedMessage[] = [], sources: Source[] = [], id = "conversation-id") {
  return Response.json({ id, researchId: "research-id", messages: messages.map((message, index) => ({
    id: `saved-${index}`, conversationId: id, createdAt: "2026-10-22T00:00:00Z", ...message,
  })), sources });
}
const earlierTurns = [
  { id: "earlier-user", authorType: "USER", content: "Earlier question" },
  { id: "earlier-ai", authorType: "AI", content: "Earlier answer" },
];

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
  it.each(["Error", "AbortError"])("restores saved history and releases sending after read rejects with %s", async (name) => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("Question");
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response).mockResolvedValueOnce(detail([
      ...earlierTurns, { authorType: "USER", content: "Question" },
    ]));
    const sending = click("Send");
    expect(button("Sending...").props.disabled).toBe(true);
    expect(textarea().props.disabled).toBe(true);
    stream.chunk("Partial answer");
    await expectPartial("Partial answer");
    stream.error(new DOMException("Synthetic private stream failure", name));
    await sending;
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer", "Question"]);
    expect(alerts()).toEqual(["Failed to send message."]);
    expect(statuses()).toEqual([refreshedStatus]);
    expect(textarea().props.value).toBe(""); // Draft is not restored.
    expect(textarea().props.disabled).toBe(false);
    typeMessage("Question");
    expect(button("Send").props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4); // New + History + send + one recovery GET.
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2);
    const init = fetchMock.mock.calls[2][1];
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
    fetchMock.mockResolvedValueOnce(detail(outcome === "success" ? [
      { authorType: "USER", content: "Question" },
      { authorType: "AI", content: "Saved retry answer" },
    ] : []));
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
    expect(messageTexts()).toEqual(outcome === "success" ? ["Question", "Saved retry answer"] : []);
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

  it.each(["Partial answer", ""])("replaces temporary body %j with saved history that has no AI", async (text) => {
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
    expect(messageTexts()).toEqual(["Question"]);
    expect(view().some((node) => node.key === "saved-0")).toBe(true);
    expect(statuses()).toEqual([refreshedStatus]);
    expect(alerts()).toEqual([]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe("/research/research-id/chat/conversations/conversation-id");
  });

  it.each(["http", "json", "network"])("keeps earlier turns and reports unconfirmed saving when history refresh fails: %s", async (failure) => {
    await startConversation();
    const oldSource = { id: "old-source", title: "Old source", url: "https://example.invalid/old" };
    const saved = [...earlierTurns, { authorType: "AI", content: "Sourced earlier answer [source:old-source]" }];
    fetchMock.mockResolvedValueOnce(detail(saved, [oldSource]));
    await selectConversation();
    typeMessage("Question");
    fetchMock.mockResolvedValueOnce(new Response("Raw answer"));
    if (failure === "network") fetchMock.mockRejectedValueOnce(new Error("Offline history failure"));
    else fetchMock.mockResolvedValueOnce(failure === "http"
      ? new Response(null, { status: 500 }) : new Response("invalid json"));
    await click("Send");
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer", "Sourced earlier answer"]);
    expect(alerts()).toEqual([]);
    expect(statuses()).toEqual([unconfirmedStatus]);
    expect(textarea().props.disabled).toBe(false);
    typeMessage("Next question");
    expect(button("Send").props.disabled).toBe(false);
    expect(view().find((node) => node.type === "supporting-sources")?.props.sources).toEqual([oldSource]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
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

  it("marks streaming as temporary, checks history once at EOF, and replaces the entire history and sources by saved IDs", async () => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("Question");
    const stream = streamResponse();
    const refresh = deferred<Response>();
    fetchMock.mockResolvedValueOnce(stream.response).mockReturnValueOnce(refresh.promise);
    const sending = click("Send");
    stream.chunk("Raw answer [source:untrusted]");
    await expectPartial("Raw answer");
    expect(statuses()).toEqual(["Generating a temporary response. Saving is not confirmed."]);
    expect(view().some((node) => node.props.children === "AI (temporary)")).toBe(true);
    stream.close();
    for (let i = 0; i < 30 && !statuses().includes(checkingStatus); i++) await Promise.resolve();
    expect(statuses()).toEqual([checkingStatus]);
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(textarea().props.disabled).toBe(true);
    const source = { id: "saved-source", title: "Saved source", url: "https://example.invalid/source" };
    refresh.resolve(detail([
      { id: "changed-earlier", authorType: "AI", content: "Updated saved history" },
      { id: "server-user", authorType: "USER", content: "Server question" },
      { id: "server-ai", authorType: "AI", content: "Canonical answer [source:saved-source]" },
    ], [source]));
    await sending;
    expect(messageTexts()).toEqual(["Updated saved history", "Server question", "Canonical answer"]);
    expect(view().some((node) => node.key === "server-ai")).toBe(true);
    expect(view().find((node) => node.type === "supporting-sources")?.props.sources).toEqual([source]);
    expect(statuses()).toEqual([refreshedStatus]);
    expect(alerts()).toEqual([]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("keeps the communication error and earlier turns when read recovery GET is denied", async () => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("Question");
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response).mockResolvedValueOnce(new Response(null, { status: 401 }));
    const sending = click("Send");
    stream.chunk("Partial");
    await expectPartial("Partial");
    stream.error(new DOMException("Aborted", "AbortError"));
    await sending;
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(alerts()).toEqual(["Failed to send message."]);
    expect(statuses()).toEqual([unconfirmedStatus]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4); // No retry after denied GET.
  });

  it.each([401, 403, 404, 429, 500])("does not fetch recovery history after POST rejection %i", async (status) => {
    await startConversation();
    typeMessage("Question");
    fetchMock.mockResolvedValueOnce(new Response(null, { status }));
    await click("Send");
    expect(alerts()).toEqual(["Failed to send message."]);
    expect(messageTexts()).toEqual([]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a safe 503 message, preserves saved history, and never displays the response body", async () => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("Question");
    fetchMock.mockResolvedValueOnce(Response.json({ error: "Synthetic private service detail", code: "CHAT_RATE_LIMIT_NOT_CONFIGURED" }, { status: 503 }));
    await click("Send");
    expect(alerts()).toEqual(["Chat is temporarily unavailable. Please contact the administrator or try again later."]);
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(statuses()).toEqual([unconfirmedStatus]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3); // No automatic POST retry or recovery GET.
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    expect(await selectConversation()).toBe(true);
    expect(alerts()).toEqual([]);
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
  });

  it.each(["New", "History"].flatMap((navigation) =>
    ["chunk", "read error", "refresh", "refresh error"].map((late) => ({ navigation, late })),
  ))("ignores late $late from an old send after $navigation switches the conversation", async ({ navigation, late }) => {
    await startConversation();
    typeMessage("Old question");
    const stream = streamResponse();
    const refresh = deferred<Response>();
    fetchMock.mockResolvedValueOnce(stream.response);
    if (late.startsWith("refresh")) fetchMock.mockReturnValueOnce(refresh.promise);
    const sending = click("Send");
    stream.chunk("Old temporary answer");
    await expectPartial("Old temporary answer");
    if (late.startsWith("refresh")) {
      stream.close();
      for (let i = 0; i < 30 && fetchMock.mock.calls.length < 3; i++) await Promise.resolve();
      expect(fetchMock).toHaveBeenCalledTimes(3);
    }
    if (navigation === "New") {
      fetchMock.mockResolvedValueOnce(Response.json({ id: "new-conversation", researchId: "research-id" }));
      await click("New");
    } else {
      fetchMock.mockResolvedValueOnce(detail([{ id: "new-ai", authorType: "AI", content: "Selected answer" }], [], "new-conversation"));
      expect(await selectConversation("new-conversation")).toBe(true);
    }
    const expectedMessages = messageTexts();
    const expectedStatuses = statuses();
    // Keep a new send pending too: the old finally must not unlock its input.
    typeMessage("New question");
    const newStream = streamResponse();
    fetchMock.mockResolvedValueOnce(newStream.response).mockResolvedValueOnce(detail([
      { authorType: "USER", content: "New question" },
    ], [], "new-conversation"));
    const newSending = click("Send");
    const pendingMessages = messageTexts();
    if (late === "chunk") { stream.chunk(" Late old chunk"); stream.close(); }
    if (late === "read error") stream.error(new Error("Old read error"));
    if (late === "refresh") refresh.resolve(detail([{ authorType: "AI", content: "Old saved answer" }]));
    if (late === "refresh error") refresh.reject(new Error("Old refresh error"));
    await sending;
    expect(messageTexts()).toEqual(pendingMessages);
    expect(alerts()).toEqual([]);
    expect(textarea().props.disabled).toBe(true);
    expect(statuses()).toEqual(["Generating a temporary response. Saving is not confirmed."]);
    newStream.close();
    await newSending;
    expect(messageTexts()).toEqual(["New question"]);
    expect(expectedMessages).toEqual(navigation === "New" ? [] : ["Selected answer"]);
    expect(expectedStatuses).toEqual(navigation === "New" ? [] : ["Showing saved history from the server."]);
    const sends = fetchMock.mock.calls.filter(([url]) => url === "/research/research-id/chat");
    expect(sends).toHaveLength(2);
    expect(JSON.parse(String(sends[1][1]?.body)).conversationId).toBe("new-conversation");
    expect(fetchMock).toHaveBeenCalledTimes(late.startsWith("refresh") ? 6 : 5);
  });

  it("ignores a pending History selection after New has completed", async () => {
    await startConversation();
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const selecting = selectConversation();
    expect(textarea().props.disabled).toBe(true);
    fetchMock.mockResolvedValueOnce(Response.json({ id: "new-conversation", researchId: "research-id" }));
    await click("New");
    typeMessage("New draft");
    pending.resolve(detail([{ authorType: "AI", content: "Stale history" }]));
    expect(await selecting).toBe(false);
    expect(messageTexts()).toEqual([]);
    expect(textarea().props.value).toBe("New draft");
    expect(textarea().props.disabled).toBe(false);
    expect(alerts()).toEqual([]);
    expect(statuses()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("ignores a late New error after History has completed", async () => {
    await startConversation();
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const creating = click("New");
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    expect(await selectConversation()).toBe(true);
    pending.reject(new Error("Stale creation failure"));
    await creating;
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(textarea().props.disabled).toBe(false);
    expect(button("New").props.disabled).toBe(false);
    expect(alerts()).toEqual([]);
    expect(statuses()).toEqual(["Showing saved history from the server."]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retains the unconfirmed send state when navigation fails during streaming", async () => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("Question");
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response);
    const sending = click("Send");
    stream.chunk("Temporary answer");
    await expectPartial("Temporary answer");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await click("New");
    stream.chunk(" Late answer");
    stream.close();
    await sending;
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    expect(statuses()).toEqual([unconfirmedStatus]);
    expect(alerts()).toEqual(["Failed to create conversation."]);
    expect(textarea().props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it.each(["failed New", "same History"])("blocks another POST to a pending conversation after %s until its stream settles", async (navigation) => {
    await startConversation();
    fetchMock.mockResolvedValueOnce(detail(earlierTurns));
    await selectConversation();
    typeMessage("First question");
    const stream = streamResponse();
    fetchMock.mockResolvedValueOnce(stream.response);
    const sending = click("Send");
    stream.chunk("Temporary answer");
    await expectPartial("Temporary answer"); // The next reader.read() stays pending.
    if (navigation === "failed New") {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
      await click("New");
    } else {
      fetchMock.mockResolvedValueOnce(detail(earlierTurns));
      expect(await selectConversation()).toBe(true);
    }
    const sends = () => fetchMock.mock.calls.filter(([url]) => url === "/research/research-id/chat");
    const expectedStatus = statuses();
    const expectedAlerts = alerts();
    try {
      // Force the handler even when UI controls are disabled, to test its guard.
      typeMessage("Next question");
      await click("Sending...");
      expect(sends()).toHaveLength(1);
      expect(button("Sending...").props.disabled).toBe(true);
      expect(textarea().props.disabled).toBe(true);
      expect(textarea().props.value).toBe("Next question");

      // A stale chunk is not EOF: dropping its display must not release the lock.
      stream.chunk("Late ignored answer");
      for (let i = 0; i < 30; i++) await Promise.resolve();
      await click("Sending...");
      expect(sends()).toHaveLength(1);
      expect(button("Sending...").props.disabled).toBe(true);
      expect(messageTexts()).toEqual(["Earlier question", "Earlier answer"]);
    } finally {
      if (navigation === "failed New") stream.close();
      else stream.error(new DOMException("Old stream interrupted", "AbortError"));
      await sending;
    }
    expect(statuses()).toEqual(expectedStatus);
    expect(alerts()).toEqual(expectedAlerts);
    expect(button("Send").props.disabled).toBe(false);
    expect(textarea().props.disabled).toBe(false);
    expect(sends()).toHaveLength(1); // Completion does not trigger automatic POST.

    fetchMock.mockResolvedValueOnce(new Response("New answer")).mockResolvedValueOnce(detail([
      ...earlierTurns,
      { authorType: "USER", content: "Next question" },
      { authorType: "AI", content: "New saved answer" },
    ]));
    await click("Send");
    expect(sends()).toHaveLength(2);
    expect(JSON.parse(String(sends()[1][1]?.body))).toEqual({
      conversationId: "conversation-id", message: "Next question",
    });
    expect(messageTexts()).toEqual(["Earlier question", "Earlier answer", "Next question", "New saved answer"]);
    expect(textarea().props.disabled).toBe(false);
  });
});
