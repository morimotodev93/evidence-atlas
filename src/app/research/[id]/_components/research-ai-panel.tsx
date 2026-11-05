"use client";

import { Button } from "@/components/ui/button";
import { parseSourceCitations } from "@/lib/ai/source-citations";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";
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
  locale?: Locale;
  researchId: string;
  sources: ResearchAiSource[];
  variant?: "desktop" | "mobile";
  active?: boolean;
  onClose?: () => void;
};

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  provisional?: boolean;
};

const CHAT_STATUS_TEXT = {
  streaming: "saasAi.statusStreaming",
  checking: "saasAi.statusChecking",
  refreshed: "saasAi.statusRefreshed",
  unconfirmed: "saasAi.statusUnconfirmed",
  saved: "saasAi.statusSaved",
} as const;

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

export function ResearchAiPanel({ researchId, sources, variant = "desktop", active = true, onClose, locale: localeProp }: ResearchAiPanelProps) {
  const locale = resolveLocale(localeProp);
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
    if (variant !== "desktop" || !active) return;
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
  }, [variant, active]);

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
      lang={locale}
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-card ${
        variant === "mobile" ? "h-full flex-1" : "h-[calc(100dvh-6rem)]"
      }`}
    >
      <div className="shrink-0 border-b p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 basis-20">
            <h2 className="text-sm font-semibold">{translate("saasAi.heading", locale)}</h2>

            <p className={variant === "mobile" ? "sr-only" : "mt-1 text-xs leading-5 text-muted-foreground"}>
              {translate("saasAi.description", locale)}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <ResearchAiConversationsDialog
              // Only the picker resets on hide, dismissing its portaled modal.
              // Conversation, draft, messages and requests stay in this panel.
              key={active ? "active" : "inactive"}
              locale={locale}
              researchId={researchId}
              desktop={variant === "desktop"}
              onSelectConversation={handleSelectConversation}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNewConversation}
              disabled={isCreating}
            >
              {isCreating ? translate("saasAi.creating", locale) : translate("saasAi.new", locale)}
            </Button>
            {onClose ? (
              <Button type="button" variant="ghost" size="sm" aria-label={translate("saasAi.closeAssistant", locale)} onClick={onClose}>
                {translate("saasAi.close", locale)}
              </Button>
            ) : null}
          </div>
        </div>
        {restoreError ? (
          <p role="alert" lang="en" className="mt-2 text-sm text-destructive">
            {restoreError}
          </p>
        ) : null}
        {createError ? (
          <p role="alert" lang="en" className="text-sm text-destructive">
            {createError}
          </p>
        ) : null}
      </div>

      <div
        ref={messagesViewport}
        role="region"
        aria-label={translate("saasAi.messages", locale)}
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
                    ? translate("saasAi.started", locale)
                    : translate("saasAi.noConversation", locale)}
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {conversationId
                    ? translate("saasAi.askQuestion", locale)
                    : translate("saasAi.startConversation", locale)}
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
                        ? translate("saasAi.you", locale)
                        : message.provisional
                          ? translate("saasAi.temporaryAi", locale)
                          : translate("saasAi.ai", locale)}
                    </p>

                    {message.role === "assistant" ? (
                      <ResearchAiMarkdown>
                        {parsedMessage?.text ?? (isSending ? translate("saasAi.thinking", locale) : "")}
                      </ResearchAiMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">
                        {message.content}
                      </p>
                    )}

                    {parsedMessage && parsedMessage.sources.length > 0 ? (
                      <ResearchAiSupportingSources locale={locale} sources={parsedMessage.sources} />
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
            {translate("saasAi.latestMessages", locale)}
          </Button>
        ) : null}
        {chatStatus ? (
          <p role="status" className="mb-2 text-xs leading-5 text-muted-foreground">
            {translate(CHAT_STATUS_TEXT[chatStatus], locale)}
          </p>
        ) : null}
        <textarea
          // Keep Firefox from restoring a previous dynamic disabled state before hydration.
          autoComplete="off"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={translate("saasAi.placeholder", locale)}
          aria-label={translate("saasAi.messageLabel", locale)}
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
            {isSending || isConversationPending ? translate("saasAi.sending", locale) : translate("saasAi.send", locale)}
          </Button>
        </div>
        {sendError ? (
          <p role="alert" lang="en" className="text-sm text-destructive">
            {sendError}
          </p>
        ) : null}
      </div>

      <span className="sr-only">{translate("saasAi.researchId", locale)} {researchId}</span>
    </div>
  );
}
