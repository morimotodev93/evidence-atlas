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

async function expectResearchDetailLayout(page: Page, title: string) {
  const main = page.getByRole("main");
  await expect(main).toHaveCount(1);
  await expectResponsiveElement(page, main, false);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expectResponsiveElement(page, main.getByRole("heading", { level: 1 }));
  for (const otherTitle of seededResearchTitles.filter((other) => other !== title)) {
    await expect(main.getByRole("heading", { name: otherTitle, exact: true, level: 1 }))
      .toHaveCount(0);
  }
  for (const description of await main.locator("header p").all()) {
    await expectResponsiveElement(page, description);
  }

  await expect(main.getByRole("heading", { level: 2 }))
    .toHaveText(["Sources", "Findings", "Discussion", "Conclusion"]);
  for (const name of ["Sources", "Findings", "Discussion", "Conclusion"]) {
    const heading = main.getByRole("heading", { name, exact: true, level: 2 });
    const section = main.locator("section").filter({
      has: page.getByRole("heading", { name, exact: true, level: 2 }),
    });
    await expect(section).toHaveCount(1);
    await expectResponsiveElement(page, heading);
    await expect(heading).toBeInViewport();
    // Source URL text intentionally truncates; titles and body text must not.
    const paragraphs = section.locator("p:not(.truncate)");
    expect(await paragraphs.count()).toBeGreaterThan(0);
    for (const content of [...await paragraphs.all(), ...await section.getByRole("heading", { level: 3 }).all()]) {
      await expect(content).toHaveText(/\S/);
      await expectResponsiveElement(page, content);
      await expect(content).toBeInViewport();
    }
  }
  await expectNoHorizontalOverflow(page);
}

async function expectResearchDetailCounts(page: Page) {
  const main = page.getByRole("main");
  for (const { name, unit, empty } of [
    { name: "Sources", unit: "sources", empty: "No sources yet." },
    { name: "Findings", unit: "findings", empty: "No findings yet." },
    { name: "Discussion", unit: "comments", empty: "No discussion yet." },
  ]) {
    const section = main.locator("section").filter({
      has: page.getByRole("heading", { name, exact: true, level: 2 }),
    });
    const items = name === "Sources"
      ? section.getByRole("heading", { level: 3 }) : section.getByRole("article");
    const count = await items.count();
    await expectResponsiveElement(page, section.getByText(`${count} ${unit}`, { exact: true }));
    if (count === 0) {
      await expectResponsiveElement(page, section.getByText(empty, { exact: true }));
    } else {
      await expect(section.getByText(empty, { exact: true })).toHaveCount(0);
    }
    // Inspect external destinations without opening any Source site.
    for (const source of await section.getByRole("link").all()) {
      await expect(source).toHaveAccessibleName(/\S/);
      await expect(source).toHaveAttribute("href", /^https?:\/\//);
      await expect(source).toHaveAttribute("target", "_blank");
      // Only Source cards contain intentionally truncated URL previews.
      await expectResponsiveElement(page, source, name !== "Sources");
    }
  }
  await expectNoHorizontalOverflow(page);
}

async function pressTab(page: Page, key: "Tab" | "Shift+Tab", target?: Locator) {
  const diagnose = process.env.E2E_FOCUS_DIAGNOSTICS === "1" && page.viewportSize()?.width === 375
    && target && await target.evaluate((element) => element.matches('main a[target="_blank"]'));
  const snapshot = () => target!.evaluate((element) => {
    const style = getComputedStyle(element);
    const header = document.querySelector("body > header")?.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
      host: location.hostname,
      kind: element.querySelector("h3") ? "Source" : "Supporting source",
      title: element.querySelector("h3")?.textContent ?? element.textContent,
      focused: element === document.activeElement,
      focusVisible: element.matches(":focus-visible"),
      scrollY,
      scrollContainer: document.scrollingElement?.tagName,
      scrollMarginTop: style.scrollMarginTop,
      scrollPaddingTop: getComputedStyle(document.documentElement).scrollPaddingTop,
      header: header ? { top: header.top, bottom: header.bottom, height: header.height } : null,
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
      outline: { style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset },
      shadow: style.boxShadow,
    };
  });
  const before = diagnose ? await snapshot() : null;
  await page.keyboard.press(key);
  if (diagnose) console.info(JSON.stringify({ event: "Source keyboard focus", key, before, after: await snapshot() }));
}

