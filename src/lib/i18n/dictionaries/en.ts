// The complete English dictionary defines the stable UI key contract.
export const en = {
  "demo.readOnly": "Read-only demo",
  "demo.sourceCode": "Source code",
  "demo.researchList": "Research list",
  "demo.noResearch": "No research available.",
  "demo.backToWorkspace": "← Back to Demo Workspace",
} as const;

export type TranslationKey = keyof typeof en;
export type Dictionary = Readonly<Record<TranslationKey, string>>;
