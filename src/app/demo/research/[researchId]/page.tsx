import { notFound } from "next/navigation";
import { getDemoResearch } from "@/lib/demo/read";
import { isDemoChatEnabled } from "@/lib/demo/chat-config";
import { DemoResearchView } from "@/components/demo/demo-pages";
import { demoMetadata } from "@/lib/i18n/demo-routes";

type Props = { params: Promise<{ researchId: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props) {
  return demoMetadata("en", (await params).researchId);
}
export default async function DemoResearchPage({ params }: Props) {
  const data = await getDemoResearch((await params).researchId);
  if (!data) notFound();
  const chatEnabled = isDemoChatEnabled();
  return DemoResearchView({ data, chatEnabled,
    siteKey: chatEnabled ? process.env.NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY!.trim() : undefined });
}
