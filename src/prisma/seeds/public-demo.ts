import { db } from "../db.ts";

type DemoSource = {
  key: string;
  title: string;
  url: string;
};

type DemoFinding = {
  content: string;
  sourceKeys: string[];
};

type DemoResearch = {
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

const demoResearches: DemoResearch[] = [
  {
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
      {
        content:
          "AI coding assistants can reduce the time required for some well-scoped software development tasks.",
        sourceKeys: ["github-productivity"],
      },
      {
        content:
          "Productivity effects are not uniform across developers or task types.",
        sourceKeys: ["github-productivity", "metr-productivity"],
      },
      {
        content:
          "Experienced developers working in familiar codebases may experience different productivity effects from developers completing isolated or unfamiliar tasks.",
        sourceKeys: ["metr-productivity"],
      },
      {
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
        content:
          "AI-generated code should be reviewed and tested rather than treated as automatically correct.",
        sourceKeys: ["github-responsible-use"],
      },
      {
        content:
          "Secure development practices remain necessary regardless of whether code is written manually or generated with AI assistance.",
        sourceKeys: ["nist-ssdf"],
      },
      {
        content:
          "AI-enabled development introduces additional trust and validation boundaries that engineering teams need to manage.",
        sourceKeys: ["github-responsible-use", "owasp-llm"],
      },
      {
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
        key: "jetbrains-developer-ecosystem",
        title: "JetBrains State of Developer Ecosystem",
        url: "https://www.jetbrains.com/lp/devecosystem/",
      },
    ],

    findings: [
      {
        content:
          "AI assistance can reduce effort spent on repetitive or boilerplate development work.",
        sourceKeys: ["github-experience"],
      },
      {
        content:
          "Developers use AI tools for a range of activities beyond generating new code, including explanation, learning, and problem solving.",
        sourceKeys: [
          "stackoverflow-developer-survey",
          "jetbrains-developer-ecosystem",
        ],
      },
      {
        content:
          "Trust in AI-generated output remains an important part of the developer experience.",
        sourceKeys: ["stackoverflow-developer-survey"],
      },
      {
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
        content:
          "AI adoption should be assessed in the context of the broader software delivery system rather than by code generation volume alone.",
        sourceKeys: ["dora"],
      },
      {
        content:
          "Organizations need policies and operational controls for how AI coding tools are introduced and used.",
        sourceKeys: ["github-enterprise"],
      },
      {
        content:
          "Adoption does not imply uniform trust in AI-generated output among developers.",
        sourceKeys: ["stackoverflow-org"],
      },
      {
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

export async function seedPublicDemo() {
  // ============================================================
  // Demo User
  // ============================================================

  const demoUser = await db.orm.public.User.create({
    email: "demo@evidence-atlas.local",
    username: "demo",
    name: "Evidence Atlas Demo",
  });

  // ============================================================
  // Organization / Workspace
  // ============================================================

  const organization = await db.orm.public.Organization.create({
    name: "Evidence Atlas Demo",
  });

  await db.orm.public.Membership.create({
    userId: demoUser.id,
    organizationId: organization.id,
    role: "ADMIN",
  });

  const workspace = await db.orm.public.Workspace.create({
    organizationId: organization.id,
    name: "AI-Assisted Software Development",
    description:
      "A curated evidence workspace exploring the productivity, quality, developer experience, and organizational impact of AI-assisted software development.",
    updatedAt: Temporal.Now.instant(),
  });

  await db.orm.public.WorkspaceMembership.create({
    userId: demoUser.id,
    workspaceId: workspace.id,
    role: "ADMIN",
  });

  // ============================================================
  // Tags
  // ============================================================

  const tagNames = [
    ...new Set(demoResearches.flatMap((research) => research.tags)),
  ];

  const tags = new Map<string, string>();

  for (const name of tagNames) {
    const tag = await db.orm.public.Tag.create({
      workspaceId: workspace.id,
      name,
      updatedAt: Temporal.Now.instant(),
    });

    tags.set(name, tag.id);
  }

  // ============================================================
  // Research
  // ============================================================

  for (const demoResearch of demoResearches) {
    const research = await db.orm.public.Research.create({
      workspaceId: workspace.id,
      createdById: demoUser.id,
      title: demoResearch.title,
      description: demoResearch.description,
      conclusion: demoResearch.conclusion,
      status: "COMPLETED",
      updatedAt: Temporal.Now.instant(),
    });

    // ----------------------------------------------------------
    // Tags
    // ----------------------------------------------------------

    for (const tagName of demoResearch.tags) {
      const tagId = tags.get(tagName);

      if (!tagId) {
        throw new Error(`Missing demo tag "${tagName}".`);
      }

      await db.orm.public.ResearchTag.create({
        researchId: research.id,
        tagId,
      });
    }

    // ----------------------------------------------------------
    // Sources
    // ----------------------------------------------------------

    const sources = new Map<string, string>();

    for (const demoSource of demoResearch.sources) {
      const source = await db.orm.public.Source.create({
        researchId: research.id,
        title: demoSource.title,
        url: demoSource.url,
        updatedAt: Temporal.Now.instant(),
      });

      sources.set(demoSource.key, source.id);
    }

    // ----------------------------------------------------------
    // Findings
    // ----------------------------------------------------------

    for (const demoFinding of demoResearch.findings) {
      const finding = await db.orm.public.Finding.create({
        researchId: research.id,
        content: demoFinding.content,
        displayStyle: "TEXT",
        updatedAt: Temporal.Now.instant(),
      });

      for (const sourceKey of demoFinding.sourceKeys) {
        const sourceId = sources.get(sourceKey);

        if (!sourceId) {
          throw new Error(
            `Missing demo source "${sourceKey}" for "${demoResearch.title}".`,
          );
        }

        await db.orm.public.FindingSource.create({
          findingId: finding.id,
          sourceId,
        });
      }
    }

    // ----------------------------------------------------------
    // Comment
    // ----------------------------------------------------------

    await db.orm.public.Comment.create({
      researchId: research.id,
      userId: demoUser.id,
      content: demoResearch.comment,
      updatedAt: Temporal.Now.instant(),
    });

    // ----------------------------------------------------------
    // Example Conversation
    // ----------------------------------------------------------

    const conversation = await db.orm.public.Conversation.create({
      researchId: research.id,
      updatedAt: Temporal.Now.instant(),
    });

    await db.orm.public.Message.create({
      conversationId: conversation.id,
      authorType: "USER",
      content: demoResearch.conversation.question,
    });

    const citations = demoResearch.conversation.sourceKeys
      .map((sourceKey) => {
        const sourceId = sources.get(sourceKey);

        if (!sourceId) {
          throw new Error(
            `Missing conversation source "${sourceKey}" for "${demoResearch.title}".`,
          );
        }

        return `[source:${sourceId}]`;
      })
      .join(" ");

    await db.orm.public.Message.create({
      conversationId: conversation.id,
      authorType: "AI",
      content: `${demoResearch.conversation.answer} ${citations}`,
    });

    console.log(`Research: ${research.title}`);
  }

  console.log(`Organization: ${organization.name}`);
  console.log(`Workspace: ${workspace.name}`);
}
