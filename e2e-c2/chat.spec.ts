import { expect, type Locator, type Page } from "@playwright/test";
import { chatTest as test } from "./fixtures.ts";
import {
  HISTORY_AI_MESSAGE, HISTORY_PREVIEW, HISTORY_USER_MESSAGE,
  STREAM_USER_MESSAGE, STREAM_AI_REPLY, CITATION_AI_TEXT, CITATION_AI_REPLY, CITATION_SOURCE,
} from "./conversation-mocks.ts";
import { C2_ORIGIN, fixture, RESEARCH_PATH } from "../scripts/c2-playwright-policy.ts";

// The Chat-specific fixture installs exact, in-memory conversation routes before
// page navigation. The C2 boundary still refuses every other Chat request.
async function openResearchChat(page: Page): Promise<Locator> {
  await test.step("C2 navigation", async () => {
    const response = await page.goto(`${C2_ORIGIN}${RESEARCH_PATH}`);
    expect(response?.status() === 200, "C2 Research page must load").toBe(true);
    expect(page.url() === `${C2_ORIGIN}${RESEARCH_PATH}`, "C2 Research URL must remain exact").toBe(true);
  });
  await test.step("C2 Chat research heading", async () => {
    await expect(page.getByRole("heading", { name: String(fixture.research.title), level: 1, exact: true })).toBeVisible();
  });

  // The existing desktop fixture uses a 1280px viewport; the actual AI panel
  // appears in the desktop sidebar, not the mobile dialog.
  const panel = page.locator('aside[aria-label="AI Assistant"]');
  const trigger = page.getByRole("button", { name: "Ask AI", exact: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toBeHidden();
  await expect(panel).toHaveAttribute("inert", "");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await test.step("C2 Chat panel", async () => {
    await expect(panel).toBeVisible();
    await expect(panel).toBeFocused();
  });
  return panel;
}

test("E: create an in-memory Chat conversation without sending a message", async ({ page }) => {
  const panel = await openResearchChat(page);
  const composer = panel.getByPlaceholder("Ask about this research...", { exact: true });

  await test.step("C2 Chat initial state", async () => {
    await expect(panel.getByText("No conversation yet", { exact: true })).toBeVisible();
    await expect(composer).toBeDisabled();
    await expect(panel.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  });

  // The POST is fulfilled by the Chat-only mock; the real C2 Chat API remains 503.
  await test.step("C2 Chat creation", async () => {
    await panel.getByRole("button", { name: "New", exact: true }).click();
    await expect(panel.getByText("Conversation started", { exact: true })).toBeVisible();
    await expect(composer).toBeEnabled();
    await expect(panel.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  });
  const trigger = page.getByRole("button", { name: "Ask AI", exact: true });
  await test.step("Desktop visibility, draft, layout and keyboard focus", async () => {
    const grid = panel.locator("..");
    const body = grid.locator(":scope > div").first();
    const openWidth = (await body.boundingBox())!.width;
    await panel.focus();
    await page.keyboard.press("Tab");
    await expect(panel.getByRole("button", { name: "History", exact: true })).toBeFocused();

    const composer = panel.getByRole("textbox", { name: "Message to AI" });
    await composer.fill("Keep this unfinished draft");
    // A DOM marker proves that hiding/reopening did not replace the panel subtree.
    await composer.evaluate((node) => { node.dataset.mountMarker = "original"; });
    await panel.getByRole("button", { name: "Close AI Assistant", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
    await expect(panel).toHaveAttribute("hidden", "");
    await expect(panel).toHaveAttribute("inert", "");
    expect((await body.boundingBox())!.width).toBeGreaterThan(openWidth);
    await page.keyboard.press("Tab");
    expect(await panel.evaluate((node) => node.contains(document.activeElement))).toBe(false);
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(panel).toBeFocused();
    await expect(composer).toHaveAttribute("data-mount-marker", "original");
    await expect(composer).toHaveValue("Keep this unfinished draft");
    await expect(composer).toBeEnabled();
    await expect(panel.getByText("Conversation started", { exact: true })).toBeVisible();
    expect((await body.boundingBox())!.width).toBe(openWidth);
  });
  await test.step("Breakpoint, desktop History dismissal and independent mobile dialog", async () => {
    await composer.fill("Desktop only");
    await panel.getByRole("button", { name: "History", exact: true }).click();
    const history = page.getByRole("dialog", { name: "Select Conversation", exact: true });
    await expect(history).toBeVisible();
    await page.setViewportSize({ width: 1023, height: 800 });
    await expect(history).toBeHidden();
    await expect(panel).toBeHidden();
    await expect(panel.locator("..").locator(":scope > div").first()).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Ask AI", exact: true }).click();
    const mobile = page.getByRole("dialog", { name: "Ask AI", exact: true });
    await expect(mobile).toBeVisible();
    await expect(mobile.getByText("No conversation yet", { exact: true })).toBeVisible();
    await expect(mobile.getByRole("textbox", { name: "Message to AI" })).toHaveValue("");
    await expect(mobile.getByRole("textbox", { name: "Message to AI" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(mobile).toBeHidden();
    await expect(page.getByRole("button", { name: "Ask AI", exact: true })).toBeFocused();
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(composer).toHaveValue("Desktop only");
    await expect(history).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test("F: list an in-memory Chat conversation in History", async ({ page }) => {
  const panel = await openResearchChat(page);
  const history = panel.getByRole("button", { name: "History", exact: true });
  const dialog = page.getByRole("dialog", { name: "Select Conversation", exact: true });

  // Verify the empty local response before creating a conversation.
  await history.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("No conversations yet.", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await panel.getByRole("button", { name: "New", exact: true }).click();
  await expect(panel.getByText("Conversation started", { exact: true })).toBeVisible();

  await history.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /New conversation/ })).toHaveCount(1);
  // This case covers list rendering only; selection is exercised in G.
});

test("G: restore synthetic messages from a selected History conversation", async ({ page, conversationMocks }) => {
  // Only this case opts into seeded history. E and F remain empty by default.
  conversationMocks.seedHistory();
  const panel = await openResearchChat(page);
  const composer = panel.getByPlaceholder("Ask about this research...", { exact: true });
  const history = panel.getByRole("button", { name: "History", exact: true });
  const dialog = page.getByRole("dialog", { name: "Select Conversation", exact: true });

  await expect(panel.getByText("No conversation yet", { exact: true })).toBeVisible();
  await expect(composer).toBeDisabled();
  await history.click();
  await expect(dialog).toBeVisible();
  const saved = dialog.getByRole("button").filter({
    has: page.getByText(HISTORY_PREVIEW, { exact: true }),
  });
  await expect(saved).toHaveCount(1);
  await saved.click();

  // Selection calls a locally fulfilled detail GET. No Chat POST or AI model
  // invocation is required to restore and render both stored messages.
  await expect(dialog).toBeHidden();
  await expect(panel.getByText(HISTORY_USER_MESSAGE, { exact: true })).toBeVisible();
  await expect(panel.getByText(HISTORY_AI_MESSAGE, { exact: true })).toBeVisible();
  await expect(panel.getByText("No conversation yet", { exact: true })).toHaveCount(0);
  await expect(composer).toBeEnabled();
  await expect(panel.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  await panel.getByRole("button", { name: "Close AI Assistant", exact: true }).click();
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  await expect(panel.getByText(HISTORY_USER_MESSAGE, { exact: true })).toBeVisible();
  await expect(panel.getByText(HISTORY_AI_MESSAGE, { exact: true })).toBeVisible();
  await expect(composer).toBeEnabled();

});

// The real C2 Chat POST remains disabled. Only this test enables an exact,
// deterministic text/plain route fulfilled entirely in memory.
test("H: display a locally mocked AI text response after sending a fixed prompt", async ({ page, conversationMocks }) => {
  conversationMocks.enableStreaming();
  const panel = await openResearchChat(page);
  const composer = panel.getByPlaceholder("Ask about this research...", { exact: true });
  const send = panel.getByRole("button", { name: "Send", exact: true });

  await panel.getByRole("button", { name: "New", exact: true }).click();
  await expect(panel.getByText("Conversation started", { exact: true })).toBeVisible();
  await composer.fill(STREAM_USER_MESSAGE);
  await expect(send).toBeEnabled();
  await send.click();

  // The panel consumes response.body.getReader() and appends decoded text.
  // route.fulfill does not establish incremental on-wire chunk delivery.
  await expect(panel.getByText(STREAM_USER_MESSAGE, { exact: true })).toBeVisible();
  await expect(panel.getByText(STREAM_AI_REPLY, { exact: true })).toBeVisible();
  await expect(composer).toBeEnabled();
  await expect(send).toBeDisabled();
  await expect(panel.getByRole("alert")).toHaveCount(0);
});

// One explicitly enabled, locally fulfilled HTTP 503 exercises the panel's
// optimistic-message rollback and alert. This is not a real C2 Chat response.
test("I: show a send error and restore the idle composer after a synthetic local failure", async ({ page, conversationMocks }) => {
  conversationMocks.enableSendFailure();
  const panel = await openResearchChat(page);
  const composer = panel.getByPlaceholder("Ask about this research...", { exact: true });
  const send = panel.getByRole("button", { name: "Send", exact: true });

  await panel.getByRole("button", { name: "New", exact: true }).click();
  await expect(panel.getByText("Conversation started", { exact: true })).toBeVisible();
  await composer.fill(STREAM_USER_MESSAGE);
  await expect(send).toBeEnabled();
  await send.click();

  // handleSend rolls back its optimistic USER/AI pair on a non-2xx response.
  // A synthetic 503 uses the fixed availability message, never its JSON body.
  await expect(panel.getByRole("alert")).toHaveText("Chat is temporarily unavailable. Please contact the administrator or try again later.");
  await expect(panel.getByText("Conversation started", { exact: true })).toBeVisible();
  await expect(panel.getByText(STREAM_USER_MESSAGE, { exact: true })).toHaveCount(0);
  await expect(panel.getByText(STREAM_AI_REPLY, { exact: true })).toHaveCount(0);
  await expect(composer).toBeEnabled();
  await expect(composer).toHaveValue("");
  await expect(send).toBeDisabled();

  // Starting a new mock conversation clears the alert without contacting DB.
  await panel.getByRole("button", { name: "New", exact: true }).click();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await expect(panel.getByText("Conversation started", { exact: true })).toBeVisible();
  await expect(composer).toBeEnabled();
});

// The source URL is a non-resolving .invalid test value. Check its anchor
// attributes only; do not click or navigate to any external destination.
test("J: display a synthetic supporting-source link after a locally cited AI reply", async ({ page, conversationMocks }) => {
  conversationMocks.enableCitations();
  const panel = await openResearchChat(page);
  const composer = panel.getByPlaceholder("Ask about this research...", { exact: true });
  const send = panel.getByRole("button", { name: "Send", exact: true });

  await panel.getByRole("button", { name: "New", exact: true }).click();
  await expect(panel.getByText("Conversation started", { exact: true })).toBeVisible();
  await composer.fill(STREAM_USER_MESSAGE);
  await send.click();

  // The answer contains a [source:id] marker, while detail GET supplies a
  // matching synthetic source. The panel strips the marker from visible text.
  await expect(panel.getByText(CITATION_AI_TEXT, { exact: true })).toBeVisible();
  await expect(panel.getByText(CITATION_AI_REPLY, { exact: true })).toHaveCount(0);
  await expect(panel.getByText("Supporting sources", { exact: true })).toBeVisible();
  const sourceLink = panel.getByRole("link", { name: CITATION_SOURCE.title, exact: true });
  await expect(sourceLink).toHaveCount(1);
  await expect(sourceLink).toHaveAttribute("href", CITATION_SOURCE.url);
  await expect(sourceLink).toHaveAttribute("target", "_blank");
  await expect(sourceLink).toHaveAttribute("rel", "noreferrer");
  await panel.getByRole("button", { name: "Close AI Assistant", exact: true }).click();
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  await expect(panel.getByText(CITATION_AI_TEXT, { exact: true })).toBeVisible();
  await expect(sourceLink).toBeVisible();
  await expect(sourceLink).toHaveAttribute("href", CITATION_SOURCE.url);
  await expect(composer).toBeEnabled();
  await expect(send).toBeDisabled();
  await expect(panel.getByRole("alert")).toHaveCount(0);
});
