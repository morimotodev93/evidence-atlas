import { expect, test, type Page } from "@playwright/test";

const workspaceName = "AI-Assisted Software Development";
// These expectations deliberately follow the current curated Public Demo seed.
const seededResearchTitles = [
  "Developer Productivity",
  "Code Quality & Reliability",
  "Developer Experience",
  "Adoption & Organizational Impact",
];

async function openProductivityResearch(page: Page) {
  const link = page.getByRole("region", { name: "Research list", exact: true })
    .getByRole("link").filter({
      has: page.getByRole("heading", { name: seededResearchTitles[0], exact: true }),
    });
  await expect(link).toHaveAttribute("href", /^\/demo\/research\/[^/?#]+$/);
  const href = await link.getAttribute("href");
  if (!href) throw new Error("Missing Demo Research link");
  await link.click();
  await expect(page).toHaveURL(new URL(href, page.url()).href);
  await expect(page.getByRole("heading", { name: seededResearchTitles[0], exact: true, level: 1 }))
    .toBeVisible();
}

test.beforeAll(async ({ request }) => {
  // Stop the suite on a normal SaaS deployment before any browser tests run.
  const response = await request.get("/");
  expect(response.status(), "Public Demo preflight must return 200").toBe(200);
  expect(new URL(response.url()).pathname, "Expected root redirect to Public Demo").toBe("/demo");
  const html = await response.text();
  expect(html).toContain("Read-only demo");
  expect(html).toContain(workspaceName);
});

test.beforeEach(async ({ context }) => {
  // Also prevent incidental non-GET browser traffic (for example telemetry).
  await context.route("**/*", (route) => route.request().method() === "GET"
    ? route.continue() : route.abort());
});

test("root redirects to the Demo Workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { name: workspaceName, exact: true, level: 1 }))
    .toBeVisible();
  await expect(page.getByText("Read-only demo", { exact: true })).toBeVisible();
});

test("Research list shows the four curated seed entries with Demo links", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: workspaceName, exact: true, level: 1 }))
    .toBeVisible();
  const list = page.getByRole("region", { name: "Research list", exact: true });
  await expect(list).toBeVisible();
  await expect(list.getByRole("link")).toHaveCount(seededResearchTitles.length);
  for (const title of seededResearchTitles) {
    const heading = list.getByRole("heading", { name: title, exact: true });
    await expect(heading).toBeVisible();
    await expect(list.getByRole("link").filter({
      has: page.getByRole("heading", { name: title, exact: true }),
    }))
      .toHaveAttribute("href", /^\/demo\/research\/[^/?#]+$/);
  }
});

test("Research detail displays its content and links back to the list", async ({ page }) => {
  await page.goto("/demo");
  await openProductivityResearch(page);
  for (const name of ["Conclusion", "Sources", "Findings", "Discussion"]) {
    await expect(page.getByRole("heading", { name, exact: true, level: 2 })).toBeVisible();
  }
  await page.getByRole("link", { name: "← Back to Demo Workspace", exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("region", { name: "Research list", exact: true })).toBeVisible();
});

test("list and detail expose read-only UI without mutation or AI controls", async ({ page }) => {
  await page.goto("/demo");
  // Actual SaaS controls include New Research, Edit, Delete, Add Source/Finding/
  // Comment, status/tag/conclusion editing, Remove, and Ask AI.
  const operationName = /^(?:new research|create research|edit(?:\s.*)?|delete(?:\s.*)?|add(?:\s.*)?|remove(?:\s.*)?|detach tag|change status|ask ai|new conversation|conversations|send)$/i;
  for (const view of ["list", "detail"]) {
    if (view === "detail") await openProductivityResearch(page);
    await expect(page.getByText("Read-only demo", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: operationName, includeHidden: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: operationName, includeHidden: true })).toHaveCount(0);
    await expect(page.getByRole("textbox", { includeHidden: true })).toHaveCount(0);
    await expect(page.getByRole("combobox", { includeHidden: true })).toHaveCount(0);
  }
  // This UI regression check does not prove server-side write prevention.
});

test("unknown Research returns 404 without falling back to seeded content", async ({ page }) => {
  const response = await page.goto("/demo/research/does-not-exist-e2e");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveURL(/\/demo\/research\/does-not-exist-e2e$/);
  await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  for (const title of seededResearchTitles) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
  }
});

test("disabled SaaS, Auth and Inngest endpoints return 404 for GET", async ({ request }) => {
  for (const path of ["/research", "/api/auth/session", "/api/inngest"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), `GET ${path}`).toBe(404);
  }
});
