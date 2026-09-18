import { formatDate } from "@/lib/date";
import { db } from "@/prisma/db";
import Link from "next/link";
import { notFound } from "next/navigation";

type ResearchDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ResearchDetailPage({
  params,
}: ResearchDetailPageProps) {
  const { id } = await params;

  const research = await db.orm.public.Research.where({ id }).first();

  if (!research) {
    notFound();
  }

  const sources = await db.orm.public.Source.where({
    researchId: research.id,
  }).all();

  const findings = await db.orm.public.Finding.where({
    researchId: research.id,
  }).all();

  const comments = await db.orm.public.Comment.where({
    researchId: research.id,
  }).all();

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4 sm:px-6">
          <Link href="/" className="font-semibold">
            Evidence Atlas
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Back */}
        <div className="mb-6">
          <Link
            href="/research"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Research
          </Link>
        </div>

        {/* Research Header */}
        <header className="border-b pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Research</p>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {research.title}
              </h1>
            </div>

            <Link
              href={`/research/${research.id}/edit`}
              className="shrink-0 rounded-md border px-3 py-2 text-sm font-medium outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Edit
            </Link>
          </div>

          {research.description && (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              {research.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Created {formatDate(research.createdAt)}</span>
            <span>Updated {formatDate(research.updatedAt)}</span>
          </div>
        </header>

        {/* Conclusion */}
        <section className="border-b py-6">
          <h2 className="text-lg font-semibold">Conclusion</h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            The current conclusion will appear here. This section represents the
            current understanding reached from the collected evidence.
          </p>
        </section>

        {/* Sources */}
        <section className="border-b py-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Sources</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                External sources used in this research.
              </p>
            </div>

            <span className="text-xs text-muted-foreground">
              {sources.length} sources
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {sources.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">No sources yet.</p>
              </div>
            ) : (
              sources.map((source) => (
                <Link
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border bg-card p-4 hover:bg-muted/50"
                >
                  <h3 className="font-medium">{source.title}</h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {source.url}
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Updated {formatDate(source.updatedAt)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Findings */}
        <section className="border-b py-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Findings</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Evidence and insights extracted from the sources.
              </p>
            </div>

            <span className="text-xs text-muted-foreground">
              {findings.length} findings
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {findings.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No findings yet.
                </p>
              </div>
            ) : (
              findings.map((finding) => (
                <article
                  key={finding.id}
                  className="rounded-lg border bg-card p-4"
                >
                  <p className="text-sm leading-6">{finding.content}</p>

                  <div className="mt-3 flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground">
                      {finding.displayStyle}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      Updated {formatDate(finding.updatedAt)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Discussion */}
        <section className="py-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Discussion</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Discuss questions, interpretations, and unresolved points.
              </p>
            </div>

            <span className="text-xs text-muted-foreground">
              {comments.length} comments
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {comments.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No discussion yet.
                </p>
              </div>
            ) : (
              comments.map((comment) => (
                <article
                  key={comment.id}
                  className="rounded-lg border bg-card p-4"
                >
                  <p className="text-sm leading-6">{comment.content}</p>

                  <div className="mt-3 flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground">
                      User {comment.userId}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      Updated {formatDate(comment.updatedAt)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Development note */}
        <p className="mt-4 text-xs text-muted-foreground">
          Research ID: {research.id}
        </p>
      </main>
    </>
  );
}
