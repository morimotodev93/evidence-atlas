"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  createInitialWorkspace,
  type CreateInitialWorkspaceState,
} from "../_actions/createInitialWorkspace";

const initialState: CreateInitialWorkspaceState = {
  error: null,
};

export function OnboardingForm() {
  const [state, action, isPending] = useActionState(
    createInitialWorkspace,
    initialState,
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="organizationName" className="text-sm font-medium">
          Organization name
        </label>

        <Input
          id="organizationName"
          name="organizationName"
          placeholder="Acme Research"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="workspaceName" className="text-sm font-medium">
          Workspace name
        </label>

        <Input
          id="workspaceName"
          name="workspaceName"
          placeholder="Research"
          required
          disabled={isPending}
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create workspace"}
      </Button>
    </form>
  );
}
