import Link from "next/link";

import { db } from "@/prisma/db";

import { formatDate } from "@/lib/date";

export default async function Home() {
  const workspace = await db.orm.public.Workspace.all().then(
    (workspaces) => workspaces[0],
  );

  const researches = workspace
    ? await db.orm.public.Research.where({
        workspaceId: workspace.id,
      }).all()
    : [];

  const recentResearches = [...researches]
    .sort(
      (a, b) =>
        Number(b.updatedAt.epochMilliseconds) -
        Number(a.updatedAt.epochMilliseconds),
    )
    .slice(0, 3);

  const researchIds = researches.map((research) => research.id);

  const sources =
    researchIds.length > 0
      ? await db.orm.public.Source.where((source) =>
          source.researchId.in(researchIds),
        ).all()
      : [];

  const findings =
    researchIds.length > 0
      ? await db.orm.public.Finding.where((finding) =>
          finding.researchId.in(researchIds),
        ).all()
      : [];

  const tags = workspace
    ? await db.orm.public.Tag.where({
        workspaceId: workspace.id,
      }).all()
    : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {workspace?.name ?? "Research Workspace"}
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
          {recentResearches.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">No research yet.</p>
            </div>
          ) : (
            recentResearches.map((research) => {
              const sourceCount = sources.filter(
                (source) => source.researchId === research.id,
              ).length;

              const findingCount = findings.filter(
                (finding) => finding.researchId === research.id,
              ).length;

              return (
                <Link
                  key={research.id}
                  href={`/research/${research.id}`}
                  className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
                >
                  <h3 className="font-medium">{research.title}</h3>

                  {research.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {research.description}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-muted-foreground">
                    {findingCount} findings · {sourceCount} sources · Updated{" "}
                    {formatDate(research.updatedAt)}
                  </p>
                </Link>
              );
            })
          )}
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
            <p className="mt-1 text-2xl font-semibold">
              {researches.length}
            </p>{" "}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Sources</p>
            <p className="mt-1 text-2xl font-semibold">{sources.length}</p>{" "}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Findings</p>
            <p className="mt-1 text-2xl font-semibold">
              {findings.length}
            </p>{" "}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Tags</p>
            <p className="mt-1 text-2xl font-semibold">{tags.length}</p>{" "}
          </div>
        </div>
      </section>
    </main>
  );
}
