import { notFound } from "next/navigation";
import { ResearchListItems } from "@/components/research/research-list-items";
import { getDemoWorkspace } from "@/lib/demo/read";

// Revalidate the publication configuration and database on every request.
export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const workspace = await getDemoWorkspace();
  if (!workspace) notFound();

  return <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
    <header className="mb-6">
      <p className="text-sm text-muted-foreground">{workspace.organization.name}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{workspace.name}</h1>
      {workspace.description && <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{workspace.description}</p>}
    </header>
    <section aria-label="Research list">
      {workspace.researches.length > 0 ?
        <ResearchListItems items={workspace.researches} basePath="/demo/research" showStatus /> :
        <p className="text-sm text-muted-foreground">No research available.</p>}
    </section>
  </main>;
}
