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
import { MAX_FINDING_LENGTH } from "@/types/research/finding";
import {
  updateFinding,
  type UpdateFindingState,
} from "../_actions/updateFinding";

type EditFindingDialogProps = {
  findingId: string;
  content: string;
};

const initialState: UpdateFindingState = {
  error: null,
};

export function EditFindingDialog({
  findingId,
  content,
}: EditFindingDialogProps) {
  const [editedContent, setEditedContent] = useState(content);

  const [state, action, isPending] = useActionState(
    updateFinding.bind(null, findingId),
    initialState,
  );

  const isOverLimit = editedContent.length > MAX_FINDING_LENGTH;

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
          <DialogTitle>Edit Finding</DialogTitle>

          <DialogDescription>
            Update this evidence or insight.
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
            <Label htmlFor={`finding-content-${findingId}`}>Finding</Label>

            <Textarea
              id={`finding-content-${findingId}`}
              name="content"
              value={editedContent}
              onChange={(event) => setEditedContent(event.target.value)}
              rows={6}
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
                {editedContent.length} / {MAX_FINDING_LENGTH}
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
