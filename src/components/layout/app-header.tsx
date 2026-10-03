import Link from "next/link";
import type { ReactNode } from "react";

import { signOut } from "@/auth";

type AppHeaderProps = {
  children?: ReactNode;
};

export function AppHeader({ children }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-4 py-2 sm:px-6 sm:py-0">
        <div className="flex items-center justify-between gap-3 sm:h-14">
          <Link href="/" className="shrink-0 font-semibold">
            Evidence Atlas
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/settings/organization"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              <span className="sm:hidden">Org</span>
              <span className="hidden sm:inline">Organization</span>
            </Link>

            <Link
              href="/settings/workspace"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              <span className="sm:hidden">WS</span>
              <span className="hidden sm:inline">Workspace</span>
            </Link>

            <form
              action={async () => {
                "use server";

                await signOut({
                  redirectTo: "/api/auth/signin",
                });
              }}
            >
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </form>

            <div className="hidden sm:block">{children}</div>
          </div>
        </div>

        {children && <div className="mt-2 sm:hidden">{children}</div>}
      </div>
    </header>
  );
}
