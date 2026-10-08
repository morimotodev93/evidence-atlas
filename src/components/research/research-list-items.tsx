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

export function formatResearchStatus(status: string) {
  switch (status) {
    case "IN_PROGRESS": return "In progress";
    case "COMPLETED": return "Completed";
    case "ARCHIVED": return "Archived";
    default: return status;
  }
}

export function ResearchListItems({ items, basePath, showStatus = false }: {
  items: ResearchListItem[];
  basePath: "/research" | "/demo/research";
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
              {showStatus && <Badge className="mt-3" variant="outline">{formatResearchStatus(research.status)}</Badge>}
              {research.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {research.tags.map((tag) => <Badge key={tag.id} variant="secondary">{tag.name}</Badge>)}
                </div>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatDate(research.createdAt)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
