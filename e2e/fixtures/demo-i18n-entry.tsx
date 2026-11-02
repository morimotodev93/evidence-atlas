// Browser-only synthetic display data. No server, environment, database or AI SDK.
import "temporal-polyfill/full/global";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { DemoShell } from "../../src/components/demo/demo-shell";
import { DemoResearchView, DemoWorkspaceView } from "../../src/components/demo/demo-pages";
import { resolveLocale } from "../../src/lib/i18n/locales";

import { curatedFixture } from "../../src/lib/demo/curated-test-fixtures";

const locale = resolveLocale(location.pathname.split("/")[1]);
const localized = /^\/(en|ja)\//.test(location.pathname);
const data = curatedFixture();
data.sources[0].id = "demo-source";
for (const finding of data.findings) {
  for (const link of finding.sources) link.sourceId = link.source.id;
}
const { research } = data;
const workspace = { id: "demo-workspace", name: "AI-Assisted Software Development", description: "Canonical workspace description",
  organization: { id: "demo-org", name: "Evidence Atlas Demo" }, researches: [{ ...research, tags: data.tags }] };

createRoot(document.getElementById("root")!).render(<ThemeProvider attribute="class">
  <DemoShell locale={locale} localized={localized}>
    {location.pathname.includes("/research/")
      ? <DemoResearchView data={data} locale={locale} localized={localized} chatEnabled siteKey="synthetic-site-key" />
      : <DemoWorkspaceView workspace={workspace} locale={locale} localized={localized} />}
  </DemoShell>
</ThemeProvider>);
