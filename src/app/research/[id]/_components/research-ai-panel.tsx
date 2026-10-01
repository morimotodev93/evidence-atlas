"use client";

import { Button } from "@/components/ui/button";
import { parseSourceCitations } from "@/lib/ai/source-citations";
import { useState } from "react";
import { ResearchAiConversationsDialog } from "./research-ai-conversations-dialog";

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
  role: "user" | "assistant";
  content: string;
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

      setConversationId(conversation.id);
      setMessages([]);
      setConversationSources([]);
      setInput("");

      setSendError(null);
      setRestoreError(null);
    } catch (error) {
      console.error(error);
      setCreateError("Failed to create conversation.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSend() {
    const message = input.trim();

    if (!conversationId || !message || isSending) {
      return;
    }

    setIsSending(true);
    setInput("");
    setRestoreError(null);
    setCreateError(null);

    const previousMessageCount = messages.length;

    setMessages((current) => [
      ...current,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);

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

        const chunk = decoder.decode(value, { stream: true });

        setMessages((current) => {
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

      try {
        const conversationResponse = await fetch(
          `/research/${researchId}/chat/conversations/${conversationId}`,
        );

        if (!conversationResponse.ok) {
          throw new Error("Failed to refresh conversation sources.");
        }

        const conversation: ConversationDetail =
          await conversationResponse.json();

        setConversationSources(conversation.sources ?? []);
      } catch (error) {
        console.error("Failed to refresh conversation sources.", error);
      }
    } catch (error) {
      console.error(error);

      setMessages((current) => current.slice(0, previousMessageCount));

      setSendError("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSelectConversation(
    conversationId: string,
  ): Promise<boolean> {
    if (isRestoring) {
      return false;
    }

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

      const restoredMessages: ChatMessage[] = conversation.messages.map(
        (message) => ({
          role: message.authorType === "USER" ? "user" : "assistant",
          content: message.content,
        }),
      );

      setConversationId(conversation.id);
      setSendError(null);
      setMessages(restoredMessages);
      setConversationSources(conversation.sources ?? []);
      setRestoreError(null);
      setCreateError(null);
      setInput("");

      return true;
    } catch (error) {
      console.error(error);
      setRestoreError("Failed to restore conversation.");
      return false;
    } finally {
      setIsRestoring(false);
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
                <div key={index}>
                  <p className="text-xs font-medium text-muted-foreground">
                    {message.role === "user" ? "You" : "AI"}
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                    {parsedMessage?.text ||
                      message.content ||
                      (message.role === "assistant" && isSending
                        ? "Thinking..."
                        : "")}
                  </p>

                  {parsedMessage && parsedMessage.sources.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Supporting sources
                      </p>

                      <div className="mt-2 space-y-1">
                        {parsedMessage.sources.map((source) => (
                          <a
                            key={source.id}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground"
                          >
                            {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about this research..."
          rows={3}
          disabled={!conversationId || isSending}
          className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={!conversationId || !input.trim() || isSending}
          >
            {isSending ? "Sending..." : "Send"}
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
