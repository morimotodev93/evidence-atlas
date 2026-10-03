import Link from "next/link";
import type { ReactNode } from "react";

type AppHeaderProps = {
  children?: ReactNode;
};

export function AppHeader({ children }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 font-semibold">
          Evidence Atlas
        </Link>

        {children}
      </div>
    </header>
  );
}
