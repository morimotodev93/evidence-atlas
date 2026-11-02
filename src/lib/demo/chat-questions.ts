import { defaultLocale, type Locale } from "@/lib/i18n/locales";

// Canonical English titles identify topics; evidence titles are never translated.
const questionsByResearch: Record<string, readonly string[]> = {
  "Developer Productivity": [
    "What possible explanations does the saved evidence give for METR's measured slowdown?",
    "What did the GitHub Copilot productivity study measure?",
    "How do the tasks and settings in the METR and GitHub Copilot studies differ?",
    "Can we conclude that AI coding tools always improve productivity?",
    "What limitations should we consider when comparing AI coding studies?",
  ],
  "Code Quality & Reliability": [
    "Why should AI-generated code be reviewed and tested?",
    "What should code quality evaluation consider besides generation speed?",
    "What secure development practices remain necessary with AI coding tools?",
  ],
  "Developer Experience": [
    "How can AI coding assistants reduce repetitive development work?",
    "What does the saved evidence say about developer trust in AI output?",
    "Why do developers still need to understand AI-generated code?",
  ],
  "Adoption & Organizational Impact": [
    "What should an organization evaluate before adopting AI coding tools?",
    "Why should AI adoption be assessed beyond code generation volume?",
    "What role do policies and operational controls play in AI tool adoption?",
  ],
};
const generalQuestions = [
  "What are the main findings in this Research?",
  "What conclusion does the saved evidence support?",
  "What limitations should I consider when interpreting this Research?",
];

const japaneseQuestions: Record<string, readonly string[]> = {
  "Developer Productivity": [
    "METR の調査で作業時間が延びた理由として、保存された根拠からどのような可能性が考えられますか？",
    "GitHub Copilot の生産性に関する研究では、何を測定しましたか？",
    "METR と GitHub Copilot の研究では、課題や実験条件にどのような違いがありますか？",
    "AI コーディングツールは常に生産性を高めると結論づけられますか？",
    "AI コーディングに関する研究を比較する際、どのような限界に注意すべきですか？",
  ],
  "Code Quality & Reliability": [
    "AI が生成したコードにレビューやテストが必要なのはなぜですか？",
    "コード品質の評価では、生成速度以外に何を考慮すべきですか？",
    "AI コーディングツールを使う場合も、どのような安全な開発手法が必要ですか？",
  ],
  "Developer Experience": [
    "AI コーディング支援は、開発中の繰り返し作業をどのように減らせますか？",
    "AI の出力に対する開発者の信頼について、保存された根拠は何を示していますか？",
    "AI が生成したコードを開発者自身が理解する必要があるのはなぜですか？",
  ],
  "Adoption & Organizational Impact": [
    "AI コーディングツールを導入する前に、組織は何を評価すべきですか？",
    "AI 導入の評価で、コードの生成量以外も考慮すべきなのはなぜですか？",
    "AI ツールの導入において、方針や運用上の管理はどのような役割を果たしますか？",
  ],
};
const japaneseGeneral = [
  "このリサーチの主な調査結果は何ですか？",
  "保存された根拠から、どのような結論が支持されますか？",
  "このリサーチを解釈する際、どのような限界に注意すべきですか？",
];

export function getDemoQuestions(researchTitle: string, locale: Locale = defaultLocale): readonly string[] {
  const questions = locale === "ja" ? japaneseQuestions : questionsByResearch;
  return Object.hasOwn(questions, researchTitle) ? questions[researchTitle] : locale === "ja" ? japaneseGeneral : generalQuestions;
}

export function selectDemoQuestion(questions: readonly string[], previous: string, random = Math.random): string {
  const candidates = questions.filter((question) => question !== previous);
  return candidates.length ? candidates[Math.floor(random() * candidates.length)] : (questions[0] ?? "");
}
