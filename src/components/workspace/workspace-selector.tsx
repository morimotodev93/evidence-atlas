"use client";

import { useTransition } from "react";
import type { Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";

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
  locale?: Locale;
};

export function WorkspaceSelector({
  workspaces,
  currentWorkspaceId,
  locale = "en",
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
        <SelectValue placeholder={translate("workspaceSelector.placeholder", locale)}>
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
