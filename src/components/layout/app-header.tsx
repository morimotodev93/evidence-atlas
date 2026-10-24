import Link from "next/link";
import type { ReactNode } from "react";

import { signOut } from "@/auth";
import { requireApplicationEnabled } from "@/lib/deployment-mode";
import { AppNavigationMenu } from "./app-navigation";

type AppHeaderProps = {
  children?: ReactNode;
};

export function AppHeader({ children }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="w-full px-3 py-2 sm:px-6 sm:py-0">
        <div className="flex items-center justify-between gap-3 sm:h-14">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <AppNavigationMenu />
            <Link href="/" className="min-w-0 rounded-sm text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base">
              Evidence Atlas
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <form
              action={async () => {
                "use server";

                requireApplicationEnabled();

                await signOut({
                  redirectTo: "/api/auth/signin",
                });
              }}
            >
              <button
                type="submit"
                className="min-h-9 rounded-md px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
