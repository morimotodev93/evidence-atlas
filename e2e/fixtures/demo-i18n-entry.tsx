// Browser-only synthetic display data. No server, environment, database or AI SDK.
import "temporal-polyfill/full/global";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { DemoShell } from "../../src/components/demo/demo-shell";
import { DemoResearchView, DemoWorkspaceView } from "../../src/components/demo/demo-pages";
import { resolveLocale } from "../../src/lib/i18n/locales";

const locale = resolveLocale(location.pathname.split("/")[1]);
const localized = /^\/(en|ja)\//.test(location.pathname);
const date = Temporal.Instant.from("2026-10-08T00:00:00Z");
const research = {
  id: "demo-research", title: "Developer Productivity", description: "Canonical English research description",
  status: "COMPLETED" as const, conclusion: "Canonical saved conclusion", createdAt: date, updatedAt: date,
};
const source = { id: "demo-source", title: "Original publication title", url: "https://sources.invalid/evidence", updatedAt: date };
const data = {
  research, sources: [source], comments: [], tags: [],
  findings: [{ id: "demo-finding", content: "Canonical evidence remains unchanged.", displayStyle: "TEXT" as const, updatedAt: date,
    sources: [{ sourceId: source.id, source }] }],
};
const workspace = { id: "demo-workspace", name: "AI-Assisted Software Development", description: "Canonical workspace description",
  organization: { id: "demo-org", name: "Evidence Atlas Demo" }, researches: [{ ...research, tags: [] }] };

createRoot(document.getElementById("root")!).render(<ThemeProvider attribute="class">
  <DemoShell locale={locale} localized={localized}>
    {location.pathname.includes("/research/")
      ? <DemoResearchView data={data} locale={locale} localized={localized} chatEnabled siteKey="synthetic-site-key" />
      : <DemoWorkspaceView workspace={workspace} locale={locale} localized={localized} />}
  </DemoShell>
</ThemeProvider>);
