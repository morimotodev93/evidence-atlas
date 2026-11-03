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
  updateOrganizationMemberRole,
  type UpdateOrganizationMemberRoleState,
} from "../_actions/updateOrganizationMemberRole";

type OrganizationRole = "ADMIN" | "MEMBER";

type OrganizationMemberRoleFormProps = {
  organizationId: string;
  userId: string;
  initialRole: OrganizationRole;
  locale?: Locale;
};

const initialState: UpdateOrganizationMemberRoleState = {
  error: null,
};

export function OrganizationMemberRoleForm({
  organizationId,
  userId,
  initialRole,
  locale = "en",
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
