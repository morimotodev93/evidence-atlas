import { db } from "../db.ts";

import { demoResearches } from "../../lib/demo/curated-content.ts";

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
