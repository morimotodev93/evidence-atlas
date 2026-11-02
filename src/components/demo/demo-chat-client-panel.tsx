"use client";

import { defaultLocale, type Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";
import { useDemoChatActivity } from "./demo-language";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createDemoChatClient, type DemoChatAnswer, type DemoChatSource } from "@/lib/demo/chat-client";
import { DemoChatTurnstile } from "./demo-chat-turnstile";
import { getDemoQuestions, selectDemoQuestion } from "@/lib/demo/chat-questions";

export function DemoChatAnswerView({ answer, locale = defaultLocale }: { answer: DemoChatAnswer; locale?: Locale }) {
  // Replace only complete, known identifiers. Unknown references stay visible;
  // labels map to the already validated Sources without inferring claim support.
  const labels = new Map(answer.sources.map((source, index) => [source.id, translate("chat.source", locale, { count: index + 1 })]));
  const text = answer.answer.replace(/[A-Za-z0-9_-]+/g, (token) => labels.get(token) ?? token);
  const paragraphs = text.replace(/\r\n?/g, "\n").trim().split(/\n\s*\n/);
  return <div className="min-w-0 space-y-4 [overflow-wrap:anywhere]">
    <div className="space-y-4 text-sm leading-7">
      {paragraphs.map((paragraph, index) => <div key={index} className="space-y-2">
        {paragraph.split("\n").map((line, lineIndex) => {
          // Plain-text section labels only: retain every character, including
          // numerical values and list markers. No Markdown or generated links.
          const label = line.trim().endsWith(":") && line.trim().length <= 100;
          return <p key={lineIndex} className={label ? "whitespace-pre-wrap font-medium" : "whitespace-pre-wrap"}>{line}</p>;
        })}
      </div>)}
    </div>
    {answer.insufficientEvidence && <p className="text-sm">{translate("chat.insufficient", locale)}</p>}
    {answer.contextTruncated && <p className="text-sm">{translate("chat.truncated", locale)}</p>}
    {answer.sources.length > 0 && <div className="space-y-3 border-t pt-4">
      <h3 className="text-sm font-medium">{translate("research.supporting", locale)}</h3>
      <ul aria-label={translate("research.supporting", locale)} className="space-y-3 text-sm leading-6">
        {answer.sources.map((source, index) => <li key={source.id} className="min-w-0">
          <span className="font-medium">{translate("chat.source", locale, { count: index + 1 })}: </span>
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="rounded-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{source.title}</a>
        </li>)}
      </ul>
    </div>}
    <p className="text-sm leading-6 text-muted-foreground">{answer.evidenceNotice === translate("chat.evidenceNotice", "en") ? translate("chat.evidenceNotice", locale) : answer.evidenceNotice}</p>
  </div>;
}

