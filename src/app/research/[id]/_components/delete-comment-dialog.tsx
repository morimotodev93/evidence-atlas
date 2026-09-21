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
  deleteComment,
  type DeleteCommentState,
} from "../_actions/deleteComment";

type DeleteCommentDialogProps = {
  commentId: string;
};

const initialState: DeleteCommentState = {
  error: null,
};

export function DeleteCommentDialog({ commentId }: DeleteCommentDialogProps) {
  const [state, action, isPending] = useActionState(
    deleteComment.bind(null, commentId),
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
          <DialogTitle>Delete Comment</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this comment? This action cannot be
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
              {isPending ? "Deleting..." : "Delete Comment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
