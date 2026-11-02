import { notFound } from "next/navigation";
import { getDemoResearch } from "@/lib/demo/read";
import { isDemoChatEnabled } from "@/lib/demo/chat-config";
import { DemoResearchView } from "@/components/demo/demo-pages";
import { demoMetadata, requireDemoLocale } from "@/lib/i18n/demo-routes";

type Props = { params: Promise<{ locale: string; researchId: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props) {
  const { locale: value, researchId } = await params;
  const locale = requireDemoLocale(value);
  if (!locale) notFound();
  return demoMetadata(locale, researchId);
}
export default async function LocalizedDemoResearchPage({ params }: Props) {
  const { locale: value, researchId } = await params;
  const locale = requireDemoLocale(value);
  if (!locale) notFound();
  const data = await getDemoResearch(researchId);
  if (!data) notFound();
  const chatEnabled = isDemoChatEnabled();
  return DemoResearchView({ data, locale, localized: true, chatEnabled,
    siteKey: chatEnabled ? process.env.NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY!.trim() : undefined });
}
