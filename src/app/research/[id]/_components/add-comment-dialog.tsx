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
  createComment,
  type CreateCommentState,
} from "../_actions/createComment";

import { MAX_COMMENT_LENGTH } from "@/types/research/comment";

type AddCommentDialogProps = {
  locale?: Locale;
  researchId: string;
};

const initialState: CreateCommentState = {
  error: null,
};

export function AddCommentDialog({ researchId, locale: requestedLocale }: AddCommentDialogProps) {
  const locale = resolveLocale(requestedLocale);
  const [content, setContent] = useState("");

  const [state, action, isPending] = useActionState(
    createComment.bind(null, researchId),
    initialState,
  );

  const isOverLimit = content.length > MAX_COMMENT_LENGTH;

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm">{translate("saasComment.add", locale)}</Button>} />

      <DialogContent locale={locale}>
        <DialogHeader>
          <DialogTitle>{translate("saasComment.add", locale)}</DialogTitle>

          <DialogDescription>
            {translate("saasComment.addDescription", locale)}
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
            <Label htmlFor="comment-content">{translate("saasComment.label", locale)}</Label>

            <Textarea
              id="comment-content"
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={translate("saasComment.contentPlaceholder", locale)}
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
                {content.length} / {MAX_COMMENT_LENGTH}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || isOverLimit}>
              {translate(isPending ? "saasComment.adding" : "saasComment.add", locale)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
