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

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_TAG_LENGTH } from "@/types/research/tag";
import { createTag, type CreateTagState } from "../_actions/createTag";

type AddTagDialogProps = {
  researchId: string;
};

const initialState: CreateTagState = {
  error: null,
};

export function AddTagDialog({ researchId }: AddTagDialogProps) {
  const [name, setName] = useState("");

  const [state, action, isPending] = useActionState(
    createTag.bind(null, researchId),
    initialState,
  );

  const isOverLimit = name.length > MAX_TAG_LENGTH;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Add tag
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add tag</DialogTitle>
          <DialogDescription>
            Add a tag to organize this research.
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
            <Label htmlFor="name">Tag</Label>

            <Input
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_TAG_LENGTH + 1}
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
                {name.length}/{MAX_TAG_LENGTH}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || isOverLimit || name.trim().length === 0}
            >
              {isPending ? "Adding..." : "Add Tag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
