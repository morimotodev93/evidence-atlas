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
  updateComment,
  type UpdateCommentState,
} from "../_actions/updateComment";

type EditCommentDialogProps = {
  commentId: string;
  content: string;
};

const MAX_COMMENT_LENGTH = 5000;

const initialState: UpdateCommentState = {
  error: null,
};

export function EditCommentDialog({
  commentId,
  content,
}: EditCommentDialogProps) {
  const [editedContent, setEditedContent] = useState(content);

  const [state, action, isPending] = useActionState(
    updateComment.bind(null, commentId),
    initialState,
  );

  const isOverLimit = editedContent.length > MAX_COMMENT_LENGTH;

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
          <DialogTitle>Edit Comment</DialogTitle>

          <DialogDescription>Update this discussion comment.</DialogDescription>
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
            <Label htmlFor={`comment-content-${commentId}`}>Comment</Label>

            <Textarea
              id={`comment-content-${commentId}`}
              name="content"
              value={editedContent}
              onChange={(event) => setEditedContent(event.target.value)}
              className="min-h-40 max-h-[60vh] resize-y overflow-y-auto"
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
                {editedContent.length} / {MAX_COMMENT_LENGTH}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || isOverLimit}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
