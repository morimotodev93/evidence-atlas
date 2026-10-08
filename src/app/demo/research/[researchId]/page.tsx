import Link from "next/link";
import { notFound } from "next/navigation";
import { ResearchHeader, ResearchDetailContent } from "@/components/research/research-detail-content";
import { getDemoResearch } from "@/lib/demo/read";

export const dynamic = "force-dynamic";

export default async function DemoResearchPage({ params }: {
  params: Promise<{ researchId: string }>;
}) {
  const { researchId } = await params;
  const data = await getDemoResearch(researchId);
  if (!data) notFound();

  return <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
    <div className="mb-6">
      <Link href="/demo" className="text-sm text-muted-foreground hover:text-foreground">← Back to Demo Workspace</Link>
    </div>
    <ResearchHeader research={data.research} tags={data.tags} />
    <ResearchDetailContent research={data.research} sources={data.sources} findings={data.findings} comments={data.comments} />
  </main>;
}
