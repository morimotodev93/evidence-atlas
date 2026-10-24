import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import { safeSourceHref } from "@/lib/source-url";
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

const actionGroup = "flex flex-wrap items-center gap-2 [&_button]:min-h-8 [&_button]:min-w-8";
const evidenceLink = "rounded-sm underline decoration-border underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

function SectionHeading({ title, description, count, action }: {
  title: string;
  description: string;
  count?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1 basis-48">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {count && <span className="text-xs text-muted-foreground">{count}</span>}
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action && <div className={actionGroup}>{action}</div>}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="mt-4 rounded-md border border-dashed px-4 py-3 text-sm leading-6 text-muted-foreground">{children}</p>;
}

export function ResearchHeader({ research, tags, controls }: {
  research: ResearchDisplay;
  tags: { id: string; name: string }[];
  controls?: HeaderControls;
}) {
  return (
    <header className="min-w-0 border-b pb-8 [overflow-wrap:anywhere]">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Research</p>

          <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {research.title}
          </h1>
        </div>

        {controls?.edit && <div className={actionGroup}>{controls.edit}</div>}
      </div>

      <div className={`mt-4 ${actionGroup}`}>
        <Badge variant="outline">
          {formatResearchStatus(research.status)}
        </Badge>

        {controls?.status}
      </div>

      {research.description && (
        <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground sm:text-base">
          {research.description}
        </p>
      )}

      {/* Tags  */}
      {(tags.length > 0 || controls?.addTag) && <div className={`mt-4 ${actionGroup}`}>
        {tags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="h-auto min-h-6 max-w-full shrink overflow-visible whitespace-normal py-1">
            <span className="min-w-0">{tag.name}</span>
            {controls?.tag?.(tag.id)}
          </Badge>
        ))}
        {controls?.addTag}
      </div>}

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
    <div className="min-w-0 [overflow-wrap:anywhere]">
      {/* Conclusion */}
      <section className="border-b py-8">
        <SectionHeading title="Conclusion" description="Current synthesis of this research." action={controls?.conclusion} />

        {research.conclusion ? (
          <p className="mt-4 max-w-3xl whitespace-pre-wrap text-base leading-7">
            {research.conclusion}
          </p>
        ) : (
          <EmptyState>No conclusion yet.</EmptyState>
        )}
      </section>

      {/* Sources */}
      <section className="border-b py-8">
        <SectionHeading title="Sources" description="External sources used in this research." count={`${sources.length} sources`} action={controls?.addSource} />

        <div className="mt-4 space-y-3">
          {sources.length === 0 ? (
            <EmptyState>No sources yet.</EmptyState>
          ) : (
            sources.map((source) => {
              const href = safeSourceHref(source.url);
              const content = (
                <>
                  <h3 className="text-base leading-6 font-medium">{source.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {source.url}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Updated {formatDate(source.updatedAt)}
                  </p>
                </>
              );

              return (
                <div
                  key={source.id}
                  className="flex min-w-0 flex-col items-start gap-3 border-b pb-4 last:border-b-0 last:pb-0"
                >
                  {href ? (
                    <Link
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`min-w-0 max-w-full ${evidenceLink}`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="min-w-0 max-w-full">{content}</div>
                  )}

                  {controls?.source && <div className={actionGroup}>{controls.source(source)}</div>}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Findings */}
      <section className="border-b py-8">
        <SectionHeading title="Findings" description="Evidence and insights extracted from the sources." count={`${findings.length} findings`} action={controls?.addFinding} />

        <div className="mt-4 space-y-3">
          {findings.length === 0 ? (
            <EmptyState>No findings yet.</EmptyState>
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
                  className="min-w-0 border-b pb-5 last:border-b-0 last:pb-0"
                >
                  <p className="whitespace-pre-wrap text-base leading-7">
                    {finding.content}
                  </p>

                  {finding.sources.length > 0 && (
                    <div className="mt-4 space-y-2 border-l-2 pl-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        Supporting sources
                      </p>

                      {finding.sources.map((findingSource) => {
                        const href = safeSourceHref(findingSource.source.url);
                        return (
                          <div
                            key={findingSource.sourceId}
                            className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2"
                          >
                            {href ? (
                              <Link
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`min-w-0 flex-1 basis-40 text-sm leading-6 ${evidenceLink}`}
                              >
                                {findingSource.source.title}
                              </Link>
                            ) : (
                              <span className="min-w-0 flex-1 basis-40 text-sm leading-6">{findingSource.source.title}</span>
                            )}

                            {controls?.findingSource && <div className={actionGroup}>{controls.findingSource(finding.id, findingSource.sourceId)}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {controls?.findingSources && availableSources.length > 0 && (
                    <div className={`mt-4 ${actionGroup}`}>
                      {controls?.findingSources?.(finding.id, availableSources)}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                    <span className="text-xs text-muted-foreground">
                      {finding.displayStyle}
                    </span>

                    <div className={actionGroup}>
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
      </section>

      {/* Discussion */}
      <section className="py-8">
        <SectionHeading title="Discussion" description="Discuss questions, interpretations, and unresolved points." count={`${comments.length} comments`} action={controls?.addComment} />

        <div className="mt-4 space-y-3">
          {comments.length === 0 ? (
            <EmptyState>No discussion yet.</EmptyState>
          ) : (
            comments.map((comment) => (
              <article
                key={comment.id}
                className="min-w-0 border-b pb-5 last:border-b-0 last:pb-0"
              >
                <p className="whitespace-pre-wrap text-base leading-7">
                  {comment.content}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                  <span className="text-xs text-muted-foreground">
                    {comment.authorName}
                  </span>

                  <div className={actionGroup}>
                    <span className="text-xs text-muted-foreground">
                      Commented {formatDate(comment.createdAt)}
                    </span>

                    {controls?.comment && <div className={actionGroup}>{controls.comment(comment)}</div>}
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
