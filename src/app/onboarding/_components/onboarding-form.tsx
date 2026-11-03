"use client";

import { useActionState } from "react";
import type { Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  createInitialWorkspace,
  type CreateInitialWorkspaceState,
} from "../_actions/createInitialWorkspace";

const initialState: CreateInitialWorkspaceState = {
  error: null,
};

export function OnboardingForm({ locale = "en" }: { locale?: Locale } = {}) {
  const [state, action, isPending] = useActionState(
    createInitialWorkspace,
    initialState,
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="organizationName" className="text-sm font-medium">
          {translate("onboarding.organizationName", locale)}
        </label>

        <Input
          id="organizationName"
          name="organizationName"
          placeholder={translate("onboarding.organizationPlaceholder", locale)}
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="workspaceName" className="text-sm font-medium">
          {translate("onboarding.workspaceName", locale)}
        </label>

        <Input
          id="workspaceName"
          name="workspaceName"
          placeholder={translate("onboarding.workspacePlaceholder", locale)}
          required
          disabled={isPending}
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {translate(isPending ? "onboarding.creating" : "onboarding.create", locale)}
      </Button>
    </form>
  );
}
