import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DemoShell } from "@/components/demo/demo-shell";
import { requireDemoLocale } from "@/lib/i18n/demo-routes";

export default async function LocalizedDemoLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = requireDemoLocale((await params).locale);
  if (!locale) notFound();
  return <DemoShell locale={locale} localized>{children}</DemoShell>;
}
