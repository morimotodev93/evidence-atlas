"use client";

import { useActionState } from "react";

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
import { deleteSource, type DeleteSourceState } from "../_actions/deleteSource";

type DeleteSourceDialogProps = {
  locale?: Locale;
  sourceId: string;
};

const initialState: DeleteSourceState = {
  error: null,
};

export function DeleteSourceDialog({ sourceId, locale: requestedLocale }: DeleteSourceDialogProps) {
  const locale = resolveLocale(requestedLocale);
  const [state, action, isPending] = useActionState(
    deleteSource.bind(null, sourceId),
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            {translate("saasSource.delete", locale)}
          </Button>
        }
      />

      <DialogContent locale={locale}>
        <DialogHeader>
          <DialogTitle>{translate("saasSource.deleteTitle", locale)}</DialogTitle>

          <DialogDescription>
            {translate("saasSource.deleteDescription", locale)}
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
              {translate(isPending ? "saasSource.deleting" : "saasSource.deleteTitle", locale)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
