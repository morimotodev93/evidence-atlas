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
  const [content, setContent] = useState("");

  const [state, action, isPending] = useActionState(
    createFinding.bind(null, researchId),
    initialState,
  );

  const isOverLimit = content.length > MAX_FINDING_LENGTH;

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
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Describe the evidence or insight..."
              rows={6}
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
                {content.length} / {MAX_FINDING_LENGTH}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || isOverLimit}>
              {isPending ? "Adding..." : "Add Finding"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
