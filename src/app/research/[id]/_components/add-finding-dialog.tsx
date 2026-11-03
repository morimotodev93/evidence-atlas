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
import { MAX_FINDING_LENGTH } from "@/types/research/finding";
import {
  createFinding,
  type CreateFindingState,
} from "../_actions/createFinding";

type AddFindingDialogProps = {
  locale?: Locale;
  researchId: string;
};

const initialState: CreateFindingState = {
  error: null,
};

export function AddFindingDialog({ researchId, locale: requestedLocale }: AddFindingDialogProps) {
  const locale = resolveLocale(requestedLocale);
  const [content, setContent] = useState("");

  const [state, action, isPending] = useActionState(
    createFinding.bind(null, researchId),
    initialState,
  );

  const isOverLimit = content.length > MAX_FINDING_LENGTH;

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm">{translate("saasFinding.add", locale)}</Button>} />

      <DialogContent locale={locale}>
        <DialogHeader>
          <DialogTitle>{translate("saasFinding.add", locale)}</DialogTitle>

          <DialogDescription>
            {translate("saasFinding.addDescription", locale)}
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
            <Label htmlFor="finding-content">{translate("saasFinding.label", locale)}</Label>

            <Textarea
              id="finding-content"
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={translate("saasFinding.contentPlaceholder", locale)}
              rows={6}
              className="min-h-32 max-h-[60vh] resize-y overflow-y-auto"
              required
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
                {content.length} / {MAX_FINDING_LENGTH}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || isOverLimit}>
              {translate(isPending ? "saasFinding.adding" : "saasFinding.add", locale)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
