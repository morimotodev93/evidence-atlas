import { Badge } from "@/components/ui/badge";
import { AppearanceSelect } from "@/components/appearance-select";
import { Github } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { defaultLocale, type Locale } from "@/lib/i18n/locales";
import { DemoLanguageBoundary, DemoLanguageSelect } from "./demo-language";
import { translate } from "@/lib/i18n/translate";
import { demoPath } from "@/lib/i18n/demo-routes";

export function DemoShell({ children, locale = defaultLocale, localized = false }: { children: ReactNode; locale?: Locale; localized?: boolean }) {
  return (
    <DemoLanguageBoundary><div lang={locale}>
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href={demoPath(localized ? locale : undefined)} className="font-semibold">
            Evidence Atlas
          </Link>

          <Badge variant="secondary">{translate("demo.badge", locale)}</Badge>

          <span className="text-sm text-muted-foreground">{translate("demo.mode", locale)}</span>


          <a
            href="https://github.com/morimotodev93/evidence-atlas"
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Github className="size-4" aria-hidden="true" />
            {translate("demo.sourceCode", locale)}
          </a>
          <AppearanceSelect locale={locale} />
          <DemoLanguageSelect locale={locale} />
        </div>
      </header>

      {children}
    </div></DemoLanguageBoundary>
  );
}
