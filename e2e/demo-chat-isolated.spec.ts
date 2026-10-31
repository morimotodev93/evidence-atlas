import { test, expect, FIXTURE_ORIGIN } from "./fixtures/demo-chat-offline";
import type { Page } from "@playwright/test";

async function ready(page: Page) {
  await page.getByRole("button", { name: "Toggle fixture Chat" }).click();
  await page.getByRole("button", { name: "Start verified session" }).click();
  await page.getByRole("button", { name: "Complete offline verification" }).click();
  await expect(page.getByRole("status")).toHaveText("Session ready. You can ask a question.");
}

for (const width of [375, 768, 1280]) {
  test.describe(`${width}px offline Chat`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(async ({ page }) => { await page.goto(FIXTURE_ORIGIN); });

    test("disabled, explicit verification, session201, question200, Answer and Source", async ({ page, chatFixture }) => {
      await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Your question", { exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Send question" })).toBeDisabled();
      expect(chatFixture.posts).toEqual([]);
      await ready(page);
      expect(chatFixture.posts).toEqual([{ operation: "session", researchId: "first", turnstileToken: "synthetic-token" }]);
      await page.getByLabel("Your question", { exact: true }).fill("What does the evidence say?");
      await page.getByRole("button", { name: "Send question" }).click();
      await expect(page.getByText("Offline answer for first", { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Evidence first" })).toHaveAttribute("href", "https://sources.invalid/first");
      expect(chatFixture.posts).toHaveLength(2);
      expect(chatFixture.posts[1]).toEqual({ operation: "question", researchId: "first", threadId: "a".repeat(43), message: "What does the evidence say?" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator("html").evaluate((html) => getComputedStyle(html).fontFamily)).toContain("sans-serif");
      await page.screenshot({ path: test.info().outputPath(`synthetic-chat-${width}.png`), fullPage: true });
    });

    test("loading, synchronous double submit protection and keyboard focus", async ({ page, chatFixture }) => {
      await ready(page);
      const input = page.getByLabel("Your question", { exact: true });
      await input.focus();
      await expect(input).toBeFocused();
      await input.fill("Keyboard question");
      await page.keyboard.press("Tab");
      const send = page.getByRole("button", { name: "Send question" });
      await expect(send).toBeFocused();
      expect(await send.evaluate((button) => getComputedStyle(button).boxShadow)).not.toBe("none");
      await page.keyboard.press("Shift+Tab");
      await expect(input).toBeFocused();
      await page.keyboard.press("Tab");
      chatFixture.hold = true;
      await page.keyboard.press("Enter");
      await expect(page.getByRole("status")).toContainText("Sending question");
      await expect(input).toBeDisabled();
      await expect(page.getByRole("button", { name: "Sending…" })).toBeDisabled();
      await expect(page.getByRole("region", { name: "Conversation messages" })).toHaveAttribute("aria-busy", "true");
      await expect(page.getByRole("button", { name: "Random question", exact: true })).toBeDisabled();
      await page.locator("form").evaluate((form) => {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
      await expect.poll(() => chatFixture.posts.length).toBe(2);
      chatFixture.release();
      await expect(page.getByText("Offline answer for first", { exact: true })).toBeVisible();
      expect(chatFixture.posts).toHaveLength(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test("random questions fill without sending, differ, focus input and protect edits", async ({ page, chatFixture }) => {
      await ready(page);
      const input = page.getByLabel("Your question", { exact: true });
      const random = page.getByRole("button", { name: "Random question", exact: true });
      await random.focus();
      await page.keyboard.press("Enter");
      await expect(input).toBeFocused();
      const first = await input.inputValue();
      expect(first.length).toBeGreaterThan(0);
      await random.click();
      expect(await input.inputValue()).not.toBe(first);
      expect(chatFixture.posts).toHaveLength(1);
      await input.fill(`${first} My edit`);
      await expect(random).toBeDisabled();
      await expect(input).toHaveValue(`${first} My edit`);
      await input.fill("");
      await expect(random).toBeEnabled();
      await input.focus();
      await page.keyboard.press("Tab");
      await expect(random).toBeFocused();
      await page.keyboard.press("Space");
      await expect(input).toBeFocused();
      expect(chatFixture.posts).toHaveLength(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test("answer paragraphs, reference labels and long text stay readable within the viewport", async ({ page, chatFixture }) => {
      await ready(page);
      chatFixture.answer = `Study comparison:\nCompletion time increased by 19% (source-first).\n\nThis is not a universal effect.\n${"LongEvidenceText".repeat(35)}`;
      await page.getByLabel("Your question", { exact: true }).fill("Compare the saved studies");
      await page.getByRole("button", { name: "Send question" }).click();
      const region = page.getByRole("region", { name: "Conversation messages" });
      await expect(region.getByText("Completion time increased by 19% (Source 1).", { exact: true })).toBeVisible();
      await expect(region.getByRole("heading", { name: "Supporting sources" })).toBeVisible();
      await expect(region.getByRole("list", { name: "Supporting sources" })).toContainText("Source 1: Evidence first");
      const paragraph = region.getByText("This is not a universal effect.", { exact: true });
      await expect(paragraph).toBeVisible();
      const styles = await paragraph.evaluate((node) => {
        const group = node.parentElement!;
        return { lineHeight: getComputedStyle(node).lineHeight, paragraphSpacing: group.getBoundingClientRect().top - group.previousElementSibling!.getBoundingClientRect().bottom };
      });
      expect(styles).toEqual({ lineHeight: "28px", paragraphSpacing: 16 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    for (const status of [400, 429, 503]) {
      test(`${status} error with no automatic retry`, async ({ page, chatFixture }) => {
        await ready(page);
        chatFixture.status = status;
        await page.getByLabel("Your question", { exact: true }).fill("Refused question");
        await page.getByRole("button", { name: "Send question" }).click();
        await expect(page.getByRole("alert")).toContainText(status === 429 ? "limit reached" : status === 400 ? "request was refused" : "Nothing was retried automatically");
        // Observe for longer than a UI scheduling turn; no retry timers in client.
        await page.waitForTimeout(250);
        expect(chatFixture.posts).toHaveLength(2);
        await expect(page.getByText("Offline answer for first", { exact: true })).toHaveCount(0);
        if (status === 429) await expect(page.getByRole("button", { name: "Send question" })).toBeDisabled();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      });
    }

    test("Research switch drops composer, thread, answer and a delayed old response", async ({ page, chatFixture }) => {
      await ready(page);
      await page.getByLabel("Your question", { exact: true }).fill("Old question");
      await page.getByRole("button", { name: "Send question" }).click();
      await expect(page.getByText("Offline answer for first", { exact: true })).toBeVisible();
      chatFixture.hold = true;
      await page.getByLabel("Your question", { exact: true }).fill("Late old question");
      await page.getByRole("button", { name: "Send question" }).click();
      await expect.poll(() => chatFixture.posts.length).toBe(3);
      await page.getByRole("button", { name: "Switch Research" }).click();
      chatFixture.release();
      await expect(page.getByLabel("Your question", { exact: true })).toHaveValue("");
      await expect(page.getByLabel("Your question", { exact: true })).toBeDisabled();
      await expect(page.getByText("Offline answer for first", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Evidence first" })).toHaveCount(0);
      await page.getByRole("button", { name: "Start verified session" }).click();
      await page.getByRole("button", { name: "Complete offline verification" }).click();
      await expect(page.getByRole("status")).toContainText("Session ready");
      chatFixture.hold = false;
      await page.getByLabel("Your question", { exact: true }).fill("New question");
      await page.getByRole("button", { name: "Send question" }).click();
      await expect(page.getByText("Offline answer for second", { exact: true })).toBeVisible();
      expect(chatFixture.posts.at(-1)).toMatchObject({ researchId: "second", threadId: "b".repeat(43), message: "New question" });
      await expect(page.getByText("Offline answer for first", { exact: true })).toHaveCount(0);
    });
  });
}

test("session refusal requires manual verification and sends no question", async ({ page, chatFixture }) => {
  chatFixture.sessionStatus = 403;
  await page.goto(FIXTURE_ORIGIN);
  await page.getByRole("button", { name: "Toggle fixture Chat" }).click();
  await page.getByRole("button", { name: "Start verified session" }).click();
  await page.getByRole("button", { name: "Complete offline verification" }).click();
  await expect(page.getByRole("alert")).toContainText("verification failed");
  await expect(page.getByLabel("Your question", { exact: true })).toBeDisabled();
  await page.waitForTimeout(250);
  expect(chatFixture.posts).toHaveLength(1);
});

test("unlisted HTTP and WebSocket attempts are blocked locally", async ({ page, chatFixture }) => {
  await page.goto(FIXTURE_ORIGIN);
  const rejected = await page.evaluate(async () => {
    try { await fetch("/unlisted"); return false; } catch { return true; }
  });
  expect(rejected).toBe(true);
  const externalRejected = await page.evaluate(() => new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/unlisted.js";
    script.onload = () => resolve(false);
    script.onerror = () => resolve(true);
    document.head.appendChild(script);
  }));
  expect(externalRejected).toBe(true);
  await page.evaluate(() => { new WebSocket("wss://demo-chat-fixture.invalid/socket"); });
  await expect.poll(() => chatFixture.denied.length).toBe(3);
  expect(chatFixture.denied.splice(0)).toEqual(["unexpected-request", "unexpected-request", "websocket"]);
});
