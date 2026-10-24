import type { ReactNode } from "react";

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-navigation";

export function AppShell({ children, header }: { children: ReactNode; header?: ReactNode }) {
  return (
    <>
      <AppHeader>{header}</AppHeader>
      <div className="flex min-h-[calc(100dvh-3.5rem)]">
        <AppSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
