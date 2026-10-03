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
  updateOrganizationMemberRole,
  type UpdateOrganizationMemberRoleState,
} from "../_actions/updateOrganizationMemberRole";

type OrganizationRole = "ADMIN" | "MEMBER";

type OrganizationMemberRoleFormProps = {
  organizationId: string;
  userId: string;
  initialRole: OrganizationRole;
};

const initialState: UpdateOrganizationMemberRoleState = {
  error: null,
};

export function OrganizationMemberRoleForm({
  organizationId,
  userId,
  initialRole,
}: OrganizationMemberRoleFormProps) {
  const [role, setRole] = useState<OrganizationRole>(initialRole);

  const [state, action, isPending] = useActionState(
    updateOrganizationMemberRole.bind(null, organizationId, userId),
    initialState,
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <Select
        name="role"
        value={role}
        onValueChange={(value) => {
          if (value) {
            setRole(value as OrganizationRole);
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
