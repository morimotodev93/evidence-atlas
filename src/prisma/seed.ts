import "temporal-polyfill/global";
import { db } from "./db.ts";

async function main() {
  // ============================================================
  // User
  // ============================================================

  const alice = await db.orm.public.User.create({
    email: "alice@evidence-atlas.local",
    username: "alice",
    name: "Alice",
  });

  const bob = await db.orm.public.User.create({
    email: "bob@evidence-atlas.local",
    username: "bob",
    name: "Bob",
  });

  // ============================================================
  // Organization
  // ============================================================

  const organization = await db.orm.public.Organization.create({
    name: "Evidence Atlas Lab",
  });

  // ============================================================
  // Organization Membership
  // ============================================================

  await db.orm.public.Membership.create({
    userId: alice.id,
    organizationId: organization.id,
    role: "ADMIN",
  });

  await db.orm.public.Membership.create({
    userId: bob.id,
    organizationId: organization.id,
    role: "MEMBER",
  });

  // ============================================================
  // Workspace
  // ============================================================

  const workspace = await db.orm.public.Workspace.create({
    organizationId: organization.id,
    name: "AI Research",
    description: "A workspace for researching AI and knowledge systems.",
    updatedAt: Temporal.Now.instant(),
  });

  // ============================================================
  // Workspace Membership
  // ============================================================

  await db.orm.public.WorkspaceMembership.create({
    userId: alice.id,
    workspaceId: workspace.id,
    role: "ADMIN",
  });

  await db.orm.public.WorkspaceMembership.create({
    userId: bob.id,
    workspaceId: workspace.id,
    role: "MEMBER",
  });

  // ============================================================
  // Tags
  // ============================================================

  const aiTag = await db.orm.public.Tag.create({
    workspaceId: workspace.id,
    name: "AI",
    updatedAt: Temporal.Now.instant(),
  });

  const ragTag = await db.orm.public.Tag.create({
    workspaceId: workspace.id,
    name: "RAG",
    updatedAt: Temporal.Now.instant(),
  });

  const postgresTag = await db.orm.public.Tag.create({
    workspaceId: workspace.id,
    name: "PostgreSQL",
    updatedAt: Temporal.Now.instant(),
  });

  // ============================================================
  // Research
  // ============================================================

  const research = await db.orm.public.Research.create({
    workspaceId: workspace.id,
    createdById: alice.id,
    title: "RAG Architecture Research",
    description:
      "Research into retrieval-augmented generation architectures and knowledge retrieval.",
    status: "IN_PROGRESS",
    updatedAt: Temporal.Now.instant(),
  });

  // ============================================================
  // Research Tags
  // ============================================================

  await db.orm.public.ResearchTag.create({
    researchId: research.id,
    tagId: aiTag.id,
  });

  await db.orm.public.ResearchTag.create({
    researchId: research.id,
    tagId: ragTag.id,
  });

  await db.orm.public.ResearchTag.create({
    researchId: research.id,
    tagId: postgresTag.id,
  });

  // ============================================================
  // Sources
  // ============================================================

  const prismaSource = await db.orm.public.Source.create({
    researchId: research.id,
    title: "Prisma Documentation",
    url: "https://www.prisma.io/docs",
    updatedAt: Temporal.Now.instant(),
  });

  const postgresSource = await db.orm.public.Source.create({
    researchId: research.id,
    title: "PostgreSQL Documentation",
    url: "https://www.postgresql.org/docs/",
    updatedAt: Temporal.Now.instant(),
  });

  // ============================================================
  // Findings
  // ============================================================

  const findingOne = await db.orm.public.Finding.create({
    researchId: research.id,
    content:
      "A retrieval-augmented generation system can retrieve relevant external knowledge before generating an answer.",
    displayStyle: "TEXT",
    updatedAt: Temporal.Now.instant(),
  });

  const findingTwo = await db.orm.public.Finding.create({
    researchId: research.id,
    content:
      "PostgreSQL can serve as the relational database layer for structured research data.",
    displayStyle: "TEXT",
    updatedAt: Temporal.Now.instant(),
  });

  // ============================================================
  // Finding ↔ Source
  // ============================================================

  await db.orm.public.FindingSource.create({
    findingId: findingOne.id,
    sourceId: prismaSource.id,
  });

  await db.orm.public.FindingSource.create({
    findingId: findingTwo.id,
    sourceId: postgresSource.id,
  });

  // ============================================================
  // Comments
  // ============================================================

  await db.orm.public.Comment.create({
    researchId: research.id,
    userId: alice.id,
    content:
      "The retrieval step should remain traceable so that users can inspect the evidence behind an AI answer.",
    updatedAt: Temporal.Now.instant(),
  });

  await db.orm.public.Comment.create({
    researchId: research.id,
    userId: bob.id,
    content:
      "We should also consider how conflicting findings are represented in the knowledge model.",
    updatedAt: Temporal.Now.instant(),
  });

  // ============================================================
  // Conversation
  // ============================================================

  const conversation = await db.orm.public.Conversation.create({
    updatedAt: Temporal.Now.instant(),
  });

  await db.orm.public.Message.create({
    conversationId: conversation.id,
    authorType: "USER",
    content:
      "What are the important considerations when designing a RAG system?",
  });

  await db.orm.public.Message.create({
    conversationId: conversation.id,
    authorType: "AI",
    content:
      "Important considerations include retrieval quality, evidence traceability, context selection, and handling conflicting information.",
  });
  // ============================================================
  // Messages
  // ============================================================

  await db.orm.public.Message.create({
    conversationId: conversation.id,
    authorType: "USER",
    content:
      "What are the important considerations when designing a RAG system?",
  });

  await db.orm.public.Message.create({
    conversationId: conversation.id,
    authorType: "AI",
    content:
      "Important considerations include retrieval quality, evidence traceability, context selection, and handling conflicting information.",
  });

  console.log("Seed completed successfully.");
  console.log(`Organization: ${organization.name}`);
  console.log(`Workspace: ${workspace.name}`);
  console.log(`Research: ${research.title}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });
