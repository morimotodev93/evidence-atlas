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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createComment,
  type CreateCommentState,
} from "../_actions/createComment";

type AddCommentDialogProps = {
  researchId: string;
};

const MAX_COMMENT_LENGTH = 5000;

const initialState: CreateCommentState = {
  error: null,
};

export function AddCommentDialog({ researchId }: AddCommentDialogProps) {
  const [content, setContent] = useState("");

  const [state, action, isPending] = useActionState(
    createComment.bind(null, researchId),
    initialState,
  );

  const isOverLimit = content.length > MAX_COMMENT_LENGTH;

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm">Add Comment</Button>} />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Comment</DialogTitle>

          <DialogDescription>
            Add a question, interpretation, or unresolved point to this
            research.
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
            <Label htmlFor="comment-content">Comment</Label>

            <Textarea
              id="comment-content"
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Add a question, interpretation, or unresolved point..."
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
              {isPending ? "Adding..." : "Add Comment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
