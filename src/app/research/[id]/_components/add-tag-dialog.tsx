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
import { MAX_TAG_LENGTH } from "@/types/research/tag";
import { createTag, type CreateTagState } from "../_actions/createTag";

type AddTagDialogProps = {
  locale?: Locale;
  researchId: string;
};

const initialState: CreateTagState = {
  error: null,
};

export function AddTagDialog({ researchId, locale: requestedLocale }: AddTagDialogProps) {
  const locale = resolveLocale(requestedLocale);
  const [name, setName] = useState("");

  const [state, action, isPending] = useActionState(
    createTag.bind(null, researchId),
    initialState,
  );

  const isOverLimit = name.length > MAX_TAG_LENGTH;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            {translate("saasTag.addTitle", locale)}
          </Button>
        }
      />

      <DialogContent locale={locale}>
        <DialogHeader>
          <DialogTitle>{translate("saasTag.addTitle", locale)}</DialogTitle>
          <DialogDescription>
            {translate("saasTag.addDescription", locale)}
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
            <Label htmlFor="name">{translate("saasTag.label", locale)}</Label>

            <Input
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_TAG_LENGTH + 1}
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
                {name.length}/{MAX_TAG_LENGTH}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || isOverLimit || name.trim().length === 0}
            >
              {translate(isPending ? "saasTag.adding" : "saasTag.add", locale)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
