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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { attachFindingSource } from "../_actions/attachFindingSource";

type Source = {
  id: string;
  title: string;
};

type ManageFindingSourcesDialogProps = {
  locale?: Locale;
  findingId: string;
  sources: Source[];
};

const initialState = {
  error: null,
};

export function ManageFindingSourcesDialog({
  locale: requestedLocale,
  findingId,
  sources,
}: ManageFindingSourcesDialogProps) {
  const locale = resolveLocale(requestedLocale);
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState("");

  const attachAction = attachFindingSource.bind(null, findingId);

  const [state, formAction, pending] = useActionState(
    attachAction,
    initialState,
  );

  const selectedSource = sources.find((source) => source.id === sourceId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {translate("saasFinding.addSource", locale)}
      </DialogTrigger>

      <DialogContent locale={locale}>
        <DialogHeader>
          <DialogTitle>{translate("saasFinding.supportingTitle", locale)}</DialogTitle>
          <DialogDescription>
            {translate("saasFinding.supportingDescription", locale)}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <Select
            name="sourceId"
            value={sourceId}
            onValueChange={(value) => {
              if (value) {
                setSourceId(value);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={translate("saasFinding.selectSource", locale)}>
                {selectedSource?.title}
              </SelectValue>
            </SelectTrigger>

            <SelectContent lang={locale}>
              {sources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {state.error && (
            <p lang="en" className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending || !sourceId}>
              {translate(pending ? "saasFinding.adding" : "saasFinding.addSource", locale)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
