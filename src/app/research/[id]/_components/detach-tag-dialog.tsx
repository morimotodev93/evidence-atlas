"use client";

import { useActionState } from "react";

import { XIcon } from "@/components/icons";
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
import { detachTag, type DetachTagState } from "../_actions/detachTag";

type DetachTagDialogProps = {
  researchId: string;
  tagId: string;
};

const initialState: DetachTagState = {
  error: null,
};

export function DetachTagDialog({ researchId, tagId }: DetachTagDialogProps) {
  const [state, action, isPending] = useActionState(
    detachTag.bind(null, researchId, tagId),
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Detach tag">
            <XIcon className="size-3.5" />
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detach Tag</DialogTitle>

          <DialogDescription>
            Are you sure you want to detach this tag from the research?
          </DialogDescription>
        </DialogHeader>

        <form action={action}>
          {state.error && (
            <p
              role="alert"
              className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive-text"
            >
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Detach..." : "Detach Tag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
