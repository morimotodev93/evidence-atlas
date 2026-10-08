import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import { formatResearchStatus } from "./research-list-items";

type ResearchDisplay = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  conclusion: string | null;
  createdAt: Temporal.Instant;
  updatedAt: Temporal.Instant;
};
type SourceDisplay = {
  id: string;
  title: string;
  url: string;
  updatedAt: Temporal.Instant;
};
type FindingDisplay = {
  id: string;
  content: string;
  displayStyle: string;
  updatedAt: Temporal.Instant;
  sources: { sourceId: string; source: SourceDisplay }[];
};
type CommentDisplay = {
  id: string;
  content: string;
  authorName: string;
  createdAt: Temporal.Instant;
};

// Optional controls are composed by the authenticated Server Component only.
// This display module has no database, authentication, action, or AI dependency.
type HeaderControls = {
  edit?: ReactNode;
  status?: ReactNode;
  addTag?: ReactNode;
  tag?: (tagId: string) => ReactNode;
};
type ContentControls = {
  conclusion?: ReactNode;
  addSource?: ReactNode;
  addFinding?: ReactNode;
  addComment?: ReactNode;
  source?: (source: SourceDisplay) => ReactNode;
  finding?: (finding: FindingDisplay) => ReactNode;
  findingSource?: (findingId: string, sourceId: string) => ReactNode;
  findingSources?: (findingId: string, sources: { id: string; title: string }[]) => ReactNode;
  comment?: (comment: CommentDisplay) => ReactNode;
};

export function ResearchHeader({ research, tags, controls }: {
  research: ResearchDisplay;
  tags: { id: string; name: string }[];
  controls?: HeaderControls;
}) {
  return (
    <header className="border-b pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Research</p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {research.title}
          </h1>
        </div>

        {controls?.edit}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Badge variant="outline">
          {formatResearchStatus(research.status)}
        </Badge>

        {controls?.status}
      </div>

      {research.description && (
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          {research.description}
        </p>
      )}

      {/* Tags  */}
      <div className="mt-4 flex flex-wrap items-center  gap-2">
        {tags.map((tag) => (
          <Badge key={tag.id} variant="secondary">
            {tag.name}
            {controls?.tag?.(tag.id)}
          </Badge>
        ))}
        {controls?.addTag}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Created {formatDate(research.createdAt)}</span>
        <span>Updated {formatDate(research.updatedAt)}</span>
      </div>
    </header>
  );
}

export function ResearchDetailContent({ research, sources, findings, comments, controls }: {
  research: ResearchDisplay;
  sources: SourceDisplay[];
  findings: FindingDisplay[];
  comments: CommentDisplay[];
  controls?: ContentControls;
}) {
  return (
    <div className="min-w-0">
      {/* Conclusion */}
      <section className="border-b py-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Conclusion</h2>

          {controls?.conclusion}
        </div>

        {research.conclusion ? (
          <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6">
            {research.conclusion}
          </p>
        ) : (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            No conclusion yet.
          </p>
        )}
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

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {sources.length} sources
            </span>

            {controls?.addSource}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {sources.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No sources yet.
              </p>
            </div>
          ) : (
            sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-4"
              >
                <Link
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 hover:opacity-80"
                >
                  <h3 className="font-medium">{source.title}</h3>

                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {source.url}
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Updated {formatDate(source.updatedAt)}
                  </p>
                </Link>

                {controls?.source && <div className="flex shrink-0 items-center gap-2">{controls.source(source)}</div>}
              </div>
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

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {findings.length} findings
            </span>

            {controls?.addFinding}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="mt-4 space-y-3">
            {findings.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No findings yet.
                </p>
              </div>
            ) : (
              findings.map((finding) => {
                const attachedSourceIds = new Set(
                  finding.sources.map(
                    (findingSource) => findingSource.sourceId,
                  ),
                );

                const availableSources = sources
                  .filter((source) => !attachedSourceIds.has(source.id))
                  .map((source) => ({
                    id: source.id,
                    title: source.title,
                  }));

                return (
                  <article
                    key={finding.id}
                    className="rounded-lg border bg-card p-4"
                  >
                    <p className="text-sm whitespace-pre-wrap leading-6">
                      {finding.content}
                    </p>

                    {finding.sources.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Supporting sources
                        </p>

                        {finding.sources.map((findingSource) => (
                          <div
                            key={findingSource.sourceId}
                            className="flex items-center justify-between gap-3"
                          >
                            <Link
                              href={findingSource.source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm hover:underline"
                            >
                              {findingSource.source.title}
                            </Link>

                            {controls?.findingSource?.(finding.id, findingSource.sourceId)}
                          </div>
                        ))}
                      </div>
                    )}

                    {controls?.findingSources && availableSources.length > 0 && (
                      <div className="mt-3">
                        {controls?.findingSources?.(finding.id, availableSources)}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">
                        {finding.displayStyle}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Updated {formatDate(finding.updatedAt)}
                        </span>

                        {controls?.finding?.(finding)}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
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

        {controls?.addComment && (
          <div className="mt-4 flex justify-end">{controls.addComment}</div>
        )}

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
                <p className="text-sm whitespace-pre-wrap leading-6">
                  {comment.content}
                </p>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground">
                    {comment.authorName}
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      Commented {formatDate(comment.createdAt)}
                    </span>

                    {controls?.comment && <div className="flex items-center gap-2">{controls.comment(comment)}</div>}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
