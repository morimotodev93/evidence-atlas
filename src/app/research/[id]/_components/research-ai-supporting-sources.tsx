import { safeSourceHref } from "@/lib/source-url";
import type { ResearchAiSource } from "./research-ai-panel";

// Shared by live answers and restored history after citation resolution.
export function ResearchAiSupportingSources({ sources }: { sources: ResearchAiSource[] }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-muted-foreground">
        Supporting sources
      </p>
      <div className="mt-2 space-y-1">
        {sources.map((source) => {
          const href = safeSourceHref(source.url);
          return href ? (
            <a
              key={source.id}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground"
            >
              {source.title}
            </a>
          ) : (
            <span key={source.id} className="block text-sm text-foreground">
              {source.title}
            </span>
          );
        })}
      </div>
    </div>
  );
}
