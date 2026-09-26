"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

type ResearchAiPanelProps = {
  researchId: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function ResearchAiPanel({ researchId }: ResearchAiPanelProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  async function handleNewConversation() {
    if (isCreating) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch(
        `/research/${researchId}/chat/conversations`,
        {
          method: "POST",
        },
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
      setInput("");
    } catch (error) {
      console.error(error);
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
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex min-h-96 flex-col rounded-lg border bg-card">
      <div className="border-b p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">AI Assistant</h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Ask questions about this research.
            </p>
          </div>

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
            {messages.map((message, index) => (
              <div key={index}>
                <p className="text-xs font-medium text-muted-foreground">
                  {message.role === "user" ? "You" : "AI"}
                </p>

                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                  {message.content ||
                    (message.role === "assistant" && isSending
                      ? "Thinking..."
                      : "")}
                </p>
              </div>
            ))}
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
            disabled={!conversationId || input.trim().length === 0 || isSending}
          >
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>

      <span className="sr-only">Research ID: {researchId}</span>
    </div>
  );
}
