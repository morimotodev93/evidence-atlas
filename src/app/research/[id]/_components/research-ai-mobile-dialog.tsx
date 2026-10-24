"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ResearchAiPanel, type ResearchAiSource } from "./research-ai-panel";

type ResearchAiMobileDialogProps = {
  researchId: string;
  sources: ResearchAiSource[];
};

export function ResearchAiMobileDialog({
  researchId,
  sources,
}: ResearchAiMobileDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" className="w-full">
            Ask AI
          </Button>
        }
      />

      <DialogContent className="flex h-[90dvh] max-h-[90dvh] min-w-0 flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>Ask AI</DialogTitle>

          <DialogDescription className="sr-only">
            Ask questions about this research.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ResearchAiPanel researchId={researchId} sources={sources} variant="mobile" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
