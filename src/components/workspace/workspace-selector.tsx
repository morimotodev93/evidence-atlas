"use client";

import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { switchWorkspace } from "@/workspace/switchWorkspace";

type WorkspaceOption = {
  id: string;
  name: string;
};

type WorkspaceSelectorProps = {
  workspaces: WorkspaceOption[];
  currentWorkspaceId: string;
};

export function WorkspaceSelector({
  workspaces,
  currentWorkspaceId,
}: WorkspaceSelectorProps) {
  const [isPending, startTransition] = useTransition();

  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === currentWorkspaceId,
  );

  return (
    <Select
      value={currentWorkspaceId}
      disabled={isPending}
      onValueChange={(workspaceId) => {
        if (!workspaceId || workspaceId === currentWorkspaceId) {
          return;
        }

        startTransition(async () => {
          await switchWorkspace(workspaceId);
        });
      }}
    >
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue placeholder="Select workspace">
          {currentWorkspace?.name}
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        {workspaces.map((workspace) => (
          <SelectItem key={workspace.id} value={workspace.id}>
            {workspace.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
