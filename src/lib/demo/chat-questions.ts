// Based on the saved Public Demo findings, not external pages or research ideas.
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

export function getDemoQuestions(researchTitle: string): readonly string[] {
  return Object.hasOwn(questionsByResearch, researchTitle) ? questionsByResearch[researchTitle] : generalQuestions;
}

export function selectDemoQuestion(questions: readonly string[], previous: string, random = Math.random): string {
  const candidates = questions.filter((question) => question !== previous);
  return candidates.length ? candidates[Math.floor(random() * candidates.length)] : (questions[0] ?? "");
}
