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
  createFinding,
  type CreateFindingState,
} from "../_actions/createFinding";

type AddFindingDialogProps = {
  researchId: string;
};

const initialState: CreateFindingState = {
  error: null,
};

export function AddFindingDialog({ researchId }: AddFindingDialogProps) {
  const [state, action, isPending] = useActionState(
    createFinding.bind(null, researchId),
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm">Add Finding</Button>} />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Finding</DialogTitle>

          <DialogDescription>
            Add an evidence or insight from this research.
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
            <Label htmlFor="finding-content">Finding</Label>

            <Textarea
              id="finding-content"
              name="content"
              placeholder="Describe the evidence or insight..."
              rows={6}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Finding"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
