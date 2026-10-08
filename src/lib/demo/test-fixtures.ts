import "temporal-polyfill/full/global";

export const date = Temporal.Instant.from("2026-10-08T00:00:00Z");
export const workspace = {
  id: "demo-workspace", name: "AI-Assisted Software Development",
  description: "Curated evidence workspace",
  organization: { id: "demo-org", name: "Evidence Atlas Demo" },
};
export const research = {
  id: "demo-research", workspaceId: workspace.id, createdById: "demo-user",
  title: "Developer Productivity", description: "Research description",
  status: "COMPLETED", conclusion: "Research conclusion", createdAt: date, updatedAt: date,
};
export const source = {
  id: "demo-source", researchId: research.id,
  title: "Supporting evidence", url: "https://example.com/evidence", updatedAt: date,
};
export const finding = {
  id: "demo-finding", content: "Research finding", displayStyle: "TEXT", updatedAt: date,
  sources: [{ sourceId: source.id, source }],
};
export const comment = {
  id: "demo-comment", content: "Research discussion", createdAt: date, updatedAt: date,
  user: {
    name: "Demo Author", username: "demo", email: "private@example.com",
    accounts: [{ access_token: "private-oauth-token" }], sessions: ["private-session"], memberships: ["private-membership"]
  },
};
export const researchTag = {
  researchId: research.id,
  tag: { id: "demo-tag", name: "Productivity", workspaceId: workspace.id },
};
