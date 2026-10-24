"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Building2, House, Menu, NotebookText, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Primary navigation",
    items: [
      { href: "/", label: "Home", icon: House },
      { href: "/research", label: "Research", icon: NotebookText },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings/organization", label: "Organization", icon: Building2 },
      { href: "/settings/workspace", label: "Workspace", icon: Users },
    ],
  },
] as const;

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Application" className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href ||
                (href === "/research" && pathname.startsWith("/research/"));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      active
                        ? "border-primary bg-accent font-semibold text-accent-foreground"
                        : "border-transparent text-muted-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppSidebar() {
  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-52 shrink-0 self-start overflow-y-auto border-r bg-muted/30 p-3 py-6 xl:block">
      <NavigationLinks />
    </aside>
  );
}

export function AppNavigationMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Release the modal and scroll lock if the persistent sidebar takes over.
    const desktop = window.matchMedia("(min-width: 80rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Dialog.Root modal open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border px-2 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring xl:hidden">
        <Menu aria-hidden="true" className="size-4" />
        <span>Menu</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Popup className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100%-2rem)] flex-col border-r bg-background text-foreground shadow-lg outline-none">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b p-4">
            <Dialog.Title className="font-semibold">Navigation</Dialog.Title>
            <Dialog.Close aria-label="Close navigation" className="inline-flex size-9 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 py-6">
            <NavigationLinks onNavigate={() => setOpen(false)} />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
