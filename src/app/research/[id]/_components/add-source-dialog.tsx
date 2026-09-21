"use client";

import { useActionState, useState } from "react";

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
import { createSource, type CreateSourceState } from "../_actions/createSource";

type AddSourceDialogProps = {
  researchId: string;
};

const initialState: CreateSourceState = {
  error: null,
};

export function AddSourceDialog({ researchId }: AddSourceDialogProps) {
  const [state, action, isPending] = useActionState(
    createSource.bind(null, researchId),
    initialState,
  );

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const isTitleOverLimit = title.length > MAX_SOURCE_TITLE_LENGTH;
  const isUrlOverLimit = url.length > MAX_SOURCE_URL_LENGTH;

  const isInvalid = isTitleOverLimit || isUrlOverLimit;

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm">Add Source</Button>} />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>

          <DialogDescription>
            Add an external source used in this research.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          {state.error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive-text"
            >
              {state.error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="source-title">Title</Label>

            <Input
              id="source-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Source title"
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
                {title.length} / {MAX_SOURCE_TITLE_LENGTH}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-url">URL</Label>

            <Input
              id="source-url"
              name="url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || isInvalid}>
              {isPending ? "Adding..." : "Add Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
