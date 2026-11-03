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
import {
  deleteFinding,
  type DeleteFindingState,
} from "../_actions/deleteFinding";

type DeleteFindingDialogProps = {
  locale?: Locale;
  findingId: string;
};

const initialState: DeleteFindingState = {
  error: null,
};

export function DeleteFindingDialog({ findingId, locale: requestedLocale }: DeleteFindingDialogProps) {
  const locale = resolveLocale(requestedLocale);
  const [state, action, isPending] = useActionState(
    deleteFinding.bind(null, findingId),
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            {translate("saasFinding.delete", locale)}
          </Button>
        }
      />

      <DialogContent locale={locale}>
        <DialogHeader>
          <DialogTitle>{translate("saasFinding.deleteTitle", locale)}</DialogTitle>

          <DialogDescription>
            {translate("saasFinding.deleteDescription", locale)}
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
              {translate(isPending ? "saasFinding.deleting" : "saasFinding.deleteTitle", locale)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
