"use client";

import { Button } from "@/components/ui/button";
import { parseSourceCitations } from "@/lib/ai/source-citations";
import { useRef, useState } from "react";
import { ResearchAiConversationsDialog } from "./research-ai-conversations-dialog";
import { ResearchAiSupportingSources } from "./research-ai-supporting-sources";

export type ResearchAiSource = {
  id: string;
  title: string;
  url: string;
};

type ResearchAiPanelProps = {
  researchId: string;
  sources: ResearchAiSource[];
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

export function ResearchAiPanel({ researchId, sources }: ResearchAiPanelProps) {
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
    setIsSending(true);
    setChatStatus("streaming");
    setSendError(null);
    setInput("");
    setRestoreError(null);
    setCreateError(null);

    const previousMessages = savedMessages.current;
    let canRestoreHistory = false;

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
      if (!response.ok || !response.body) {
        throw new Error("Failed to send message.");
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
      setSendError("Failed to send message.");
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
    <div className="flex min-h-96 flex-col rounded-lg border bg-card">
      <div className="border-b p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">AI Assistant</h2>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Ask questions about this research.
                </p>

                {restoreError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {restoreError}
                  </p>
                ) : null}
              </div>

              <div className="flex gap-2">
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
            {createError ? (
              <p role="alert" className="text-sm text-destructive">
                {createError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 p-3">
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
                <div key={message.id ?? index}>
                  <p className="text-xs font-medium text-muted-foreground">
                    {message.role === "user"
                      ? "You"
                      : message.provisional
                        ? "AI (temporary)"
                        : "AI"}
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                    {parsedMessage?.text ||
                      message.content ||
                      (message.role === "assistant" && isSending
                        ? "Thinking..."
                        : "")}
                  </p>

                  {parsedMessage && parsedMessage.sources.length > 0 ? (
                    <ResearchAiSupportingSources sources={parsedMessage.sources} />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t p-3">
        {chatStatus ? (
          <p role="status" className="mb-2 text-xs leading-5 text-muted-foreground">
            {CHAT_STATUS_TEXT[chatStatus]}
          </p>
        ) : null}
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about this research..."
          rows={3}
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
