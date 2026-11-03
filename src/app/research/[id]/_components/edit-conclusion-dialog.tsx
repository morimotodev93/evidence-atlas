"use client";

import { useActionState, useState } from "react";

import { resolveLocale, type Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";

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
import { Textarea } from "@/components/ui/textarea";
import {
  updateConclusion,
  type UpdateConclusionState,
} from "../_actions/updateConclusion";

import { MAX_CONCLUSION_LENGTH } from "@/types/research/conclusion";

type EditConclusionDialogProps = {
  locale?: Locale;
  researchId: string;
  initialConclusion: string | null;
};

const initialState: UpdateConclusionState = {
  error: null,
};

export function EditConclusionDialog({
  locale: requestedLocale,
  researchId,
  initialConclusion,
}: EditConclusionDialogProps) {
  const locale = resolveLocale(requestedLocale);
  const [conclusion, setConclusion] = useState(initialConclusion ?? "");
  const [state, action, isPending] = useActionState(
    updateConclusion.bind(null, researchId),
    initialState,
  );

  const isOverLimit = conclusion.length > MAX_CONCLUSION_LENGTH;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            {translate(initialConclusion ? "saasConclusion.edit" : "saasConclusion.add", locale)}
          </Button>
        }
      />

      <DialogContent locale={locale}>
        <DialogHeader>
          <DialogTitle>{translate("saasConclusion.editTitle", locale)}</DialogTitle>

          <DialogDescription>
            {translate("saasConclusion.editDescription", locale)}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          {state.error && (
            <p
              role="alert"
              lang="en"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive-text"
            >
              {state.error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor={`conclusion-content-${researchId}`}>
              {translate("saasConclusion.label", locale)}
            </Label>

            <Textarea
              id={`conclusion-content-${researchId}`}
              name="conclusion"
              value={conclusion}
              onChange={(event) => setConclusion(event.target.value)}
              maxLength={MAX_CONCLUSION_LENGTH + 1}
              className="min-h-40 max-h-[60vh] resize-y overflow-y-auto"
            />

            <div className="flex items-center justify-end">
              <p
                className={
                  isOverLimit
                    ? "text-xs text-destructive-text"
                    : "text-xs text-muted-foreground"
                }
                aria-live="polite"
              >
                {conclusion.length} / {MAX_CONCLUSION_LENGTH}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || isOverLimit}>
              {translate(isPending ? "saasConclusion.saving" : "saasConclusion.saveChanges", locale)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
