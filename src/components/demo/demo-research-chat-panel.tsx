import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DemoChatClientPanel } from "./demo-chat-client-panel";
import type { DemoChatSource } from "@/lib/demo/chat-client";

export function DemoResearchChatPanel({ researchTitle, researchId, siteKey, sources = [] }: {
  researchTitle: string; researchId?: string; siteKey?: string; sources?: DemoChatSource[];
}) {
  if (researchId && siteKey) return <DemoChatClientPanel key={`${researchId}:${siteKey}`} researchId={researchId} researchTitle={researchTitle} siteKey={siteKey} sources={sources} />;
  return (
    <section
      aria-labelledby="demo-chat-heading"
      aria-describedby="demo-chat-description demo-chat-availability"
      className="min-w-0 border-t py-8 [overflow-wrap:anywhere]"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="demo-chat-heading" className="text-lg font-semibold tracking-tight">AI Chat</h2>
        <Badge variant="secondary" className="h-auto whitespace-normal">Coming soon</Badge>
      </div>
      <p id="demo-chat-description" className="mt-2 text-sm leading-6 text-muted-foreground">
        Ask questions about this Research: <span className="font-medium text-foreground">{researchTitle}</span>.
        {" "}Answers will be grounded in this Research’s findings and conclusion, with references to supporting sources where available.
      </p>
      <p id="demo-chat-availability" className="mt-3 text-sm leading-6">
        Chat is not available yet. Questions cannot be entered or sent.
      </p>

      <div role="region" aria-label="Conversation messages" className="mt-4 flex min-h-40 min-w-0 items-center justify-center rounded-lg border border-dashed bg-muted/30 p-4 sm:p-6">
        <p className="max-w-prose text-center text-sm leading-6 text-muted-foreground">
          No messages yet. Your questions and AI responses will appear here when Chat becomes available.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <label htmlFor="demo-chat-question" className="block text-sm font-medium">Your question</label>
        <Textarea
          id="demo-chat-question"
          disabled
          rows={3}
          aria-describedby="demo-chat-availability demo-chat-input-help demo-chat-limits"
          className="min-w-0 resize-none disabled:opacity-100"
        />
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="demo-chat-input-help" className="min-w-0 text-sm leading-6 text-muted-foreground">
            Up to 500 characters per question when Chat becomes available.
          </p>
          <Button type="button" disabled aria-describedby="demo-chat-availability" className="h-auto min-h-9 max-w-full whitespace-normal py-2">
            Send question
          </Button>
        </div>
        <p id="demo-chat-limits" className="text-sm leading-6 text-muted-foreground">
          Planned demo limits: 10 questions per thread and 20 per anonymous session (24 hours).
          {" "}Shared rate and daily limits may also temporarily restrict availability. Conversation history will not be saved.
        </p>
      </div>
    </section>
  );
}
