import Link from "next/link";
import { notFound } from "next/navigation";
import { ResearchHeader, ResearchDetailContent } from "@/components/research/research-detail-content";
import { getDemoResearch } from "@/lib/demo/read";
import { DemoResearchChatPanel } from "@/components/demo/demo-research-chat-panel";
import { isDemoChatEnabled } from "@/lib/demo/chat-config";

export const dynamic = "force-dynamic";

export default async function DemoResearchPage({ params }: {
  params: Promise<{ researchId: string }>;
}) {
  const { researchId } = await params;
  const data = await getDemoResearch(researchId);
  if (!data) notFound();
  const chatEnabled = isDemoChatEnabled();

  // At the default 16px root size, reserve 112px / 80px above focused links:
  // the two-line / single-line header is 97px / 61px with Appearance, and the
  // evidence outline extends 6px (2px width + 4px offset). Keep 8px below.
  return <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 [&_a]:scroll-mt-28 sm:[&_a]:scroll-mt-20 [&_a]:scroll-mb-2">
    <div className="mb-6">
      <Link href="/demo" className="text-sm text-muted-foreground hover:text-foreground">← Back to Demo Workspace</Link>
    </div>
    <ResearchHeader research={data.research} tags={data.tags} />
    <ResearchDetailContent research={data.research} sources={data.sources} findings={data.findings} comments={data.comments} />
    <DemoResearchChatPanel researchTitle={data.research.title}
      researchId={chatEnabled ? data.research.id : undefined}
      siteKey={chatEnabled ? process.env.NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY!.trim() : undefined}
      sources={chatEnabled ? data.sources.map(({ id, title, url }) => ({ id, title, url })) : undefined} />
  </main>;
}
