import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures.ts";
import { C2_ORIGIN, fixture, RESEARCH_PATH, checkedGet, requireSession, requireExpectedUser, requireC2Url } from "../scripts/c2-playwright-policy.ts";

async function navigate(page: Page, path: string) {
  await test.step("C2 navigation", async () => {
    const response = await page.goto(`${C2_ORIGIN}${path}`);
    expect(response?.status() === 200, "C2 page must load successfully").toBe(true);
    expect(page.url() === `${C2_ORIGIN}${path}`, "C2 navigation must retain the exact route").toBe(true);
  });
}

test("A: authenticated Workspace overview", async ({ page }) => {
  await navigate(page, "/");
  await expect(page.getByRole("heading", { name: String(fixture.workspace.name), exact: true, level: 1 })).toBeVisible();
  const summary = page.getByRole("region", { name: "Workspace Summary", exact: true });
  await expect(summary).toBeVisible();
  // textContent does not insert whitespace between adjacent block elements.
  // Assert every label/count paragraph exactly, including order and count.
  await expect(summary.getByRole("paragraph")).toHaveText(["Research", "1", "Sources", "1", "Findings", "1", "Tags", "0"]);
});

test("B: Research list and local detail navigation", async ({ page }) => {
  await navigate(page, "/research");
  const list = page.getByRole("region", { name: "Research list", exact: true });
  const link = list.getByRole("link").filter({ has: page.getByRole("heading", { name: String(fixture.research.title), exact: true }) });
  await expect(list.getByRole("link")).toHaveCount(1);
  await expect(link).toHaveAttribute("href", RESEARCH_PATH);
  await link.click();
  await expect(page).toHaveURL(`${C2_ORIGIN}${RESEARCH_PATH}`);
  await expect(page.getByRole("heading", { name: String(fixture.research.title), level: 1, exact: true })).toBeVisible();
});

test("C: Research detail, evidence and return navigation", async ({ page }) => {
  await navigate(page, RESEARCH_PATH);
  await expect(page.getByRole("heading", { name: String(fixture.research.title), level: 1, exact: true })).toBeVisible();
  for (const name of ["Conclusion", "Sources", "Findings", "Discussion"]) {
    await expect(page.getByRole("heading", { name, level: 2, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: String(fixture.source.title), level: 3, exact: true })).toBeVisible();
  const finding = page.getByRole("article").filter({ has: page.getByText(String(fixture.finding.content), { exact: true }) });
  await expect(finding).toBeVisible();
  await expect(finding.getByText("Supporting sources", { exact: true })).toBeVisible();
  await expect(finding.getByRole("link", { name: String(fixture.source.title), exact: true })).toHaveAttribute("href", String(fixture.source.url));
  await expect(page.getByText("No conclusion yet.", { exact: true })).toBeVisible();
  await expect(page.getByText("No discussion yet.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "← Back to Research", exact: true }).click();
  await expect(page).toHaveURL(`${C2_ORIGIN}/research`);
});

test("D: session persistence and C2 isolation", async ({ page, assertNetwork }) => {
  await navigate(page, "/");
  await navigate(page, RESEARCH_PATH);
  const session = await (await checkedGet(page.context().request, "/api/auth/session", 200)).json();
  requireSession(session, requireExpectedUser(process.env)); // Never assert/log private fields.
  await checkedGet(page.context().request, "/api/inngest", 503);
  requireC2Url(page.url());
  assertNetwork();
});