async function expectTabReachable(page: Page, link: Locator, key: "Tab" | "Shift+Tab" = "Tab") {
  // Traverse the real tab order rather than assigning focus programmatically.
  const limit = await page.getByRole("link").count() + 1;
  for (let attempt = 0; attempt < limit; attempt++) {
    await pressTab(page, key, link);
    if (await link.evaluate((element) => element === document.activeElement)) break;
  }
  await expect(link).toBeFocused();
}

async function expectExposedKeyboardFocus(link: Locator) {
  await expect(link).toBeFocused();
  const focus = await link.evaluate((element) => {
    const style = getComputedStyle(element);
    // Sample rendered link fragments, including wrapped inline Source links.
    const exposed = Array.from(element.getClientRects()).some((rect) => {
      const left = Math.max(0, rect.left);
      const right = Math.min(innerWidth, rect.right);
      const top = Math.max(0, rect.top);
      const bottom = Math.min(innerHeight, rect.bottom);
      if (left >= right || top >= bottom) return false;
      // A sticky header may cover a fragment's centre while its lower part stays
      // exposed. Sample across it to check complete occlusion, not partial overlap.
      return [0.1, 0.5, 0.9].some((y) => [0.1, 0.5, 0.9].some((x) => {
        const hit = document.elementFromPoint(left + (right - left) * x, top + (bottom - top) * y);
        return hit !== null && element.contains(hit);
      }));
    });
    return {
      exposed,
      focusVisible: element.matches(":focus-visible"),
      indicator: (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0)
        || style.boxShadow !== "none",
    };
  });
  expect(focus, `Keyboard focus: ${await link.innerText()}`)
    .toEqual({ exposed: true, focusVisible: true, indicator: true });
  // Computed styles and hit testing do not establish perceptual visibility or contrast.
}

async function expectUnobscuredSourceFocus(page: Page, link: Locator) {
  // Do not scroll/focus here: inspect the browser's real keyboard auto-scroll.
  const header = await page.getByRole("banner").boundingBox();
  expect(header, "Demo sticky header bounding box").not.toBeNull();
  if (!header) throw new Error("Missing Demo sticky header");
  const focus = await link.evaluate((element) => {
    const style = getComputedStyle(element);
    // The current links use a native auto outline, not a box-shadow ring.
    // Reserve at least 4 CSS px for its browser-dependent painted extent;
    // larger explicit outline widths/offsets must also fit in full.
    const outlineExtent = Math.max(4,
      (parseFloat(style.outlineWidth) || 0) + (parseFloat(style.outlineOffset) || 0));
    const rects = Array.from(element.getClientRects())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }));
    return {
      rects, outlineExtent,
      focused: element === document.activeElement,
      focusVisible: element.matches(":focus-visible"),
      outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
      shadow: style.boxShadow,
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };
  });
  const label = `Unobscured Source focus: ${await link.innerText()}`;
  expect(focus.focused, label).toBe(true);
  expect(focus.focusVisible, label).toBe(true);
  expect(focus.outline, label).toBe(true);
  // Fail explicitly if the indicator changes to a shadow that needs other bounds.
  expect(focus.shadow, label).toBe("none");
  expect(focus.rects.length, label).toBeGreaterThan(0);
  for (const rect of focus.rects) {
    // Compare every full fragment plus outline clearance, not just exposed points
    // or a viewport-clipped intersection. No overlap tolerance is permitted.
    expect(rect.top - focus.outlineExtent, label).toBeGreaterThanOrEqual(header.y + header.height);
    expect(rect.bottom + focus.outlineExtent, label).toBeLessThanOrEqual(focus.height);
    expect(rect.left - focus.outlineExtent, label).toBeGreaterThanOrEqual(0);
    expect(rect.right + focus.outlineExtent, label).toBeLessThanOrEqual(focus.width);
  }
  await expectNoHorizontalOverflow(page);
}

test.beforeAll(async ({ request, baseURL }) => {
  expect(process.env.E2E_BASE_URL, "Set an explicitly verified Public Demo E2E_BASE_URL").toBeTruthy();
  if (!baseURL) throw new Error("Missing Public Demo baseURL");
  console.info(`Public Demo target host: ${new URL(baseURL).hostname}`);
  // Stop the suite on a normal SaaS deployment before any browser tests run.
  const response = await request.get("/");
  expect(response.status(), "Public Demo preflight must return 200").toBe(200);
  expect(new URL(response.url()).pathname, "Expected root redirect to Public Demo").toBe("/demo");
  const html = await response.text();
  expect(html).toContain("Read-only demo");
  expect(html).toContain(workspaceName);
});

