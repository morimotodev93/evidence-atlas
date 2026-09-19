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
import {
  deleteFinding,
  type DeleteFindingState,
} from "../_actions/deleteFinding";

type DeleteFindingDialogProps = {
  findingId: string;
};

const initialState: DeleteFindingState = {
  error: null,
};

export function DeleteFindingDialog({ findingId }: DeleteFindingDialogProps) {
  const [state, action, isPending] = useActionState(
    deleteFinding.bind(null, findingId),
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            Delete
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Finding</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this finding? This action cannot be
            undone.
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
              {isPending ? "Deleting..." : "Delete Finding"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
