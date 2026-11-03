import type { ReactNode } from "react";

import { getSaasLocale } from "@/lib/i18n/saas-locale";
import type { Locale } from "@/lib/i18n/locales";

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-navigation";

export async function AppShell({ children, header }: {
  children: ReactNode | ((locale: Locale) => ReactNode);
  header?: ReactNode | ((locale: Locale) => ReactNode);
}) {
  const locale = await getSaasLocale();

  return (
    <>
      <AppHeader locale={locale}>{typeof header === "function" ? header(locale) : header}</AppHeader>
      <div className="flex min-h-[calc(100dvh-3.5rem)]">
        <AppSidebar locale={locale} />
        <div className="min-w-0 flex-1">{typeof children === "function" ? children(locale) : children}</div>
      </div>
    </>
  );
}
