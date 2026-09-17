import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Research Workspace
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Explore, organize, and build reusable knowledge from your research.
        </p>
      </header>

      <section aria-labelledby="recent-research-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2
            id="recent-research-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Recent Research
          </h2>

          <Link
            href="/research"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="space-y-3">
          <article className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">
              Choosing a vector database for a small SaaS
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Comparing PostgreSQL, dedicated vector databases, and their
              trade-offs for an AI application.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              8 findings · 3 sources · Updated 2 hours ago
            </p>
          </article>

          <article className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">
              Retrieval strategies for knowledge systems
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Exploring retrieval approaches for structured research knowledge.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              5 findings · 4 sources · Updated yesterday
            </p>
          </article>

          <article className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">
              Designing evidence-oriented research workflows
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Investigating how research findings can remain traceable and
              reusable.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              12 findings · 7 sources · Updated 3 days ago
            </p>
          </article>
        </div>
      </section>

      <section aria-labelledby="workspace-summary-heading" className="mt-10">
        <h2
          id="workspace-summary-heading"
          className="mb-4 text-lg font-semibold tracking-tight"
        >
          Workspace Summary
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Research</p>
            <p className="mt-1 text-2xl font-semibold">12</p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Sources</p>
            <p className="mt-1 text-2xl font-semibold">37</p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Findings</p>
            <p className="mt-1 text-2xl font-semibold">64</p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Tags</p>
            <p className="mt-1 text-2xl font-semibold">18</p>
          </div>
        </div>
      </section>
    </main>
  );
}
