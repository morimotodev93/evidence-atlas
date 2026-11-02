import { defaultLocale, type Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DemoChatClientPanel } from "./demo-chat-client-panel";
import type { DemoChatSource } from "@/lib/demo/chat-client";

export function DemoResearchChatPanel({ researchTitle, researchId, siteKey, sources = [], locale = defaultLocale }: {
  researchTitle: string; researchId?: string; siteKey?: string; sources?: DemoChatSource[]; locale?: Locale;
}) {
  if (researchId && siteKey) return <DemoChatClientPanel key={`${researchId}:${siteKey}:${locale}`} locale={locale} researchId={researchId} researchTitle={researchTitle} siteKey={siteKey} sources={sources} />;
  return (
    <section
      aria-labelledby="demo-chat-heading"
      aria-describedby="demo-chat-description demo-chat-availability"
      className="min-w-0 border-t py-8 [overflow-wrap:anywhere]"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="demo-chat-heading" className="text-lg font-semibold tracking-tight">{translate("chat.heading", locale)}</h2>
        <Badge variant="secondary" className="h-auto whitespace-normal">{translate("chat.soon", locale)}</Badge>
      </div>
      <p id="demo-chat-description" className="mt-2 text-sm leading-6 text-muted-foreground">
        {translate("chat.about", locale)}<span className="font-medium text-foreground">{researchTitle}</span>.
        {" "}{translate("chat.plannedEvidence", locale)}
      </p>
      <p id="demo-chat-availability" className="mt-3 text-sm leading-6">
        {translate("chat.unavailable", locale)}
      </p>

      <div role="region" aria-label={translate("chat.messages", locale)} className="mt-4 flex min-h-40 min-w-0 items-center justify-center rounded-lg border border-dashed bg-muted/30 p-4 sm:p-6">
        <p className="max-w-prose text-center text-sm leading-6 text-muted-foreground">
          {translate("chat.noMessages", locale)}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <label htmlFor="demo-chat-question" className="block text-sm font-medium">{translate("chat.question", locale)}</label>
        <Textarea
          id="demo-chat-question"
          disabled
          rows={3}
          placeholder={translate("chat.placeholder", locale)}
          aria-describedby="demo-chat-availability demo-chat-input-help demo-chat-limits"
          className="min-w-0 resize-none disabled:opacity-100"
        />
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="demo-chat-input-help" className="min-w-0 text-sm leading-6 text-muted-foreground">
            {translate("chat.plannedInput", locale)}
          </p>
          <Button type="button" disabled aria-describedby="demo-chat-availability" className="h-auto min-h-9 max-w-full whitespace-normal py-2">
            {translate("chat.send", locale)}
          </Button>
        </div>
        <p id="demo-chat-limits" className="text-sm leading-6 text-muted-foreground">
          {translate("chat.plannedLimits", locale)}
        </p>
      </div>
    </section>
  );
}
