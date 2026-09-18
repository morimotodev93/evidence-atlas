import { formatDate } from "@/lib/date";
import { findMany } from "@/lib/prisma";
import { db } from "@/prisma/db";
import Link from "next/link";

export default async function Research() {
  const researches = await findMany(db.orm.public.Research);

  return (
    <>
      {/* Dummy Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4 sm:px-6">
          <Link href="/" className="font-semibold">
            Evidence Atlas
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6">
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Research
          </h1>
        </header>

        {/* Research List */}
        <section aria-label="Research list">
          {researches.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h2 className="font-medium">No research yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first research to start building your knowledge.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {researches.map((research) => (
                <Link
                  key={research.id}
                  href={`/research/${research.id}`}
                  className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate font-medium">{research.title}</h2>
                      {research.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {research.description}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(research.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
