import { redirect } from "next/navigation";

import { requireUser } from "@/auth/requireUser";
import { getAccessibleWorkspaces } from "@/workspace/getAccessibleWorkspaces";

import { OnboardingForm } from "./_components/onboarding-form";

export default async function OnboardingPage() {
  const user = await requireUser();

  const workspaces = await getAccessibleWorkspaces(user.id);

  if (workspaces.length > 0) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-12 sm:px-6">
      <div className="w-full">
        <p className="text-sm font-medium text-muted-foreground">
          Evidence Atlas
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Set up your workspace
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Create your organization and first workspace to start organizing
          research.
        </p>

        <div className="mt-8">
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
