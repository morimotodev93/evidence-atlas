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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [state, action, isPending] = useActionState(
    updateFinding.bind(null, findingId),
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
              defaultValue={content}
              rows={6}
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
