"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ResearchAiPanel, type ResearchAiSource } from "./research-ai-panel";

type ResearchAiDesktopLayoutProps = {
  researchId: string;
  sources: ResearchAiSource[];
  children: ReactNode;
};

export function ResearchAiDesktopLayout({ researchId, sources, children }: ResearchAiDesktopLayoutProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) panel.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    let focusFrame: number | undefined;
    function onBreakpointChange() {
      if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame);
      if (desktop.matches) return;
      // The desktop trigger is hidden below lg; return to the Research body.
      // Also dismiss a portaled History picker by deactivating the panel.
      if (panel.current?.contains(document.activeElement) ||
          trigger.current === document.activeElement ||
          document.querySelector('[data-desktop-ai-history]')) {
        // Wait until a modal History picker has unmounted and released inert.
        focusFrame = window.requestAnimationFrame(() => {
          content.current?.focus({ preventScroll: true });
        });
      }
      setOpen(false);
    }
    desktop.addEventListener("change", onBreakpointChange);
    return () => {
      desktop.removeEventListener("change", onBreakpointChange);
      if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame);
    };
  }, []);

  function closePanel() {
    trigger.current?.focus({ preventScroll: true });
    setOpen(false);
  }

  return (
    <>
      <div className="mb-4 hidden justify-end lg:flex">
        <Button ref={trigger} type="button" variant="outline" aria-expanded={open}
          aria-controls={panelId} onClick={() => open ? closePanel() : setOpen(true)}>
          Ask AI
        </Button>
      </div>
      <div className={open
        ? "grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]"
        : "grid grid-cols-[minmax(0,1fr)] gap-5"}>
        <div ref={content} tabIndex={-1} className="min-w-0 outline-none">
          {children}
        </div>
        <aside ref={panel} id={panelId} aria-label="AI Assistant" tabIndex={-1}
          hidden={!open} inert={!open}
          className={open ? "hidden min-w-0 py-6 outline-none lg:block" : "hidden"}>
          <div className="sticky top-20">
            {/* Keep this instance mounted: hiding must not cancel a send or lose chat state. */}
            <ResearchAiPanel researchId={researchId} sources={sources} active={open} onClose={closePanel} />
          </div>
        </aside>
      </div>
    </>
  );
}
