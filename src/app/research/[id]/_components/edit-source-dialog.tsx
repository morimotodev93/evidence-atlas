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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_SOURCE_TITLE_LENGTH,
  MAX_SOURCE_URL_LENGTH,
} from "@/types/research/source";
import { updateSource, type UpdateSourceState } from "../_actions/updateSource";

type EditSourceDialogProps = {
  locale?: Locale;
  sourceId: string;
  title: string;
  url: string;
};

const initialState: UpdateSourceState = {
  error: null,
};

export function EditSourceDialog({
  locale: requestedLocale,
  sourceId,
  title,
  url,
}: EditSourceDialogProps) {
  const locale = resolveLocale(requestedLocale);
  const [state, action, isPending] = useActionState(
    updateSource.bind(null, sourceId),
    initialState,
  );

  const [editTitle, setEditTitle] = useState(title);
  const [editUrl, setEditUrl] = useState(url);

  const isTitleOverLimit = editTitle.length > MAX_SOURCE_TITLE_LENGTH;

  const isUrlOverLimit = editUrl.length > MAX_SOURCE_URL_LENGTH;

  const isInvalid = isTitleOverLimit || isUrlOverLimit;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            {translate("saasSource.edit", locale)}
          </Button>
        }
      />

      <DialogContent locale={locale}>
        <DialogHeader>
          <DialogTitle>{translate("saasSource.editTitle", locale)}</DialogTitle>

          <DialogDescription>
            {translate("saasSource.editDescription", locale)}
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
            <Label htmlFor={`source-title-${sourceId}`}>{translate("saasSource.title", locale)}</Label>

            <Input
              id={`source-title-${sourceId}`}
              name="title"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              placeholder={translate("saasSource.titlePlaceholder", locale)}
              required
            />

            <div className="flex items-center justify-end">
              <p
                className={
                  isTitleOverLimit
                    ? "text-xs text-destructive-text"
                    : "text-xs text-muted-foreground"
                }
                aria-live="polite"
              >
                {editTitle.length} / {MAX_SOURCE_TITLE_LENGTH}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`source-url-${sourceId}`}>{translate("saasSource.url", locale)}</Label>

            <Input
              id={`source-url-${sourceId}`}
              name="url"
              type="url"
              value={editUrl}
              onChange={(event) => setEditUrl(event.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || isInvalid}>
              {translate(isPending ? "saasSource.saving" : "saasSource.saveChanges", locale)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
