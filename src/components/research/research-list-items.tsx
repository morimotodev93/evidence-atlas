import { defaultLocale, type Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";

export type ResearchListItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: Temporal.Instant;
  tags: { id: string; name: string }[];
};

export function formatResearchStatus(status: string, locale: Locale = defaultLocale) {
  switch (status) {
    case "IN_PROGRESS": return translate("research.inProgress", locale);
    case "COMPLETED": return translate("research.completed", locale);
    case "ARCHIVED": return translate("research.archived", locale);
    default: return status;
  }
}

export function ResearchListItems({ items, basePath, showStatus = false, locale = defaultLocale }: {
  items: ResearchListItem[];
  basePath: "/research" | "/demo/research" | `/${Locale}/demo/research`;
  locale?: Locale;
  showStatus?: boolean;
}) {
  return (
    <div className="space-y-3">
      {items.map((research) => (
        <Link key={research.id} href={`${basePath}/${research.id}`}
          className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate font-medium">{research.title}</h2>
              {research.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{research.description}</p>
              )}
              {showStatus && <Badge className="mt-3" variant="outline">{formatResearchStatus(research.status, locale)}</Badge>}
              {research.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {research.tags.map((tag) => <Badge key={tag.id} variant="secondary">{tag.name}</Badge>)}
                </div>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatDate(research.createdAt, locale)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
