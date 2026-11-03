import { ResearchListItems } from "@/components/research/research-list-items";
import { AppShell } from "@/components/layout/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/prisma/db";
import Link from "next/link";

import { requireUser } from "@/auth/requireUser";
import { requireCurrentWorkspace } from "@/workspace/requireCurrentWorkspace";

import { WorkspaceSelector } from "@/components/workspace/workspace-selector";
import { getAccessibleWorkspaces } from "@/workspace/getAccessibleWorkspaces";
import { translate } from "@/lib/i18n/translate";

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

  const user = await requireUser();

  const [workspace, workspaces] = await Promise.all([
    requireCurrentWorkspace(user.id),
    getAccessibleWorkspaces(user.id),
  ]);

  const workspaceOptions = workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
  }));

  const researches = await db.orm.public.Research.where({
    workspaceId: workspace.id,
  }).all();

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
    <AppShell
      header={(locale) => (
        <WorkspaceSelector
          locale={locale}
          workspaces={workspaceOptions}
          currentWorkspaceId={workspace.id}
        />
      )}
    >
      {(locale) => <main lang={locale} className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{workspace.name}</p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {translate("saasResearch.label", locale)}
            </h1>
          </div>

          <Link
            href="/research/new"
            className={buttonVariants({ variant: "default" })}
          >
            {translate("saasResearch.new", locale)}
          </Link>
        </header>
        {/* Search Bar */}
        <form
          action="/research"
          method="get"
          className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <label htmlFor="research-search" className="sr-only">
            {translate("saasResearch.search", locale)}
          </label>

          <Input
            id="research-search"
            name="query"
            type="search"
            defaultValue={query}
            placeholder={translate("saasResearch.searchPlaceholder", locale)}
            className="w-full sm:max-w-md"
          />

          <label htmlFor="research-status" className="sr-only">
            {translate("saasResearch.filterStatus", locale)}
          </label>

          <select
            id="research-status"
            name="status"
            defaultValue={selectedStatus}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">{translate("saasResearch.allStatuses", locale)}</option>
            <option value="IN_PROGRESS">{translate("research.inProgress", locale)}</option>
            <option value="COMPLETED">{translate("research.completed", locale)}</option>
            <option value="ARCHIVED">{translate("research.archived", locale)}</option>
          </select>

          <label htmlFor="research-sort" className="sr-only">
            {translate("saasResearch.sort", locale)}
          </label>

          <select
            id="research-sort"
            name="sort"
            defaultValue={selectedSort}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="updated">{translate("saasResearch.recentlyUpdated", locale)}</option>
            <option value="newest">{translate("saasResearch.newest", locale)}</option>
            <option value="oldest">{translate("saasResearch.oldest", locale)}</option>
          </select>

          <Button type="submit" variant="outline">
            {translate("saasResearch.apply", locale)}
          </Button>
        </form>

        {/* Research List */}
        <section aria-label={translate("saasResearch.list", locale)}>
          {researches.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h2 className="font-medium">{translate("saasResearch.noResearch", locale)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {translate("saasResearch.noResearchDescription", locale)}
              </p>
            </div>
          ) : sortedResearches.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h2 className="font-medium">{translate("saasResearch.noResults", locale)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {translate("saasResearch.noResultsDescription", locale)}
              </p>
            </div>
          ) : (
            <ResearchListItems
              locale={locale}
              items={sortedResearches.map((research) => ({
                ...research,
                tags: researchTags.filter((link) => link.researchId === research.id)
                  .map(({ tag }) => ({ id: tag.id, name: tag.name })),
              }))}
              basePath="/research"
            />
          )}
        </section>
      </main>}
    </AppShell>
  );
}
