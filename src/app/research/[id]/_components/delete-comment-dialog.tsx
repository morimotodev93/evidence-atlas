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
  deleteComment,
  type DeleteCommentState,
} from "../_actions/deleteComment";

type DeleteCommentDialogProps = {
  locale?: Locale;
  commentId: string;
};

const initialState: DeleteCommentState = {
  error: null,
};

export function DeleteCommentDialog({ commentId, locale: requestedLocale }: DeleteCommentDialogProps) {
  const locale = resolveLocale(requestedLocale);
  const [state, action, isPending] = useActionState(
    deleteComment.bind(null, commentId),
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            {translate("saasComment.delete", locale)}
          </Button>
        }
      />

      <DialogContent locale={locale}>
        <DialogHeader>
          <DialogTitle>{translate("saasComment.deleteTitle", locale)}</DialogTitle>

          <DialogDescription>
            {translate("saasComment.deleteDescription", locale)}
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
              {translate(isPending ? "saasComment.deleting" : "saasComment.deleteTitle", locale)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
