"use client";

import { useActionState } from "react";

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
              defaultValue={title}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`source-url-${sourceId}`}>URL</Label>

            <Input
              id={`source-url-${sourceId}`}
              name="url"
              type="url"
              defaultValue={url}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