// Parent keys this component by Research and eligibility, clearing the composer,
// session and answer synchronously when either scope changes.
export function DemoChatClientPanel({ researchId, researchTitle, siteKey, sources, locale = defaultLocale }: {
  researchId: string; researchTitle: string; siteKey: string; sources: DemoChatSource[]; locale?: Locale;
}) {
  const [client] = useState(() => createDemoChatClient(true, researchId, sources, fetch, locale));
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getServerSnapshot);
  const [message, setMessage] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [attempt, setAttempt] = useState<number>();
  useEffect(() => () => client.reset(), [client]);
  const { setBusy } = useDemoChatActivity();
  const sending = state.status === "sending";
  const canAsk = Boolean(state.threadId) && ["ready", "answered", "error"].includes(state.status);
  const canStart = !state.threadId && ["idle", "error"].includes(state.status);
  const busy = sending || state.status === "verifying";
  useEffect(() => { setBusy(busy); return () => setBusy(false); }, [busy, setBusy]);
  const protectDraft = Boolean(message) && message !== suggestion;
  const randomDisabled = !canAsk || busy || protectDraft;
  return <section aria-labelledby="demo-chat-heading" aria-describedby="demo-chat-description demo-chat-availability" className="min-w-0 border-t py-8 [overflow-wrap:anywhere]">
    <h2 id="demo-chat-heading" className="text-lg font-semibold tracking-tight">{translate("chat.heading", locale)}</h2>
    <p id="demo-chat-description" className="mt-2 text-sm leading-6 text-muted-foreground">
      {translate("chat.about", locale)}<span className="font-medium text-foreground">{researchTitle}</span>.
      {" "}{translate("chat.evidence", locale)}
    </p>
    <p id="demo-chat-availability" role="status" className="mt-3 text-sm leading-6">
      {state.status === "idle" ? translate("chat.idle", locale) :
        state.status === "verifying" ? translate("chat.verifying", locale) :
        sending ? translate("chat.wait", locale) :
        state.status === "ready" ? translate("chat.ready", locale) :
        state.status === "answered" ? translate("chat.answered", locale) : translate("chat.attention", locale)}
    </p>
    {state.notice && <p role="alert" className="mt-3 text-sm leading-6">{state.notice}</p>}
    {canStart && <Button type="button" className="mt-3" onClick={() => setAttempt(client.beginVerification())}>{translate("chat.start", locale)}</Button>}
    {state.status === "verifying" && attempt !== undefined && <DemoChatTurnstile key={attempt} siteKey={siteKey}
      onToken={(token) => { void client.verified(attempt, token); }}
      locale={locale} onFailure={(expired) => client.verificationFailed(attempt, expired)} />}
    <div role="region" aria-label={translate("chat.messages", locale)} aria-live="polite" aria-busy={sending} className="mt-4 min-h-40 min-w-0 rounded-lg border border-dashed bg-muted/30 p-4 sm:p-6">
      {state.question && <p className="mb-4 whitespace-pre-wrap text-sm leading-6"><span className="font-medium">{translate("chat.questionPrefix", locale)}</span>{state.question}</p>}
      {state.answer ? <DemoChatAnswerView answer={state.answer} locale={locale} /> : <p className="text-sm leading-6 text-muted-foreground">{sending ? translate("chat.preparing", locale) : translate("chat.noAnswer", locale)}</p>}
    </div>
    <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void client.question(message); }}>
      <label htmlFor="demo-chat-question" className="block text-sm font-medium">{translate("chat.question", locale)}</label>
      <Textarea ref={inputRef} id="demo-chat-question" placeholder={translate("chat.placeholder", locale)} rows={3} value={message} onChange={(event) => { setMessage(event.target.value); setSuggestion(""); }} disabled={!canAsk || busy}
        aria-describedby="demo-chat-availability demo-chat-input-help demo-chat-limits" className="min-w-0 resize-none disabled:opacity-100" />
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id="demo-chat-input-help" className="text-sm leading-6 text-muted-foreground">{translate("chat.inputHelp", locale, { count: Array.from(message).length })}</p>
        <div className="flex max-w-full flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={randomDisabled} aria-describedby="demo-chat-random-help"
            className="h-auto min-h-9 max-w-full whitespace-normal py-2" onClick={() => {
              if (randomDisabled) return;
              const question = selectDemoQuestion(getDemoQuestions(researchTitle, locale), suggestion);
              setMessage(question);
              setSuggestion(question);
              inputRef.current?.focus();
            }}>{translate("chat.random", locale)}</Button>
          <Button type="submit" disabled={!canAsk || busy || !message.trim() || Array.from(message).length > 500} className="h-auto min-h-9 max-w-full whitespace-normal py-2">{sending ? translate("chat.sending", locale) : translate("chat.send", locale)}</Button>
        </div>
      </div>
      <p id="demo-chat-random-help" className="text-sm leading-6 text-muted-foreground">{protectDraft ? translate("chat.draftHelp", locale) : translate("chat.randomHelp", locale)}</p>
      <p id="demo-chat-limits" className="text-sm leading-6 text-muted-foreground">{translate("chat.limits", locale)}</p>
    </form>
  </section>;
}
