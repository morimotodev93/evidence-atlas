import Link from "next/link";
import type { ReactNode } from "react";

type AppHeaderProps = {
  children?: ReactNode;
};

export function AppHeader({ children }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="shrink-0 font-semibold">
          Evidence Atlas
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/settings/organization"
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="sm:hidden">Org</span>
            <span className="hidden sm:inline">Organization</span>
          </Link>

          <Link
            href="/settings/workspace"
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="sm:hidden">WS</span>
            <span className="hidden sm:inline">Workspace</span>
          </Link>

          {children}
        </div>
      </div>
    </header>
  );
}
