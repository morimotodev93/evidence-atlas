import Link from "next/link";
import { ResearchListItems } from "@/components/research/research-list-items";
import { ResearchHeader, ResearchDetailContent } from "@/components/research/research-detail-content";
import { DemoResearchChatPanel } from "./demo-research-chat-panel";
import { defaultLocale, type Locale } from "@/lib/i18n/locales";
import { demoPath } from "@/lib/i18n/demo-routes";
import { translate } from "@/lib/i18n/translate";
import type { getDemoWorkspace, getDemoResearch } from "@/lib/demo/read";

type Workspace = NonNullable<Awaited<ReturnType<typeof getDemoWorkspace>>>;
type Research = NonNullable<Awaited<ReturnType<typeof getDemoResearch>>>;
export function DemoWorkspaceView({ workspace, locale = defaultLocale, localized = false }: { workspace: Workspace; locale?: Locale; localized?: boolean }) {
  return <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 [&_a]:scroll-mt-52 sm:[&_a]:scroll-mt-32 [&_a]:scroll-mb-2">
    <header className="mb-6">
      <p className="text-sm text-muted-foreground">{workspace.organization.name}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{workspace.name}</h1>
      {workspace.description && <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{workspace.description}</p>}
    </header>
    <section aria-label={translate("demo.researchList", locale)}>
      {workspace.researches.length > 0 ?
        <ResearchListItems items={workspace.researches} basePath={(localized ? `/${locale}/demo/research` : "/demo/research")} locale={locale} showStatus /> :
        <p className="text-sm text-muted-foreground">{translate("demo.noResearch", locale)}</p>}
    </section>
  </main>;
}

export function DemoResearchView({ data, locale = defaultLocale, localized = false, chatEnabled, siteKey }: { data: Research; locale?: Locale; localized?: boolean; chatEnabled: boolean; siteKey?: string }) {
  // Reserve space for the wrapped header including language and theme controls.
  return <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 [&_a]:scroll-mt-52 sm:[&_a]:scroll-mt-32 [&_a]:scroll-mb-2">
    <div className="mb-6">
      <Link href={demoPath(localized ? locale : undefined)} className="text-sm text-muted-foreground hover:text-foreground">{translate("demo.backToWorkspace", locale)}</Link>
    </div>
    <ResearchHeader research={data.research} tags={data.tags} locale={locale} />
    <ResearchDetailContent research={data.research} sources={data.sources} findings={data.findings} comments={data.comments} locale={locale} />
    <DemoResearchChatPanel locale={locale} researchTitle={data.research.title}
      researchId={chatEnabled ? data.research.id : undefined}
      siteKey={chatEnabled ? siteKey : undefined}
      sources={chatEnabled ? data.sources.map(({ id, title, url }) => ({ id, title, url })) : undefined} />
  </main>;
}
