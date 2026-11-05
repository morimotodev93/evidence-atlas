"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";
import { getErrorMessage } from "@/lib/i18n/errors";
import { translate } from "@/lib/i18n/translate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  updateResearchStatus,
  type UpdateResearchStatusState,
} from "../_actions/updateResearchStatus";

type ResearchStatus = "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";

type EditResearchStatusDialogProps = {
  researchId: string;
  initialStatus: ResearchStatus;
  locale?: Locale;
};

const statusLabels = {
  IN_PROGRESS: "saasResearch.inProgress",
  COMPLETED: "saasResearch.completed",
  ARCHIVED: "saasResearch.archived",
} as const;

const initialState: UpdateResearchStatusState = {
  error: null,
};

export function EditResearchStatusDialog({
  researchId,
  initialStatus,
  locale: requestedLocale,
}: EditResearchStatusDialogProps) {
  const locale = resolveLocale(requestedLocale);
  const [status, setStatus] = useState<ResearchStatus>(initialStatus);

  const [state, action, isPending] = useActionState(
    updateResearchStatus.bind(null, researchId),
    initialState,
  );
  // Keep unexpected error data on the established, explicitly English fallback.
  const errorLocale = state.error?.code === "RESEARCH_INVALID_STATUS"
    || state.error?.code === "RESEARCH_NOT_FOUND"
    || state.error?.code === "RESEARCH_STATUS_UPDATE_FAILED" ? locale : "en";

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            {translate("saasResearch.editStatus", locale)}
          </Button>
        }
      />

      <DialogContent locale={locale}>
        <DialogHeader>
          <DialogTitle>{translate("saasResearch.statusDialogTitle", locale)}</DialogTitle>
          <DialogDescription>
            {translate("saasResearch.statusDialogDescription", locale)}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          {state.error && (
            <p
              role="alert"
              lang={errorLocale}
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive-text"
            >
              {getErrorMessage(state.error, errorLocale)}
            </p>
          )}

          <div className="space-y-2">
            <Label>{translate("saasResearch.status", locale)}</Label>

            <Select
              name="status"
              value={status}
              onValueChange={(value) => {
                if (value) {
                  setStatus(value as ResearchStatus);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{locale === "ja" ? translate(statusLabels[status], locale) : undefined}</SelectValue>
              </SelectTrigger>

              <SelectContent lang={locale}>
                <SelectItem value="IN_PROGRESS">{translate(statusLabels.IN_PROGRESS, locale)}</SelectItem>
                <SelectItem value="COMPLETED">{translate(statusLabels.COMPLETED, locale)}</SelectItem>
                <SelectItem value="ARCHIVED">{translate(statusLabels.ARCHIVED, locale)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {translate(isPending ? "saasResearch.saving" : "saasResearch.saveChanges", locale)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
