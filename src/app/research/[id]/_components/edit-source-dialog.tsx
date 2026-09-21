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
import { updateSource, type UpdateSourceState } from "../_actions/updateSource";

type EditSourceDialogProps = {
  sourceId: string;
  title: string;
  url: string;
};

const initialState: UpdateSourceState = {
  error: null,
};

export function EditSourceDialog({
  sourceId,
  title,
  url,
}: EditSourceDialogProps) {
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
            Edit
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Source</DialogTitle>

          <DialogDescription>
            Update the source used in this research.
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
            <Label htmlFor={`source-title-${sourceId}`}>Title</Label>

            <Input
              id={`source-title-${sourceId}`}
              name="title"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
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
                {editTitle.length} / {MAX_SOURCE_TITLE_LENGTH}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`source-url-${sourceId}`}>URL</Label>

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
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
