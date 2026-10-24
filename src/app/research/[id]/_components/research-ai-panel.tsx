"use client";

import { Button } from "@/components/ui/button";
import { parseSourceCitations } from "@/lib/ai/source-citations";
import { useEffect, useRef, useState } from "react";
import { ResearchAiConversationsDialog } from "./research-ai-conversations-dialog";
import { ResearchAiMarkdown } from "./research-ai-markdown";
import { ResearchAiSupportingSources } from "./research-ai-supporting-sources";

export type ResearchAiSource = {
  id: string;
  title: string;
  url: string;
};

type ResearchAiPanelProps = {
  researchId: string;
  sources: ResearchAiSource[];
  variant?: "desktop" | "mobile";
};

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  provisional?: boolean;
};

const CHAT_STATUS_TEXT = {
  streaming: "Generating a temporary response. Saving is not confirmed.",
  checking: "Checking saved history...",
  refreshed:
    "Showing saved history from the server. The result of this send could not be confirmed individually.",
  unconfirmed:
    "The result of this send is unconfirmed. Open History to check saved messages.",
  saved: "Showing saved history from the server.",
};

type ConversationMessage = {
  id: string;
  conversationId: string;
  authorType: "USER" | "AI";
  content: string;
  createdAt: string;
};

type ConversationDetail = {
  id: string;
  researchId: string;
  createdAt: string;
  messages: ConversationMessage[];
  sources?: ResearchAiSource[];
};

function restoredMessages(conversation: ConversationDetail): ChatMessage[] {
  return conversation.messages.map((message) => ({
    id: message.id,
    role: message.authorType === "USER" ? "user" : "assistant",
    content: message.content,
  }));
}

function scrollToLatest(viewport: HTMLDivElement) {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed &&
    (viewport.contains(selection.anchorNode) || viewport.contains(selection.focusNode))) return;
  viewport.scrollTop = viewport.scrollHeight;
}

