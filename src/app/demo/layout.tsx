import { Badge } from "@/components/ui/badge";
import { Github } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/demo" className="font-semibold">
            Evidence Atlas
          </Link>

          <Badge variant="secondary">Demo</Badge>

          <span className="text-sm text-muted-foreground">Read-only demo</span>

          <a
            href="https://github.com/morimotodev93/evidence-atlas"
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Github className="size-4" aria-hidden="true" />
            Source code
          </a>
        </div>
      </header>

      {children}
    </>
  );
}
