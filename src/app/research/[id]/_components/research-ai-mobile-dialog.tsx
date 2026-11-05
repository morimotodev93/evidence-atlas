"use client";

import { Button } from "@/components/ui/button";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ResearchAiPanel, type ResearchAiSource } from "./research-ai-panel";

type ResearchAiMobileDialogProps = {
  locale?: Locale;
  researchId: string;
  sources: ResearchAiSource[];
};

export function ResearchAiMobileDialog({
  researchId,
  sources,
  locale: localeProp,
}: ResearchAiMobileDialogProps) {
  const locale = resolveLocale(localeProp);
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" lang={locale} className="w-full">
            {translate("saasAi.ask", locale)}
          </Button>
        }
      />

      <DialogContent locale={locale} className="flex h-[90dvh] max-h-[90dvh] min-w-0 flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>{translate("saasAi.ask", locale)}</DialogTitle>

          <DialogDescription className="sr-only">
            {translate("saasAi.description", locale)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ResearchAiPanel locale={locale} researchId={researchId} sources={sources} variant="mobile" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
