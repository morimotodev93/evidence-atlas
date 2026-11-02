import { notFound } from "next/navigation";
import { getDemoWorkspace } from "@/lib/demo/read";
import { DemoWorkspaceView } from "@/components/demo/demo-pages";
import { demoMetadata, requireDemoLocale } from "@/lib/i18n/demo-routes";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props) {
  const locale = requireDemoLocale((await params).locale);
  if (!locale) notFound();
  return demoMetadata(locale);
}
export default async function LocalizedDemoPage({ params }: Props) {
  const locale = requireDemoLocale((await params).locale);
  if (!locale) notFound();
  const workspace = await getDemoWorkspace();
  if (!workspace) notFound();
  return DemoWorkspaceView({ workspace, locale, localized: true });
}
