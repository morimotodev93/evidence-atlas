"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

type ResearchAiConversationsDialogProps = {
  researchId: string;
  onSelectConversation: (conversationId: string) => Promise<boolean>;
};

export function ResearchAiConversationsDialog({
  researchId,
  onSelectConversation,
}: ResearchAiConversationsDialogProps) {
  type ConversationSummary = {
    id: string;
    researchId: string;
    createdAt: string;
    updatedAt: string;
    preview: string;
  };

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  async function loadConversations() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(
        `/research/${researchId}/chat/conversations`,
      );

      if (!response.ok) {
        throw new Error("Failed to load conversations.");
      }

      const data: ConversationSummary[] = await response.json();

      setConversations(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load conversations.");
    } finally {
      setIsLoading(false);
    }
  }

  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen) {
          void loadConversations();
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            History
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Conversation</DialogTitle>

          <DialogDescription>
            Select a previous conversation to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            Conversations will appear here.
          </p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading conversations...
            </p>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <Button
                  key={conversation.id}
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start p-3"
                  disabled={selectedConversationId !== null}
                  onClick={async () => {
                    if (selectedConversationId) {
                      return;
                    }

                    setSelectedConversationId(conversation.id);

                    const restored = await onSelectConversation(
                      conversation.id,
                    );

                    setSelectedConversationId(null);

                    if (restored) {
                      setOpen(false);
                    }
                  }}
                >
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium">
                      {conversation.preview}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedConversationId === conversation.id
                        ? "Restoring..."
                        : new Date(conversation.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>{" "}
      </DialogContent>
    </Dialog>
  );
}
