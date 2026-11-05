"use client";

import { usePathname } from "next/navigation";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";

export function NotFoundContent({ saasLocale }: { saasLocale?: Locale }) {
  // not-found receives no route props. Read only the pathname for Demo's
  // established URL locale; never display the path, query or resource identity.
  const pathname = usePathname();
  const demo = pathname?.match(/^\/(?:(en|ja)\/)?demo(?:\/|$)/);
  const locale = resolveLocale(demo ? demo[1] : saasLocale);

  return (
    <main lang={locale} className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-12 sm:px-6">
      <div className="w-full">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{translate("errors.notFoundTitle", locale)}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{translate("errors.notFoundDescription", locale)}</p>
      </div>
    </main>
  );
}