test.beforeEach(async ({ context, baseURL }) => {
  if (!baseURL) throw new Error("Missing Public Demo baseURL");
  const origin = new URL(baseURL).origin;
  // Keep browser traffic read-only and on the approved origin, including popups.
  // Source destinations are inspected as attributes, never opened.
  await context.route("**/*", (route) => route.request().method() === "GET"
    && new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
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
  for (const name of ["Sources", "Findings", "Discussion", "Conclusion"]) {
    await expect(page.getByRole("heading", { name, exact: true, level: 2 })).toBeVisible();
  }
  await page.getByRole("link", { name: "← Back to Demo Workspace", exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("region", { name: "Research list", exact: true })).toBeVisible();
});

for (const title of seededResearchTitles.slice(1)) {
  test(`${title} detail opens from its list link and returns without horizontal overflow`, async ({ page }) => {
    await page.goto("/demo");
    const list = page.getByRole("region", { name: "Research list", exact: true });
    await expect(list).toBeVisible();
    const link = list.getByRole("link").filter({
      has: page.getByRole("heading", { name: title, exact: true }),
    });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("href", /^\/demo\/research\/[^/?#]+$/);
    const href = await link.getAttribute("href");
    if (!href) throw new Error(`Missing Demo Research link: ${title}`);
    const detailURL = new URL(href, page.url()).href;
    await expectResponsiveElement(page, link, false);
    await expectNoHorizontalOverflow(page);
    await link.click();
    await expect(page).toHaveURL(detailURL);

    // Next.js may prefetch the clicked route. Check its HTTP response separately
    // instead of requiring a new document request during client-side navigation.
    const response = await page.request.get(detailURL);
    expect(response.status()).toBe(200);
    expect(response.url()).toBe(detailURL);
    await expectResearchDetailLayout(page, title);
    await expectResearchDetailCounts(page);

    const back = page.getByRole("link", { name: "← Back to Demo Workspace", exact: true });
    await expectResponsiveElement(page, back);
    await back.click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(list).toBeVisible();
    await expect(list.getByRole("link")).toHaveCount(seededResearchTitles.length);
    await expect(list.getByRole("heading", { level: 2 })).toHaveText(seededResearchTitles);
    await expectNoHorizontalOverflow(page);
  });
}

for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }]) {
  test.describe(`Public Demo additional details at ${viewport.width}px`, () => {
    test.use({ viewport });

    for (const title of seededResearchTitles.slice(1)) {
      test(`${title} stays readable with forward/reverse keyboard navigation`, async ({ page }) => {
        const response = await page.goto("/demo");
        expect(response?.status()).toBe(200);
        const list = page.getByRole("region", { name: "Research list", exact: true });
        await expect(list.getByRole("link")).toHaveCount(seededResearchTitles.length);
        const link = list.getByRole("link").filter({
          has: page.getByRole("heading", { name: title, exact: true }),
        });
        await expect(link).toHaveCount(1);
        await expect(link).toHaveAttribute("href", /^\/demo\/research\/[^/?#]+$/);
        const href = await link.getAttribute("href");
        if (!href) throw new Error(`Missing Demo Research link: ${title}`);
        const detailURL = new URL(href, page.url()).href;
        await expectResponsiveElement(page, link, false);
        await expectNoHorizontalOverflow(page);
        await expectTabReachable(page, link);
        await expectExposedKeyboardFocus(link);
        // Check adjacent list order without skipping over an unexpected tab stop.
        const previous = list.getByRole("link").filter({
          has: page.getByRole("heading", {
            name: seededResearchTitles[seededResearchTitles.indexOf(title) - 1], exact: true,
          }),
        });
        await pressTab(page, "Shift+Tab", previous);
        await expectExposedKeyboardFocus(previous);
        await pressTab(page, "Tab", link);
        await expectExposedKeyboardFocus(link);
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(detailURL);

        await expectResearchDetailLayout(page, title);
        await expectResearchDetailCounts(page);
        const main = page.getByRole("main");
        const sources = main.locator("section").filter({
          has: page.getByRole("heading", { name: "Sources", exact: true, level: 2 }),
        });
        const findings = main.locator("section").filter({
          has: page.getByRole("heading", { name: "Findings", exact: true, level: 2 }),
        });
        // Empty sections legitimately contribute no links to the keyboard order.
        const sourceLinks = await sources.getByRole("link").all();
        const supportingLinks = await findings.getByRole("link").all();
        const back = main.getByRole("link", { name: "← Back to Demo Workspace", exact: true });
        await expect(back).toHaveAttribute("href", "/demo");
        await expectResponsiveElement(page, back);
        const appearance = page.getByRole("combobox", { name: "Appearance", exact: true });
        await expect(appearance).toBeEnabled();
        // The hydrated header adds a tab stop between Source code and Back.
        const detailLinks = [
          page.getByRole("link", { name: "Evidence Atlas", exact: true }),
          page.getByRole("link", { name: "Source code", exact: true }),
          appearance, back, ...sourceLinks, ...supportingLinks,
        ];
        const externalLinks = new Set([...sourceLinks, ...supportingLinks]);
        const expectDetailFocus = async (target: Locator) => {
          await expectExposedKeyboardFocus(target);
          if (externalLinks.has(target)) await expectUnobscuredSourceFocus(page, target);
        };
        // Layout checks above may scroll; from here inspect only real keyboard
        // auto-scroll, with no focus assignment or manual scrolling between keys.
        await expectTabReachable(page, detailLinks[0]);
        await expectDetailFocus(detailLinks[0]);
        for (const target of detailLinks.slice(1)) {
          await pressTab(page, "Tab", target);
          await expectDetailFocus(target);
        }
        // Include the final link in reverse, even when it is Back (no Sources).
        const last = detailLinks[detailLinks.length - 1];
        await page.keyboard.press("Tab");
        await expectTabReachable(page, last, "Shift+Tab");
        await expectDetailFocus(last);
        for (const target of detailLinks.slice(0, -1).reverse()) {
          await pressTab(page, "Shift+Tab", target);
          await expectDetailFocus(target);
        }
        await expect(page).toHaveURL(detailURL);
        expect(page.context().pages()).toHaveLength(1);
        await expectTabReachable(page, back);
        await expectDetailFocus(back);
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/demo$/);
        await expect(list).toBeVisible();
        await expect(list.getByRole("link")).toHaveCount(seededResearchTitles.length);
        await expect(list.getByRole("heading", { level: 2 })).toHaveText(seededResearchTitles);
        await expectNoHorizontalOverflow(page);
        await expectTabReachable(page, link);
        await expectExposedKeyboardFocus(link);
      });
    }
  });
}

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
    await expect(page.getByRole("combobox", { includeHidden: true })).toHaveCount(1);
    const appearance = page.getByRole("banner")
      .getByRole("combobox", { name: "Appearance", exact: true });
    await expect(appearance).toBeEnabled();
    await expect(appearance).toHaveAttribute("data-slot", "select-trigger");
    // Base UI renders one aria-hidden autofill input as a sibling of this
    // specific trigger. Do not exempt other hidden inputs or textboxes.
    const appearanceInput = appearance.locator("..").locator(":scope > input");
    await expect(appearanceInput).toHaveCount(1);
    await expect(appearanceInput).toHaveAttribute("aria-hidden", "true");
    await expect(appearanceInput).toHaveAttribute("tabindex", "-1");
    expect(await appearanceInput.evaluate((element) => ({
      type: element.getAttribute("type"),
      role: element.getAttribute("role"),
      dataSlot: element.getAttribute("data-slot"),
      effectiveType: (element as HTMLInputElement).type,
    }))).toEqual({ type: null, role: null, dataSlot: null, effectiveType: "text" });
    const textboxes = page.getByRole("textbox", { includeHidden: true });
    await expect(textboxes, `Only the Appearance internal textbox in ${view}`).toHaveCount(1);
    await expect(textboxes.and(appearanceInput)).toHaveCount(1);
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("textbox", { includeHidden: true })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("combobox", { includeHidden: true })).toHaveCount(0);
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
      for (const name of ["Sources", "Findings", "Discussion", "Conclusion"]) {
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

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
]) {
  test.describe(`Public Demo accessibility at ${viewport.width}px`, () => {
    test.use({ viewport });

    test("landmarks, link names and forward/reverse keyboard navigation", async ({ page }) => {
      await page.goto("/demo");
      const main = page.getByRole("main");
      await expect(main).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(main.getByRole("heading", { level: 1 })).toHaveText(workspaceName);
      const list = page.getByRole("region", { name: "Research list", exact: true });
      await expect(list.getByRole("heading", { level: 2 })).toHaveText(seededResearchTitles);

      const site = page.getByRole("link", { name: "Evidence Atlas", exact: true });
      const code = page.getByRole("link", { name: "Source code", exact: true });
      const appearance = page.getByRole("combobox", { name: "Appearance", exact: true });
      await expect(appearance).toBeEnabled();
      await expect(site).toHaveAttribute("href", "/demo");
      await expect(code).toHaveAttribute("href", "https://github.com/morimotodev93/evidence-atlas");
      const listLinks = [site, code, appearance, ...await list.getByRole("link").all()];
      for (const link of listLinks) {
        await expectTabReachable(page, link);
        await expectExposedKeyboardFocus(link);
      }
      for (const link of listLinks.slice(0, -1).reverse()) {
        await page.keyboard.press("Shift+Tab");
        await expectExposedKeyboardFocus(link);
      }

      const productivity = list.getByRole("link").first();
      const href = await productivity.getAttribute("href");
      if (!href) throw new Error("Missing Demo Research link");
      await expectTabReachable(page, productivity);
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new URL(href, page.url()).href);
      await expect(main).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(main.getByRole("heading", { level: 1 })).toHaveText(seededResearchTitles[0]);
      await expect(main.getByRole("heading", { level: 2 }))
        .toHaveText(["Sources", "Findings", "Discussion", "Conclusion"]);

      const sources = main.locator("section").filter({
        has: page.getByRole("heading", { name: "Sources", exact: true, level: 2 }),
      });
      const findings = main.locator("section").filter({
        has: page.getByRole("heading", { name: "Findings", exact: true, level: 2 }),
      });
      const sourceLinks = await sources.getByRole("link").all();
      const supportingLinks = await findings.getByRole("link").all();
      expect(sourceLinks.length).toBeGreaterThan(0);
      expect(supportingLinks.length).toBeGreaterThan(0);
      await expect(main.getByRole("heading", { level: 3 })).toHaveCount(sourceLinks.length);
      for (const link of [...sourceLinks, ...supportingLinks]) {
        await expect(link).toHaveAccessibleName(/\S/);
        await expect(link).toHaveAttribute("href", /^https?:\/\//);
        await expect(link).toHaveAttribute("target", "_blank");
      }
      for (const link of sourceLinks) {
        await expect(link.getByRole("heading", { level: 3 })).toHaveCount(1);
      }

      const back = page.getByRole("link", { name: "← Back to Demo Workspace", exact: true });
      const detailLinks = [site, code, appearance, back, ...sourceLinks, ...supportingLinks];
      const externalLinks = new Set([...sourceLinks, ...supportingLinks]);
      const detailURL = page.url();
      const expectDetailFocus = async (link: Locator) => {
        await expectExposedKeyboardFocus(link);
        if (viewport.width === 375 && externalLinks.has(link)) {
          await expectUnobscuredSourceFocus(page, link);
        }
      };
      for (const link of detailLinks) {
        await expectTabReachable(page, link);
        await expectDetailFocus(link);
      }
      if (viewport.width === 375) {
        // Also check the final Supporting Source in reverse: the existing
        // reverse loop starts at the penultimate link. Tab out, then return
        // through the real reverse order (including the document boundary).
        const last = supportingLinks[supportingLinks.length - 1];
        await page.keyboard.press("Tab");
        await expectTabReachable(page, last, "Shift+Tab");
        await expectDetailFocus(last);
      }
      for (const link of detailLinks.slice(0, -1).reverse()) {
        await pressTab(page, "Shift+Tab", link);
        await expectDetailFocus(link);
      }
      await expect(page).toHaveURL(detailURL);
      expect(page.context().pages()).toHaveLength(1);
      await expectTabReachable(page, back);
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/demo$/);
      await expect(list).toBeVisible();
      // Confirm keyboard operation remains available after returning to the list.
      await expectTabReachable(page, productivity);
      await expectExposedKeyboardFocus(productivity);
    });
  });
}
