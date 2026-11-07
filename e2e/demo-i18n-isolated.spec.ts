import { test, expect, FIXTURE_ORIGIN } from "./fixtures/demo-i18n-offline";
import type { Page } from "@playwright/test";

async function ready(page: Page) {
  await page.getByRole("button", { name: "認証してチャットを開始" }).click();
  await expect(page.getByRole("combobox", { name: "表示言語" })).toBeDisabled();
  await page.getByRole("button", { name: "Complete offline verification" }).click();
  await expect(page.getByRole("status")).toHaveText("準備ができました。質問を入力できます。");
}

for (const width of [375, 768, 1280]) {
  test.describe(`${width}px localized Demo (synthetic browser routes)`, () => {
    test.use({ viewport: { width, height: 900 } });
    test("legacy/en/ja lists, keyboard switch, query/hash and Back/Forward", async ({ page, chatFixture }) => {
      await page.goto(`${FIXTURE_ORIGIN}/demo?query=AI%20tools&tag=one&tag=two#research`);
      await expect(page.getByText("Browse research ・ AI chat", { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: /Developer Productivity/ })).toHaveAttribute("href", "/demo/research/demo-research");
      const language = page.getByRole("combobox", { name: "Language", exact: true });
      await language.focus();
      await expect(language).toBeFocused();
      expect(await language.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe("none");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(`${FIXTURE_ORIGIN}/ja/demo?query=AI%20tools&tag=one&tag=two#research`);
      await expect(page.getByRole("combobox", { name: "表示言語" })).toHaveValue("ja");
      await expect(page.getByRole("link", { name: /開発者の生産性/ })).toHaveAttribute("href", "/ja/demo/research/demo-research");
      await page.goBack();
      await expect(page).toHaveURL(/\/demo\?query=/);
      await page.goForward();
      await expect(page.getByText("リサーチ閲覧・AIチャット", { exact: true })).toBeVisible();
      await page.getByRole("combobox", { name: "表示言語" }).selectOption("en");
      await expect(page).toHaveURL(`${FIXTURE_ORIGIN}/en/demo?query=AI%20tools&tag=one&tag=two#research`);
      await expect(page.getByRole("link", { name: /Developer Productivity/ })).toHaveAttribute("href", "/en/demo/research/demo-research");
      expect(chatFixture.posts).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test("Japanese random prompts, editable drafts, pending guard, Sources and identity", async ({ page, chatFixture }) => {
      await page.goto(`${FIXTURE_ORIGIN}/ja/demo/research/demo-research?view=sources&tag=one&tag=two#evidence`);
      await expect(page.getByRole("heading", { name: "調査結果", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "開発者の生産性", exact: true })).toBeVisible();
      await expect(page.getByText(/95人.*JavaScript.*55%/)).toBeVisible();
      await expect(page.getByText(/開発者16人.*246件.*19%増加/)).toBeVisible();
      await expect(page.getByText(/これらは仮説であり/)).toBeVisible();
      await expect(page.getByText("コード生成が速くなればソフトウェアデリバリーも自動的に速くなると想定せず、生産性は複数の指標で評価する必要があります。", { exact: true })).toBeVisible();
      await expect(page.getByText("生産性", { exact: true })).toBeVisible();
      await expect(page.getByText("作成日 2026年10月8日", { exact: true })).toBeVisible();
      await expect(page.locator("div[lang=ja]").first()).toBeVisible();
      const evidenceLink = page.locator("main").getByRole("link", { name: /Research: Quantifying GitHub Copilot/ }).first();
      await page.getByRole("combobox", { name: "表示言語" }).focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "← デモワークスペースに戻る", exact: true })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(evidenceLink).toBeFocused();
      const linkBox = await evidenceLink.boundingBox();
      const headerBox = await page.locator("div[lang=ja] > header").boundingBox();
      expect(linkBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height);
      await ready(page);
      const input = page.getByRole("textbox", { name: "質問", exact: true });
      const random = page.getByRole("button", { name: "質問の例を選ぶ", exact: true });
      await random.focus();
      await page.keyboard.press("Enter");
      await expect(input).toBeFocused();
      const first = await input.inputValue();
      expect(first).toMatch(/[ぁ-んァ-ヶ一-龠]/);
      await random.click();
      expect(await input.inputValue()).not.toBe(first);
      expect(chatFixture.posts).toHaveLength(1);
      await input.fill(`${first} 編集`);
      await expect(random).toBeDisabled();
      await expect(input).toHaveValue(`${first} 編集`);
      // The Japanese UI accepts an English question without rewriting it.
      await input.fill("What does the saved evidence say?");
      chatFixture.hold = true;
      await page.getByRole("button", { name: "質問を送信", exact: true }).click();
      await expect(page.getByRole("combobox", { name: "表示言語" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "送信中…", exact: true })).toBeDisabled();
      await expect(input).toBeDisabled();
      await expect(random).toBeDisabled();
      await expect.poll(() => chatFixture.posts.length).toBe(2);
      chatFixture.release();
      await expect(page.getByText("Offline answer for demo-research", { exact: true })).toBeVisible();
      expect(chatFixture.posts[1]).toMatchObject({ researchId: "demo-research", message: "What does the saved evidence say?" });
      await expect(page.getByRole("region", { name: "チャットのメッセージ" }).getByRole("link", { name: /Research: Quantifying GitHub Copilot/ })).toHaveAttribute("href", "https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: test.info().outputPath(`japanese-demo-${width}.png`), fullPage: true });
      await page.getByRole("combobox", { name: "表示言語" }).selectOption("en");
      await expect(page).toHaveURL(`${FIXTURE_ORIGIN}/en/demo/research/demo-research?view=sources&tag=one&tag=two#evidence`);
      await expect(page.getByRole("heading", { name: "Findings", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Developer Productivity", exact: true })).toBeVisible();
      await expect(page.getByText(/GitHub's 2022 randomized experiment assigned 95 professional developers/)).toBeVisible();
      await expect(page.getByRole("textbox", { name: "Your question", exact: true })).toHaveValue("");
      expect(chatFixture.posts).toHaveLength(2);
      // Switching resets only local UI; it creates neither a session nor a question.
      await page.getByRole("button", { name: "Start verified session" }).click();
      await page.getByRole("button", { name: "Complete offline verification" }).click();
      await page.getByRole("button", { name: "Random question", exact: true }).click();
      expect(await page.getByRole("textbox", { name: "Your question", exact: true }).inputValue()).toMatch(/^What|^How|^Can/);
      expect(chatFixture.posts).toHaveLength(3);
    });

    test("Japanese errors require explicit retry and retain the draft", async ({ page, chatFixture }) => {
      await page.goto(`${FIXTURE_ORIGIN}/ja/demo/research/demo-research`);
      await ready(page);
      chatFixture.status = 503;
      const input = page.getByRole("textbox", { name: "質問", exact: true });
      await input.fill("保存された根拠を説明してください。");
      await page.getByRole("button", { name: "質問を送信", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("自動での再送は行っていません。");
      await expect(input).toHaveValue("保存された根拠を説明してください。");
      await page.waitForTimeout(250);
      expect(chatFixture.posts).toHaveLength(2);
      await expect(page.getByRole("combobox", { name: "表示言語" })).toBeEnabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  });
}
