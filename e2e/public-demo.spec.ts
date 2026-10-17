import { expect, test, type Locator, type Page } from "@playwright/test";

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

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth, `${page.url()} ${JSON.stringify(dimensions)}`)
    .toBeLessThanOrEqual(dimensions.clientWidth);
}

async function expectResponsiveElement(page: Page, locator: Locator, fullText = true) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const label = `${page.viewportSize()?.width}px ${page.url()} ${await locator.textContent()}`;
  expect(box, label).not.toBeNull();
  if (!box) throw new Error(`Missing bounding box: ${label}`);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(box.x, label).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, label).toBeLessThanOrEqual(clientWidth);

  if (fullText) {
    // Check rendered text against the viewport and clipping ancestors, including
    // overflow:hidden that a page-level scrollWidth check alone cannot detect.
    const clippedText = await locator.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const textRects = Array.from(range.getClientRects());
      let left = 0;
      let right = document.documentElement.clientWidth;
      let top = -Infinity;
      let bottom = Infinity;
      for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const rect = ancestor.getBoundingClientRect();
        if (/(hidden|clip|auto|scroll)/.test(style.overflowX)) {
          left = Math.max(left, rect.left + ancestor.clientLeft);
          right = Math.min(right, rect.left + ancestor.clientLeft + ancestor.clientWidth);
        }
        if (/(hidden|clip|auto|scroll)/.test(style.overflowY)) {
          top = Math.max(top, rect.top + ancestor.clientTop);
          bottom = Math.min(bottom, rect.top + ancestor.clientTop + ancestor.clientHeight);
        }
      }
      // One CSS pixel accommodates fractional glyph/line-box rounding.
      return textRects.filter((rect) => rect.left < left - 1 || rect.right > right + 1
        || rect.top < top - 1 || rect.bottom > bottom + 1)
        .map((rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
    });
    expect(clippedText, `Clipped text: ${label}`).toEqual([]);
  }
}

async function expectTabReachable(page: Page, link: Locator) {
  // Traverse the real tab order rather than assigning focus programmatically.
  const limit = await page.getByRole("link").count() + 1;
  for (let attempt = 0; attempt < limit; attempt++) {
    await page.keyboard.press("Tab");
    if (await link.evaluate((element) => element === document.activeElement)) break;
  }
  await expect(link).toBeFocused();
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

for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }]) {
  test.describe(`Public Demo at ${viewport.width}px`, () => {
    test.use({ viewport });

    test("Research list → detail → list stays readable and operable without horizontal overflow", async ({ page }) => {
      const response = await page.goto("/demo");
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(/\/demo$/);
      await expectResponsiveElement(page,
        page.getByRole("heading", { name: workspaceName, exact: true, level: 1 }));
      await expectResponsiveElement(page, page.getByText("Read-only demo", { exact: true }));
      await expectResponsiveElement(page, page.getByRole("main"), false);
      const list = page.getByRole("region", { name: "Research list", exact: true });
      await expectResponsiveElement(page, list, false);
      await expect(list.getByRole("link")).toHaveCount(seededResearchTitles.length);
      for (const title of seededResearchTitles) {
        const heading = list.getByRole("heading", { name: title, exact: true });
        const link = list.getByRole("link").filter({
          has: page.getByRole("heading", { name: title, exact: true }),
        });
        await expect(heading).toBeVisible();
        // List titles intentionally use ellipsis; the full name must stay accessible.
        await expect(link).toHaveAccessibleName(new RegExp(title));
        await expect(link).toHaveAttribute("href", /^\/demo\/research\/[^/?#]+$/);
        await expectResponsiveElement(page, link, false);
        await expectTabReachable(page, link);
        await link.click({ trial: true });
      }
      await expectNoHorizontalOverflow(page);

      await openProductivityResearch(page);
      await expectResponsiveElement(page,
        page.getByRole("heading", { name: seededResearchTitles[0], exact: true, level: 1 }));
      await expectResponsiveElement(page, page.getByRole("main"), false);
      for (const name of ["Conclusion", "Sources", "Findings", "Discussion"]) {
        const heading = page.getByRole("heading", { name, exact: true, level: 2 });
        await expectResponsiveElement(page, heading);
        await expect(heading).toBeInViewport();
      }
      await expectNoHorizontalOverflow(page);

      const back = page.getByRole("link", { name: "← Back to Demo Workspace", exact: true });
      await expectResponsiveElement(page, back);
      await expectTabReachable(page, back);
      await back.click();
      await expect(page).toHaveURL(/\/demo$/);
      await expect(list).toBeVisible();
      await expect(list.getByRole("link")).toHaveCount(seededResearchTitles.length);
      await expectNoHorizontalOverflow(page);
    });
  });
}
