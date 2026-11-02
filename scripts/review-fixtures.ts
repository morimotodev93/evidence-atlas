import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { demoResearches } from "../src/lib/demo/curated-content.ts";

type Values = Record<string, string>;
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
const timed = new Set(["workspace", "research", "source", "finding", "tag", "comment", "conversation"]);

export async function reviewFixtures(client: Client, create: boolean) {
  // A single transaction/lock in the caller encloses the entire graph. Never
  // upsert: existing data is verified, including canonical evidence text.
  async function row(table: string, key: Values, fields: Values = {}, hasId = true) {
    const values = { ...key, ...fields };
    const found = await client.query(`SELECT * FROM ${quote(table)} WHERE ${Object.keys(key).map((k, i) => `${quote(k)}=$${i + 1}`).join(" AND ")}`, Object.values(key));
    if (found.rows.length > 1) throw new Error(`Ambiguous review fixture in ${table}; inspect manually.`);
    if (found.rows.length === 1) {
      const existing = found.rows[0];
      if (Object.entries(values).some(([k, v]) => existing[k] !== v)) throw new Error(`Modified/inconsistent review fixture in ${table}; no data replaced. Inspect manually.`);
      return existing as Record<string, string>;
    }
    if (!create) throw new Error(`Missing review fixture in ${table}; no automatic repair. See docs/development/local-review.md.`);
    const insert: Values = { ...(hasId ? { id: randomUUID() } : {}), ...values };
    const columns = Object.keys(insert);
    const result = await client.query(`INSERT INTO ${quote(table)} (${columns.map(quote).join(",")}${timed.has(table) ? ',"updatedAt"' : ""}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(",")}${timed.has(table) ? ",now()" : ""}) RETURNING *`, Object.values(insert));
    return result.rows[0] as Record<string, string>;
  }

  const demoUser = await row("user", { email: "demo@evidence-atlas.local" }, { username: "demo", name: "Evidence Atlas Demo" });
  const demoOrg = await row("organization", { name: "Evidence Atlas Demo" });
  const demo = await row("workspace", { name: "AI-Assisted Software Development" }, { organizationId: demoOrg.id,
    description: "A curated evidence workspace exploring the productivity, quality, developer experience, and organizational impact of AI-assisted software development." });
  await row("membership", { userId: demoUser.id, organizationId: demoOrg.id }, { role: "ADMIN" }, false);
  await row("workspaceMembership", { userId: demoUser.id, workspaceId: demo.id }, { role: "ADMIN" }, false);
  let firstResearch = "";
  for (const canonical of demoResearches) {
    const research = await row("research", { workspaceId: demo.id, title: canonical.title }, {
      createdById: demoUser.id, description: canonical.description, conclusion: canonical.conclusion, status: "COMPLETED",
    });
    firstResearch ||= research.id;
    for (const name of canonical.tags) {
      const tag = await row("tag", { workspaceId: demo.id, name });
      await row("researchTag", { researchId: research.id, tagId: tag.id }, {}, false);
    }
    const sources = new Map<string, string>();
    for (const source of canonical.sources) {
      const stored = await row("source", { researchId: research.id, url: source.url }, { title: source.title });
      sources.set(source.key, stored.id);
    }
    const sourceId = (key: string) => {
      const id = sources.get(key);
      if (!id) throw new Error("Canonical review source relationship is missing.");
      return id;
    };
    for (const finding of canonical.findings) {
      const stored = await row("finding", { researchId: research.id, content: finding.content }, { displayStyle: "TEXT" });
      for (const key of finding.sourceKeys) await row("findingSource", { findingId: stored.id, sourceId: sourceId(key) }, {}, false);
    }
    await row("comment", { researchId: research.id, userId: demoUser.id }, { content: canonical.comment });
    const conversation = await row("conversation", { researchId: research.id });
    await row("message", { conversationId: conversation.id, authorType: "USER" }, { content: canonical.conversation.question });
    await row("message", { conversationId: conversation.id, authorType: "AI" }, {
      content: `${canonical.conversation.answer} ${canonical.conversation.sourceKeys.map((key) => `[source:${sourceId(key)}]`).join(" ")}`,
    });
  }
  const user = await row("user", { email: "reviewer@evidence-atlas.local" }, { name: "Local Reviewer", username: "reviewer" });
  const organization = await row("organization", { name: "Evidence Atlas Local Review" });
  await row("membership", { userId: user.id, organizationId: organization.id }, { role: "ADMIN" }, false);
  const workspace = await row("workspace", { name: "Local Review" }, { organizationId: organization.id, description: "Local UI review fixtures" });
  const empty = await row("workspace", { name: "Local Review Empty" }, { organizationId: organization.id, description: "Empty research list fixture" });
  for (const id of [workspace.id, empty.id]) await row("workspaceMembership", { userId: user.id, workspaceId: id }, { role: "ADMIN" }, false);
  const research = await row("research", { workspaceId: workspace.id, title: "Review notes" }, { createdById: user.id, description: "Synthetic UI fixture; no AI request required.", status: "IN_PROGRESS" });
  const source = await row("source", { researchId: research.id, url: "https://www.postgresql.org/docs/" }, { title: "PostgreSQL Documentation" });
  const finding = await row("finding", { researchId: research.id, content: "Synthetic review finding linked to a documentation source." }, { displayStyle: "TEXT" });
  await row("findingSource", { findingId: finding.id, sourceId: source.id }, {}, false);
  // This second Research deliberately has no Source, Finding or discussion.
  await row("research", { workspaceId: workspace.id, title: "Empty review research" }, { createdById: user.id, status: "IN_PROGRESS" });
  return { demoWorkspaceId: demo.id, demoResearchId: firstResearch, userId: user.id, workspaceId: workspace.id, emptyWorkspaceId: empty.id, researchId: research.id };
}
