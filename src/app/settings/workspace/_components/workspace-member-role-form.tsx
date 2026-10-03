"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  updateWorkspaceMemberRole,
  type UpdateWorkspaceMemberRoleState,
} from "../_actions/updateWorkspaceMemberRole";

type WorkspaceRole = "ADMIN" | "MEMBER";

type WorkspaceMemberRoleFormProps = {
  workspaceId: string;
  userId: string;
  initialRole: WorkspaceRole;
};

const initialState: UpdateWorkspaceMemberRoleState = {
  error: null,
};

export function WorkspaceMemberRoleForm({
  workspaceId,
  userId,
  initialRole,
}: WorkspaceMemberRoleFormProps) {
  const [role, setRole] = useState<WorkspaceRole>(initialRole);

  const [state, action, isPending] = useActionState(
    updateWorkspaceMemberRole.bind(null, workspaceId, userId),
    initialState,
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <Select
        name="role"
        value={role}
        onValueChange={(value) => {
          if (value) {
            setRole(value as WorkspaceRole);
          }
        }}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="ADMIN">Admin</SelectItem>
          <SelectItem value="MEMBER">Member</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={isPending || role === initialRole}
      >
        {isPending ? "Saving..." : "Save"}
      </Button>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
