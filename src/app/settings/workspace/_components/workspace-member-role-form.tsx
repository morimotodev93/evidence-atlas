"use client";

import { useActionState, useState } from "react";
import type { Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";

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
  locale?: Locale;
};

const initialState: UpdateWorkspaceMemberRoleState = {
  error: null,
};

export function WorkspaceMemberRoleForm({
  workspaceId,
  userId,
  initialRole,
  locale = "en",
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
          {/* Preserve the primitive's existing English value rendering. */}
          <SelectValue>{locale === "ja" ? translate(role === "ADMIN" ? "organization.adminOption" : "organization.memberOption", locale) : undefined}</SelectValue>
        </SelectTrigger>

        <SelectContent lang={locale}>
          <SelectItem value="ADMIN">{translate("organization.adminOption", locale)}</SelectItem>
          <SelectItem value="MEMBER">{translate("organization.memberOption", locale)}</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={isPending || role === initialRole}
      >
        {translate(isPending ? "organization.saving" : "organization.save", locale)}
      </Button>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