export function ResearchAiPanel({ researchId, sources, variant = "desktop" }: ResearchAiPanelProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const [conversationSources, setConversationSources] = useState<
    ResearchAiSource[]
  >([]);
  const [chatStatus, setChatStatus] = useState<
    keyof typeof CHAT_STATUS_TEXT | null
  >(null);
  const [pendingConversationIds, setPendingConversationIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const pendingRequests = useRef(new Set<string>());
  const requestGeneration = useRef(0);
  const savedMessages = useRef<ChatMessage[]>([]);
  const isConversationPending =
    conversationId !== null && pendingConversationIds.has(conversationId);

  const panelElement = useRef<HTMLDivElement>(null);
  const messagesViewport = useRef<HTMLDivElement>(null);
  const messagesContent = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Change only the inner scroll offset; never move focus or scroll the page.
  // Pause automatic following while the reader is selecting answer text.
  useEffect(() => {
    const viewport = messagesViewport.current;
    const content = messagesContent.current;
    if (!viewport || !content) return;

    function followIfNeeded() {
      if (!viewport || !followLatest.current) return;
      scrollToLatest(viewport);
    }

    followIfNeeded();
    const observer = new ResizeObserver(followIfNeeded);
    observer.observe(viewport);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = messagesViewport.current;
    if (!viewport || !followLatest.current) return;
    scrollToLatest(viewport);
  }, [messages, conversationId, conversationSources]);

  // Before the sticky panel reaches top-20, Research's header can put it farther
  // down the page. Cap the fallback height against that actual position too.
  useEffect(() => {
    if (variant !== "desktop") return;
    const panel = panelElement.current;
    if (!panel) return;
    function fitPanel() {
      if (!panel) return;
      const top = Math.max(80, panel.getBoundingClientRect().top);
      panel.style.maxHeight = `${Math.max(0, window.innerHeight - top - 16)}px`;
    }
    fitPanel();
    window.addEventListener("scroll", fitPanel, { passive: true });
    window.addEventListener("resize", fitPanel);
    return () => {
      window.removeEventListener("scroll", fitPanel);
      window.removeEventListener("resize", fitPanel);
      panel.style.maxHeight = "";
    };
  }, [variant]);

  function showLatestMessages() {
    followLatest.current = true;
    setIsAtBottom(true);
    const viewport = messagesViewport.current;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }

  function ownsRequest(generation: number) {
    return requestGeneration.current === generation;
  }

  function beginNavigation() {
    const generation = ++requestGeneration.current;
    setIsSending(false);
    setMessages(savedMessages.current);
    if (isSending) setChatStatus("unconfirmed");
    return generation;
  }

  function getSupportingSources(content: string) {
    const parsed = parseSourceCitations(content);

    const supportingSources = parsed.sourceIds
      .map(
        (sourceId) =>
          conversationSources.find((source) => source.id === sourceId) ??
          sources.find((source) => source.id === sourceId),
      )
      .filter((source): source is ResearchAiSource => source !== undefined);

    return {
      text: parsed.text,
      sources: supportingSources,
    };
  }

  async function handleNewConversation() {
    if (isCreating) return;

    const generation = beginNavigation();
    setIsRestoring(false);
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch(
        `/research/${researchId}/chat/conversations`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error("Failed to create conversation.");
      }

      const conversation: {
        id: string;
        researchId: string;
        createdAt: string;
      } = await response.json();

      if (!ownsRequest(generation)) return;
      showLatestMessages();
      setConversationId(conversation.id);
      savedMessages.current = [];
      setMessages([]);
      setChatStatus(null);
      setConversationSources([]);
      setInput("");

      setSendError(null);
      setRestoreError(null);
    } catch (error) {
      if (!ownsRequest(generation)) return;
      console.error(error);
      setCreateError("Failed to create conversation.");
    } finally {
      if (ownsRequest(generation)) setIsCreating(false);
    }
  }

  async function handleSend() {
    const message = input.trim();

    if (
      !conversationId || !message || isSending || isCreating || isRestoring ||
      pendingRequests.current.has(conversationId)
    ) {
      return;
    }

    // Display ownership may change while this conversation's request is pending.
    pendingRequests.current.add(conversationId);
    setPendingConversationIds(new Set(pendingRequests.current));
    const generation = ++requestGeneration.current;
    showLatestMessages();
    setIsSending(true);
    setChatStatus("streaming");
    setSendError(null);
    setInput("");
    setRestoreError(null);
    setCreateError(null);

    const previousMessages = savedMessages.current;
    let canRestoreHistory = false;
    let sendErrorMessage = "Failed to send message.";

    setMessages([
      ...previousMessages,
      { role: "user", content: message, provisional: true },
      { role: "assistant", content: "", provisional: true },
    ]);

    async function refreshHistory() {
      if (!ownsRequest(generation)) return;
      setMessages(previousMessages);
      setChatStatus("checking");
      try {
        const response = await fetch(
          `/research/${researchId}/chat/conversations/${conversationId}`,
        );
        if (!response.ok) {
          throw new Error("Failed to refresh conversation history.");
        }
        const conversation: ConversationDetail = await response.json();
        if (!ownsRequest(generation)) return;
        if (
          conversation.id !== conversationId ||
          conversation.researchId !== researchId
        ) {
          throw new Error("Unexpected conversation history.");
        }
        const restored = restoredMessages(conversation);
        savedMessages.current = restored;
        setMessages(restored);
        setConversationSources(conversation.sources ?? []);
        // This GET identifies saved messages, not the result of this POST.
        setChatStatus("refreshed");
      } catch (error) {
        if (!ownsRequest(generation)) return;
        console.error("Failed to refresh conversation history.", error);
        setChatStatus("unconfirmed");
      }
    }

    try {
      const response = await fetch(`/research/${researchId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          message,
        }),
      });

      canRestoreHistory = response.ok;
      if (response.status === 503) {
        sendErrorMessage = "Chat is temporarily unavailable. Please contact the administrator or try again later.";
      }
      if (!response.ok || !response.body) {
        throw new Error(sendErrorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }
        // Keep consuming an old response until EOF/error without updating its UI.
        if (!ownsRequest(generation)) continue;

        const chunk = decoder.decode(value, { stream: true });

        setMessages((current) => {
          if (!ownsRequest(generation)) return current;
          const next = [...current];
          const lastMessage = next.at(-1);

          if (lastMessage?.role === "assistant") {
            next[next.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + chunk,
            };
          }

          return next;
        });
      }

      await refreshHistory();
    } catch (error) {
      if (!ownsRequest(generation)) return;
      console.error(error);

      setMessages(previousMessages);
      setSendError(sendErrorMessage);
      setChatStatus("unconfirmed");
      if (canRestoreHistory) await refreshHistory();
    } finally {
      pendingRequests.current.delete(conversationId);
      setPendingConversationIds(new Set(pendingRequests.current));
      if (ownsRequest(generation)) setIsSending(false);
    }
  }

  async function handleSelectConversation(
    conversationId: string,
  ): Promise<boolean> {
    if (isRestoring) {
      return false;
    }

    const generation = beginNavigation();
    setIsCreating(false);
    setIsRestoring(true);
    setRestoreError(null);

    try {
      const response = await fetch(
        `/research/${researchId}/chat/conversations/${conversationId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load conversation.");
      }

      const conversation: ConversationDetail = await response.json();

      if (!ownsRequest(generation)) return false;
      const restored = restoredMessages(conversation);

      showLatestMessages();
      setConversationId(conversation.id);
      setSendError(null);
      savedMessages.current = restored;
      setMessages(restored);
      setChatStatus("saved");
      setConversationSources(conversation.sources ?? []);
      setRestoreError(null);
      setCreateError(null);
      setInput("");

      return true;
    } catch (error) {
      if (!ownsRequest(generation)) return false;
      console.error(error);
      setRestoreError("Failed to restore conversation.");
      return false;
    } finally {
      if (ownsRequest(generation)) setIsRestoring(false);
    }
  }

  return (
    <div
      ref={panelElement}
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-card ${
        variant === "mobile" ? "h-full flex-1" : "h-[calc(100dvh-6rem)]"
      }`}
    >
      <div className="shrink-0 border-b p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 basis-20">
            <h2 className="text-sm font-semibold">AI Assistant</h2>

            <p className={variant === "mobile" ? "sr-only" : "mt-1 text-xs leading-5 text-muted-foreground"}>
              Ask questions about this research.
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <ResearchAiConversationsDialog
              researchId={researchId}
              onSelectConversation={handleSelectConversation}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNewConversation}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "New"}
            </Button>
          </div>
        </div>
        {restoreError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {restoreError}
          </p>
        ) : null}
        {createError ? (
          <p role="alert" className="text-sm text-destructive">
            {createError}
          </p>
        ) : null}
      </div>

      <div
        ref={messagesViewport}
        role="region"
        aria-label="Conversation messages"
        tabIndex={0}
        onScroll={(event) => {
          const viewport = event.currentTarget;
          const atBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 48;
          followLatest.current = atBottom;
          setIsAtBottom(atBottom);
        }}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-3 outline-none [overflow-wrap:anywhere] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div ref={messagesContent}>
          {messages.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center text-center">
              <div>
                <p className="text-sm font-medium">
                  {conversationId
                    ? "Conversation started"
                    : "No conversation yet"}
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {conversationId
                    ? "Ask a question about this research."
                    : "Start a conversation grounded in this research."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const parsedMessage =
                  message.role === "assistant" && message.content
                    ? getSupportingSources(message.content)
                    : null;

                return (
                  <div
                    key={message.id ?? index}
                    className={message.role === "user"
                      ? "min-w-0 rounded-md bg-muted/50 p-3"
                      : "min-w-0 px-1 py-2"}
                  >
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {message.role === "user"
                        ? "You"
                        : message.provisional
                          ? "AI (temporary)"
                          : "AI"}
                    </p>

                    {message.role === "assistant" ? (
                      <ResearchAiMarkdown>
                        {parsedMessage?.text ?? (isSending ? "Thinking..." : "")}
                      </ResearchAiMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">
                        {message.content}
                      </p>
                    )}

                    {parsedMessage && parsedMessage.sources.length > 0 ? (
                      <ResearchAiSupportingSources sources={parsedMessage.sources} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t p-3 [overflow-wrap:anywhere]">
        {!isAtBottom ? (
          <Button type="button" variant="ghost" size="sm" className="mb-2" onClick={showLatestMessages}>
            Latest messages
          </Button>
        ) : null}
        {chatStatus ? (
          <p role="status" className="mb-2 text-xs leading-5 text-muted-foreground">
            {CHAT_STATUS_TEXT[chatStatus]}
          </p>
        ) : null}
        <textarea
          // Keep Firefox from restoring a previous dynamic disabled state before hydration.
          autoComplete="off"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about this research..."
          aria-label="Message to AI"
          rows={variant === "mobile" ? 2 : 3}
          disabled={
            !conversationId || isSending || isConversationPending || isCreating || isRestoring
          }
          className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={
              !conversationId || !input.trim() || isSending || isConversationPending ||
              isCreating || isRestoring
            }
          >
            {isSending || isConversationPending ? "Sending..." : "Send"}
          </Button>
        </div>
        {sendError ? (
          <p role="alert" className="text-sm text-destructive">
            {sendError}
          </p>
        ) : null}
      </div>

      <span className="sr-only">Research ID: {researchId}</span>
    </div>
  );
}
