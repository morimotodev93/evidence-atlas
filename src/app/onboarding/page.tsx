import { redirect } from "next/navigation";

import { requireUser } from "@/auth/requireUser";
import { getSaasLocale } from "@/lib/i18n/saas-locale";
import { translate } from "@/lib/i18n/translate";
import { getAccessibleWorkspaces } from "@/workspace/getAccessibleWorkspaces";

import { OnboardingForm } from "./_components/onboarding-form";

export default async function OnboardingPage() {
  const user = await requireUser();

  const workspaces = await getAccessibleWorkspaces(user.id);

  if (workspaces.length > 0) {
    redirect("/");
  }

  const locale = await getSaasLocale();

  return (
    <main lang={locale} className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-12 sm:px-6">
      <div className="w-full">
        <p className="text-sm font-medium text-muted-foreground">
          Evidence Atlas
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {translate("onboarding.title", locale)}
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {translate("onboarding.description", locale)}
        </p>

        <div className="mt-8">
          <OnboardingForm locale={locale} />
        </div>
      </div>
    </main>
  );
}
