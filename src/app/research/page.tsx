import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/date";
import { db } from "@/prisma/db";
import Link from "next/link";

type ResearchPageProps = {
  searchParams: Promise<{
    query?: string;
    status?: string;
    sort?: string;
  }>;
};

export default async function Research({ searchParams }: ResearchPageProps) {
  const { query = "", status = "", sort = "updated" } = await searchParams;
  const normalizedQuery = query.trim().toLowerCase();

  const validStatuses = ["IN_PROGRESS", "COMPLETED", "ARCHIVED"] as const;

  const selectedStatus = validStatuses.includes(
    status as (typeof validStatuses)[number],
  )
    ? status
    : "";

  const validSorts = ["updated", "newest", "oldest"] as const;

  const selectedSort = validSorts.includes(sort as (typeof validSorts)[number])
    ? sort
    : "updated";

  const workspace = await db.orm.public.Workspace.all().then(
    (workspaces) => workspaces[0],
  );

  const researches = workspace
    ? await db.orm.public.Research.where({
        workspaceId: workspace.id,
      }).all()
    : [];

  const filteredResearches = researches.filter((research) => {
    const matchesSearch =
      !normalizedQuery ||
      research.title.toLowerCase().includes(normalizedQuery) ||
      (research.description?.toLowerCase() ?? "").includes(normalizedQuery);

    const matchesStatus = !selectedStatus || research.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const sortedResearches = [...filteredResearches].sort((a, b) => {
    switch (selectedSort) {
      case "newest":
        return (
          Number(b.createdAt.epochMilliseconds) -
          Number(a.createdAt.epochMilliseconds)
        );

      case "oldest":
        return (
          Number(a.createdAt.epochMilliseconds) -
          Number(b.createdAt.epochMilliseconds)
        );

      case "updated":
      default:
        return (
          Number(b.updatedAt.epochMilliseconds) -
          Number(a.updatedAt.epochMilliseconds)
        );
    }
  });

  const researchIds = researches.map((research) => research.id);

  const researchTags =
    researchIds.length > 0
      ? await db.orm.public.ResearchTag.where((researchTag) =>
          researchTag.researchId.in(researchIds),
        )
          .include("tag")
          .all()
      : [];

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
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Research
            </h1>
          </div>

          {workspace && (
            <Link
              href="/research/new"
              className={buttonVariants({ variant: "default" })}
            >
              New Research
            </Link>
          )}
        </header>
        {/* Search Bar */}
        <form
          action="/research"
          method="get"
          className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <label htmlFor="research-search" className="sr-only">
            Search research
          </label>

          <Input
            id="research-search"
            name="query"
            type="search"
            defaultValue={query}
            placeholder="Search research..."
            className="w-full sm:max-w-md"
          />

          <label htmlFor="research-status" className="sr-only">
            Filter by status
          </label>

          <select
            id="research-status"
            name="status"
            defaultValue={selectedStatus}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">All statuses</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <label htmlFor="research-sort" className="sr-only">
            Sort research
          </label>

          <select
            id="research-sort"
            name="sort"
            defaultValue={selectedSort}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="updated">Recently updated</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>

          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>

        {/* Research List */}
        <section aria-label="Research list">
          {researches.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h2 className="font-medium">No research yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first research to start building your knowledge.
              </p>
            </div>
          ) : sortedResearches.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h2 className="font-medium">No research found</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search term.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedResearches.map((research) => {
                const tagsForResearch = researchTags.filter(
                  (researchTag) => researchTag.researchId === research.id,
                );

                return (
                  <Link
                    key={research.id}
                    href={`/research/${research.id}`}
                    className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate font-medium">
                          {research.title}
                        </h2>

                        {research.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {research.description}
                          </p>
                        )}

                        {tagsForResearch.length > 0 && (
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {tagsForResearch.map((researchTag) => (
                              <Badge
                                key={`${researchTag.researchId}-${researchTag.tagId}`}
                                variant="secondary"
                              >
                                {researchTag.tag.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(research.createdAt)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
