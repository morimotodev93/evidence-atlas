"use client";

import { useActionState } from "react";

import { XIcon } from "@/components/icons";
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
import { detachTag, type DetachTagState } from "../_actions/detachTag";

type DetachTagDialogProps = {
  locale?: Locale;
  researchId: string;
  tagId: string;
};

const initialState: DetachTagState = {
  error: null,
};

export function DetachTagDialog({ researchId, tagId, locale: requestedLocale }: DetachTagDialogProps) {
  const locale = resolveLocale(requestedLocale);
  const [state, action, isPending] = useActionState(
    detachTag.bind(null, researchId, tagId),
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={translate("saasTag.detachLabel", locale)}>
            <XIcon className="size-3.5" />
          </Button>
        }
      />

      <DialogContent locale={locale}>
        <DialogHeader>
          <DialogTitle>{translate("saasTag.detachTitle", locale)}</DialogTitle>

          <DialogDescription>
            {translate("saasTag.detachDescription", locale)}
          </DialogDescription>
        </DialogHeader>

        <form action={action}>
          {state.error && (
            <p
              role="alert"
              lang="en"
              className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive-text"
            >
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {translate(isPending ? "saasTag.detaching" : "saasTag.detachTitle", locale)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
