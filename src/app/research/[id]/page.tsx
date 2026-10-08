import { ResearchHeader, ResearchDetailContent } from "@/components/research/research-detail-content";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { db } from "@/prisma/db";
import Link from "next/link";

import { notFound } from "next/navigation";
import { detachFindingSource } from "./_actions/detachFindingSource";
import { AddCommentDialog } from "./_components/add-comment-dialog";
import { AddFindingDialog } from "./_components/add-finding-dialog";
import { ManageFindingSourcesDialog } from "./_components/add-finding-source-dialog";
import { AddSourceDialog } from "./_components/add-source-dialog";
import { AddTagDialog } from "./_components/add-tag-dialog";
import { DeleteCommentDialog } from "./_components/delete-comment-dialog";
import { DeleteFindingDialog } from "./_components/delete-finding-dialog";
import { DeleteSourceDialog } from "./_components/delete-source-dialog";
import { DetachTagDialog } from "./_components/detach-tag-dialog";
import { EditCommentDialog } from "./_components/edit-comment-dialog";
import { EditConclusionDialog } from "./_components/edit-conclusion-dialog";
import { EditFindingDialog } from "./_components/edit-finding-dialog";
import { EditResearchStatusDialog } from "./_components/edit-research-status-dialog";
import { EditSourceDialog } from "./_components/edit-source-dialog";
import { ResearchAiMobileDialog } from "./_components/research-ai-mobile-dialog";
import { ResearchAiPanel } from "./_components/research-ai-panel";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";

type ResearchDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ResearchDetailPage({
  params,
}: ResearchDetailPageProps) {
  const { id: researchId } = await params;

  const user = await requireUser();

  let research;

  try {
    research = await requireResearchAccess(user.id, researchId);
  } catch (error) {
    if (error instanceof ResearchAccessError) {
      notFound();
    }

    throw error;
  }

  const sources = await db.orm.public.Source.where({
    researchId: research.id,
  }).all();

  const findings = await db.orm.public.Finding.where({
    researchId: research.id,
  })
    .include("sources", (findingSource) => findingSource.include("source"))
    .all();

  const comments = await db.orm.public.Comment.where({
    researchId: research.id,
  })
    .include("user")
    .all();

  const researchTags = await db.orm.public.ResearchTag.where({
    researchId: research.id,
  })
    .include("tag")
    .all();

  return (
    <>
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pb-24 sm:pt-8 lg:pb-8">
        {" "}
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
        <ResearchHeader
          research={research}
          tags={researchTags.map(({ tag }) => ({ id: tag.id, name: tag.name }))}
          controls={{
            edit: <Link href={`/research/${research.id}/edit`} className="shrink-0 rounded-md border px-3 py-2 text-sm font-medium outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Edit</Link>,
            status: <EditResearchStatusDialog researchId={research.id} initialStatus={research.status} />,
            addTag: <AddTagDialog researchId={research.id} />,
            tag: (tagId) => <DetachTagDialog researchId={research.id} tagId={tagId} />,
          }}
        />
        {/* 2Column */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {" "}
          <ResearchDetailContent
            research={research}
            sources={sources}
            findings={findings}
            comments={comments.map((comment) => ({
              id: comment.id,
              content: comment.content,
              createdAt: comment.createdAt,
              authorName: comment.user.name ?? comment.user.username ?? "Unknown user",
            }))}
            controls={{
              conclusion: <EditConclusionDialog researchId={research.id} initialConclusion={research.conclusion} />,
              addSource: <AddSourceDialog researchId={research.id} />,
              source: (source) => <>
                <EditSourceDialog sourceId={source.id} title={source.title} url={source.url} />
                <DeleteSourceDialog sourceId={source.id} />
              </>,
              addFinding: <AddFindingDialog researchId={research.id} />,
              finding: (finding) => <>
                <EditFindingDialog findingId={finding.id} content={finding.content} />
                <DeleteFindingDialog findingId={finding.id} />
              </>,
              findingSource: (findingId, sourceId) => <form action={detachFindingSource.bind(null, findingId, sourceId)}>
                <Button type="submit" variant="ghost" size="sm">Remove</Button>
              </form>,
              findingSources: (findingId, availableSources) => <ManageFindingSourcesDialog findingId={findingId} sources={availableSources} />,
              addComment: <AddCommentDialog researchId={research.id} />,
              comment: (comment) => <>
                <EditCommentDialog commentId={comment.id} content={comment.content} />
                <DeleteCommentDialog commentId={comment.id} />
              </>,
            }}
          />
          {/* Sidebar */}
          <aside className="hidden py-6 lg:block">
            <div className="sticky top-20">
              <ResearchAiPanel
                researchId={research.id}
                sources={sources.map((source) => ({
                  id: source.id,
                  title: source.title,
                  url: source.url,
                }))}
              />
            </div>
          </aside>
        </div>
        {/* Development note */}
        <p className="mt-4 text-xs text-muted-foreground">
          Research ID: {research.id}
        </p>
        {/* Mobile AI */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto max-w-5xl px-1 sm:px-3">
            <ResearchAiMobileDialog
              researchId={research.id}
              sources={sources.map((source) => ({
                id: source.id,
                title: source.title,
                url: source.url,
              }))}
            />
          </div>
        </div>
      </main>
    </>
  );
}
