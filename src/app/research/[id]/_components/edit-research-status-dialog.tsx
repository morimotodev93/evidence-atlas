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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  updateResearchStatus,
  type UpdateResearchStatusState,
} from "../_actions/updateResearchStatus";

type ResearchStatus = "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";

type EditResearchStatusDialogProps = {
  researchId: string;
  initialStatus: ResearchStatus;
};

const initialState: UpdateResearchStatusState = {
  error: null,
};

export function EditResearchStatusDialog({
  researchId,
  initialStatus,
}: EditResearchStatusDialogProps) {
  const [status, setStatus] = useState<ResearchStatus>(initialStatus);

  const [state, action, isPending] = useActionState(
    updateResearchStatus.bind(null, researchId),
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Edit status
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit research status</DialogTitle>
          <DialogDescription>
            Update the current status of this research.
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
            <Label>Status</Label>

            <Select
              name="status"
              value={status}
              onValueChange={(value) => {
                if (value) {
                  setStatus(value as ResearchStatus);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
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
