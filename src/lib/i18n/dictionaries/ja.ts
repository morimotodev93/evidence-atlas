import type { Dictionary } from "./en";

// Intentionally partial in Phase 1; absent entries use the English text.
export const ja = {
  "demo.readOnly": "閲覧専用デモ",
  "demo.sourceCode": "ソースコード",
  "demo.researchList": "リサーチ一覧",
  "demo.backToWorkspace": "← デモワークスペースに戻る",
} as const satisfies Partial<Dictionary>;
