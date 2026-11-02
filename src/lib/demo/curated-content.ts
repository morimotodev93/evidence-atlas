// Canonical English seed content. Semantic keys are code-only, never persisted.
type DemoSource = {
  key: string;
  title: string;
  url: string;
};

type DemoFinding = {
  key: string;
  content: string;
  sourceKeys: string[];
};

type DemoResearch = {
  key: string;
  title: string;
  description: string;
  conclusion: string;
  tags: string[];
  sources: DemoSource[];
  findings: DemoFinding[];
  comment: string;
  conversation: {
    question: string;
    answer: string;
    sourceKeys: string[];
  };
};

export const demoResearches: DemoResearch[] = [
  {
    key: "developer-productivity",
    title: "Developer Productivity",
    description:
      "How AI coding assistants affect development speed, task completion, and engineering productivity.",
    conclusion:
      "AI coding assistants can improve productivity for some development tasks, but the size and direction of the effect depend on task type, developer experience, workflow, and how productivity is measured.",
    tags: ["AI", "Productivity"],

    sources: [
      {
        key: "github-productivity",
        title:
          "Research: Quantifying GitHub Copilot's impact on developer productivity and happiness",
        url: "https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/",
      },
      {
        key: "metr-productivity",
        title:
          "Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity",
        url: "https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/",
      },
      {
        key: "stackoverflow-ai",
        title: "Stack Overflow Developer Survey",
        url: "https://survey.stackoverflow.co/",
      },
    ],

    findings: [
      // Verified against the linked primary publications on 2026-10-31.
      // Preserve each study's completion-time metric and historical scope.
      {
        key: "github-http-server",
        content:
          "GitHub's 2022 randomized experiment assigned 95 professional developers to implement a JavaScript HTTP server with or without Copilot. It reported 55% faster task completion with Copilot: average completion times were 1 hour 11 minutes with Copilot versus 2 hours 41 minutes without. This measured task-completion result is distinct from the article's separate survey responses, and is not a general software-delivery productivity rate.",
        sourceKeys: ["github-productivity"],
      },
      {
        key: "nonuniform-effects",
        content:
          "Productivity effects are not uniform across developers or task types.",
        sourceKeys: ["github-productivity", "metr-productivity"],
      },
      {
        key: "metr-early-2025",
        content:
          "METR's July 2025 randomized controlled trial covered 16 experienced open-source developers and 246 real issues in repositories they knew well. Allowing early-2025 AI tools increased issue-completion time by 19% compared with working without AI. This is a measured slowdown in that setting, not evidence that all developers or later AI tools are slower.",
        sourceKeys: ["metr-productivity"],
      },
      {
        key: "possible-explanations",
        content:
          "METR discusses high quality standards and implicit repository requirements, including testing, documentation and formatting, as possible explanations for limited AI usefulness. These are hypotheses rather than a single established cause of the slowdown. Its familiar-repository tasks differ from GitHub's isolated HTTP-server task; the studies do not establish a universal productivity effect.",
        sourceKeys: ["metr-productivity", "github-productivity"],
      },
      {
        key: "workflow-integration",
        content:
          "Developer adoption of AI tools is widespread enough that productivity evaluation should consider real workflow integration rather than isolated code generation alone.",
        sourceKeys: ["stackoverflow-ai"],
      },
    ],

    comment:
      "Productivity should be evaluated using multiple measures rather than assuming that faster code generation automatically means faster software delivery.",

    conversation: {
      question:
        "What does the evidence suggest about AI coding assistants and developer productivity?",
      answer:
        "The evidence suggests that AI coding assistants can improve productivity for some tasks, but the effect varies by workflow, task, and developer experience.",
      sourceKeys: ["github-productivity", "metr-productivity"],
    },
  },

  {
    key: "code-quality",
    title: "Code Quality & Reliability",
    description:
      "How AI-assisted coding affects correctness, maintainability, review requirements, and software reliability.",
    conclusion:
      "AI-generated code can accelerate implementation, but it still requires ordinary engineering review, testing, security controls, and maintenance discipline.",
    tags: ["AI", "Code Quality", "Security"],

    sources: [
      {
        key: "github-responsible-use",
        title: "Responsible use of GitHub Copilot",
        url: "https://docs.github.com/en/copilot/responsible-use-of-github-copilot-features",
      },
      {
        key: "nist-ssdf",
        title: "NIST Secure Software Development Framework",
        url: "https://csrc.nist.gov/projects/ssdf",
      },
      {
        key: "owasp-llm",
        title: "OWASP GenAI Security Project",
        url: "https://genai.owasp.org/",
      },
    ],

    findings: [
      {
        key: "review-and-test",
        content:
          "AI-generated code should be reviewed and tested rather than treated as automatically correct.",
        sourceKeys: ["github-responsible-use"],
      },
      {
        key: "secure-development",
        content:
          "Secure development practices remain necessary regardless of whether code is written manually or generated with AI assistance.",
        sourceKeys: ["nist-ssdf"],
      },
      {
        key: "trust-boundaries",
        content:
          "AI-enabled development introduces additional trust and validation boundaries that engineering teams need to manage.",
        sourceKeys: ["github-responsible-use", "owasp-llm"],
      },
      {
        key: "quality-measures",
        content:
          "Code quality evaluation should include correctness, security, maintainability, and reviewability rather than generation speed alone.",
        sourceKeys: ["nist-ssdf", "github-responsible-use"],
      },
    ],

    comment:
      "The useful question is not whether generated code looks plausible, but whether it survives the same engineering controls as other code.",

    conversation: {
      question: "Can AI-generated code be trusted without human review?",
      answer:
        "The available evidence does not support treating AI-generated code as automatically trustworthy. Review, testing, and secure-development controls remain necessary.",
      sourceKeys: ["github-responsible-use", "nist-ssdf"],
    },
  },

  {
    key: "developer-experience",
    title: "Developer Experience",
    description:
      "How AI coding tools affect developer satisfaction, cognitive load, learning, trust, and day-to-day workflow.",
    conclusion:
      "AI coding assistants can reduce repetitive effort and improve developer experience, but developers still need to evaluate suggestions critically and maintain enough understanding to review generated work.",
    tags: ["AI", "Developer Experience"],

    sources: [
      {
        key: "github-experience",
        title:
          "Research: Quantifying GitHub Copilot's impact on developer productivity and happiness",
        url: "https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/",
      },
      {
        key: "stackoverflow-developer-survey",
        title: "Stack Overflow Developer Survey",
        url: "https://survey.stackoverflow.co/",
      },
      {
        key: "jetbrains-ai-insights",
        title: "Software Developers on AI: Insights and Opportunities",
        url: "https://blog.jetbrains.com/research/2025/06/software-developers-on-ai/",
      },
    ],

    findings: [
      {
        key: "repetitive-work",
        content:
          "AI assistance can reduce effort spent on repetitive or boilerplate development work.",
        sourceKeys: ["github-experience"],
      },
      {
        key: "delegation-survey",
        content:
          "Surveyed developers were more willing to delegate less enjoyable tasks to AI than core coding and code-understanding work, and many reported reduced time spent searching for information.",
        sourceKeys: ["jetbrains-ai-insights"],
      },
      {
        key: "trust",
        content:
          "Trust in AI-generated output remains an important part of the developer experience.",
        sourceKeys: ["stackoverflow-developer-survey"],
      },
      {
        key: "understanding",
        content:
          "Effective AI-assisted development still requires developers to understand and evaluate the resulting code.",
        sourceKeys: ["stackoverflow-developer-survey", "github-experience"],
      },
    ],

    comment:
      "Developer experience includes both reduced friction and the cognitive cost of validating AI-generated suggestions.",

    conversation: {
      question: "How can AI coding assistants improve developer experience?",
      answer:
        "They can reduce repetitive work and assist with explanation and problem solving, while still requiring developers to evaluate the generated output.",
      sourceKeys: ["github-experience", "stackoverflow-developer-survey"],
    },
  },

  {
    key: "organizational-adoption",
    title: "Adoption & Organizational Impact",
    description:
      "What teams should consider when adopting AI-assisted software development across an engineering organization.",
    conclusion:
      "Organization-wide adoption should be evaluated as a workflow and governance change, not simply as a tool purchase. Teams need to consider productivity, quality, trust, security, and measurement together.",
    tags: ["AI", "Adoption", "Productivity"],

    sources: [
      {
        key: "dora",
        title: "DORA Research",
        url: "https://dora.dev/research/",
      },
      {
        key: "github-enterprise",
        title: "GitHub Copilot documentation",
        url: "https://docs.github.com/en/copilot",
      },
      {
        key: "stackoverflow-org",
        title: "Stack Overflow Developer Survey",
        url: "https://survey.stackoverflow.co/",
      },
    ],

    findings: [
      {
        key: "delivery-system",
        content:
          "AI adoption should be assessed in the context of the broader software delivery system rather than by code generation volume alone.",
        sourceKeys: ["dora"],
      },
      {
        key: "governance",
        content:
          "Organizations need policies and operational controls for how AI coding tools are introduced and used.",
        sourceKeys: ["github-enterprise"],
      },
      {
        key: "adoption-and-trust",
        content:
          "Adoption does not imply uniform trust in AI-generated output among developers.",
        sourceKeys: ["stackoverflow-org"],
      },
      {
        key: "evaluation",
        content:
          "A useful organizational evaluation should consider delivery performance, developer experience, code quality, security, and tool cost together.",
        sourceKeys: ["dora", "github-enterprise"],
      },
    ],

    comment:
      "The organization-level question is whether AI improves the whole delivery system, not merely whether developers generate code faster.",

    conversation: {
      question:
        "What should an engineering organization evaluate before adopting AI coding assistants broadly?",
      answer:
        "The organization should evaluate productivity together with quality, security, developer trust, governance, and effects on the wider software delivery workflow.",
      sourceKeys: ["dora", "github-enterprise"],
    },
  },
];

