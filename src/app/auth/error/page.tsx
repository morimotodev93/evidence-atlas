import Link from "next/link";

import { getAuthErrorMessage } from "@/auth/public-errors";
import { requireApplicationEnabled } from "@/lib/deployment-mode";
import { getSaasLocale } from "@/lib/i18n/saas-locale";
import { translate } from "@/lib/i18n/translate";

type AuthErrorPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export async function generateMetadata() {
  requireApplicationEnabled();
  const locale = await getSaasLocale();
  return { title: translate("auth.errorTitle", locale), robots: { index: false, follow: false } };
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  // Do not require a session here: an auth failure must not create a redirect loop.
  requireApplicationEnabled();
  const locale = await getSaasLocale();
  const { error } = await searchParams;

  return (
    <main lang={locale} className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-12 sm:px-6">
      <div className="w-full">
        <p className="text-sm font-medium text-muted-foreground">Evidence Atlas</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{translate("auth.errorTitle", locale)}</h1>
        <p role="alert" className="mt-4 text-sm text-destructive">{getAuthErrorMessage(error, locale)}</p>
        <Link href="/api/auth/signin" className="mt-8 inline-flex min-h-9 items-center rounded-md text-sm underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {translate("auth.signInTitle", locale)}
        </Link>
      </div>
    </main>
  );
}
