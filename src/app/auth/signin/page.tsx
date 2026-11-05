import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { getAuthErrorMessage, getPublicAuthError } from "@/auth/public-errors";
import { Button } from "@/components/ui/button";
import { requireApplicationEnabled } from "@/lib/deployment-mode";
import { getSaasLocale } from "@/lib/i18n/saas-locale";
import { translate } from "@/lib/i18n/translate";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
};

export async function generateMetadata() {
  requireApplicationEnabled();
  const locale = await getSaasLocale();
  return { title: translate("auth.signInTitle", locale), robots: { index: false, follow: false } };
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  requireApplicationEnabled();
  const locale = await getSaasLocale();
  const params = await searchParams;
  // Direct visits and Auth.js failure redirects can omit callbackUrl. Re-enter
  // its existing GET so Auth.js resolves/validates the saved callback cookie.
  // That endpoint always supplies callbackUrl to this configured sign-in page.
  if (typeof params.callbackUrl !== "string" || !params.callbackUrl) {
    redirect(params.error === undefined ? "/api/auth/signin"
      : `/api/auth/signin?error=${getPublicAuthError(params.error)}`);
  }
  // Auth.js validates this value again through its unchanged redirect callback.
  const callbackUrl = params.callbackUrl;

  return (
    <main lang={locale} className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-12 sm:px-6">
      <div className="w-full">
        <p className="text-sm font-medium text-muted-foreground">Evidence Atlas</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{translate("auth.signInTitle", locale)}</h1>
        {params.error !== undefined && (
          <p role="alert" className="mt-4 text-sm text-destructive">{getAuthErrorMessage(params.error, locale)}</p>
        )}
        <form className="mt-8" action={async () => {
          "use server";

          requireApplicationEnabled();
          try {
            await signIn("google", { redirectTo: callbackUrl });
          } catch (error) {
            if (error instanceof AuthError) {
              redirect(`/auth/error?error=${getPublicAuthError(error.type)}`);
            }
            // Includes Next.js's successful redirect; never render exception text.
            throw error;
          }
        }}>
          <Button type="submit" size="lg">{translate("auth.googleSignIn", locale)}</Button>
        </form>
      </div>
    </main>
  );
}
