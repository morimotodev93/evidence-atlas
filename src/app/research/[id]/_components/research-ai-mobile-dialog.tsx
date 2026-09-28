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

      <DialogContent className="flex max-h-[90dvh] flex-col">
        <DialogHeader>
          <DialogTitle>Ask AI</DialogTitle>

          <DialogDescription>
            Ask questions about this research.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ResearchAiPanel researchId={researchId} sources={sources} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
