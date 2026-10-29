"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createDemoChatClient, type DemoChatAnswer, type DemoChatSource } from "@/lib/demo/chat-client";
import { DemoChatTurnstile } from "./demo-chat-turnstile";

export function DemoChatAnswerView({ answer }: { answer: DemoChatAnswer }) {
  return <div className="min-w-0 space-y-3">
    <p className="whitespace-pre-wrap text-sm leading-6">{answer.answer}</p>
    {answer.insufficientEvidence && <p className="text-sm">Insufficient Research evidence.</p>}
    {answer.contextTruncated && <p className="text-sm">Only part of this Research fit in the answer context.</p>}
    {answer.sources.length > 0 && <ul aria-label="Supporting sources" className="space-y-2 text-sm">
      {answer.sources.map((source) => <li key={source.id}>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{source.title}</a>
      </li>)}
    </ul>}
    <p className="text-sm leading-6 text-muted-foreground">{answer.evidenceNotice}</p>
  </div>;
}

// Parent keys this component by Research and eligibility, clearing the composer,
// session and answer synchronously when either scope changes.
export function DemoChatClientPanel({ researchId, researchTitle, siteKey, sources }: {
  researchId: string; researchTitle: string; siteKey: string; sources: DemoChatSource[];
}) {
  const [client] = useState(() => createDemoChatClient(true, researchId, sources));
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getServerSnapshot);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState<number>();
  useEffect(() => () => client.reset(), [client]);
  const sending = state.status === "sending";
  const canAsk = Boolean(state.threadId) && ["ready", "answered", "error"].includes(state.status);
  const canStart = !state.threadId && ["idle", "error"].includes(state.status);
  const busy = sending || state.status === "verifying";
  return <section aria-labelledby="demo-chat-heading" aria-describedby="demo-chat-description demo-chat-availability" className="min-w-0 border-t py-8 [overflow-wrap:anywhere]">
    <h2 id="demo-chat-heading" className="text-lg font-semibold tracking-tight">AI Chat</h2>
    <p id="demo-chat-description" className="mt-2 text-sm leading-6 text-muted-foreground">
      Ask questions about this Research: <span className="font-medium text-foreground">{researchTitle}</span>.
      {" "}Answers use this Research’s stored evidence. External source pages are not read.
    </p>
    <p id="demo-chat-availability" role="status" className="mt-3 text-sm leading-6">
      {state.status === "idle" ? "Verify to start a Demo Chat session." :
        state.status === "verifying" ? "Verifying and preparing your session…" :
        sending ? "Sending question. Please wait…" :
        state.status === "ready" ? "Session ready. You can ask a question." :
        state.status === "answered" ? "Answer received." : "Chat needs your attention."}
    </p>
    {state.notice && <p role="alert" className="mt-3 text-sm leading-6">{state.notice}</p>}
    {canStart && <Button type="button" className="mt-3" onClick={() => setAttempt(client.beginVerification())}>Start verified session</Button>}
    {state.status === "verifying" && attempt !== undefined && <DemoChatTurnstile key={attempt} siteKey={siteKey}
      onToken={(token) => { void client.verified(attempt, token); }}
      onFailure={(expired) => client.verificationFailed(attempt, expired)} />}
    <div role="region" aria-label="Conversation messages" aria-live="polite" aria-busy={sending} className="mt-4 min-h-40 min-w-0 rounded-lg border border-dashed bg-muted/30 p-4 sm:p-6">
      {state.question && <p className="mb-4 whitespace-pre-wrap text-sm leading-6"><span className="font-medium">Your question: </span>{state.question}</p>}
      {state.answer ? <DemoChatAnswerView answer={state.answer} /> : <p className="text-sm leading-6 text-muted-foreground">{sending ? "Preparing an answer…" : "No answer yet."}</p>}
    </div>
    <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void client.question(message); }}>
      <label htmlFor="demo-chat-question" className="block text-sm font-medium">Your question</label>
      <Textarea id="demo-chat-question" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} disabled={!canAsk || busy}
        aria-describedby="demo-chat-availability demo-chat-input-help demo-chat-limits" className="min-w-0 resize-none disabled:opacity-100" />
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id="demo-chat-input-help" className="text-sm leading-6 text-muted-foreground">Up to 500 Unicode characters per question ({Array.from(message).length}/500).</p>
        <Button type="submit" disabled={!canAsk || busy || !message.trim() || Array.from(message).length > 500} className="h-auto min-h-9 max-w-full whitespace-normal py-2">{sending ? "Sending…" : "Send question"}</Button>
      </div>
      <p id="demo-chat-limits" className="text-sm leading-6 text-muted-foreground">10 questions per thread and 20 per anonymous session (24 hours). Shared rate and daily limits may also restrict availability. Questions are independent; conversation history is not sent or saved. Failed requests may count toward limits.</p>
    </form>
  </section>;
}
