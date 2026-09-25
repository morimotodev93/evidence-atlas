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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { attachFindingSource } from "../_actions/attachFindingSource";

type Source = {
  id: string;
  title: string;
};

type ManageFindingSourcesDialogProps = {
  findingId: string;
  sources: Source[];
};

const initialState = {
  error: null,
};

export function ManageFindingSourcesDialog({
  findingId,
  sources,
}: ManageFindingSourcesDialogProps) {
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState("");

  const attachAction = attachFindingSource.bind(null, findingId);

  const [state, formAction, pending] = useActionState(
    attachAction,
    initialState,
  );

  const selectedSource = sources.find((source) => source.id === sourceId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Add source
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add supporting source</DialogTitle>
          <DialogDescription>
            Select a source from this research to support the finding.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <Select
            name="sourceId"
            value={sourceId}
            onValueChange={(value) => {
              if (value) {
                setSourceId(value);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a source">
                {selectedSource?.title}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {sources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending || !sourceId}>
              {pending ? "Adding..." : "Add source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
