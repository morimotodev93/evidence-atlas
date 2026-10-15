import { expect, type Locator, type Page } from "@playwright/test";
import { chatTest as test } from "./fixtures.ts";
import { C2_ORIGIN, fixture, RESEARCH_PATH } from "../scripts/c2-playwright-policy.ts";

// The Chat-specific fixture installs exact, in-memory conversation routes before
// page navigation. The C2 boundary still refuses every other Chat request.
async function openResearchChat(page: Page): Promise<Locator> {
  const response = await page.goto(`${C2_ORIGIN}${RESEARCH_PATH}`);
  expect(response?.status() === 200, "C2 Research page must load").toBe(true);
  expect(page.url() === `${C2_ORIGIN}${RESEARCH_PATH}`, "C2 Research URL must remain exact").toBe(true);
  await expect(page.getByRole("heading", { name: String(fixture.research.title), level: 1, exact: true })).toBeVisible();

  // The existing desktop fixture uses a 1280px viewport; the actual AI panel
  // appears in the desktop sidebar, not the mobile dialog.
  const panel = page.locator("aside").filter({
    has: page.getByRole("heading", { name: "AI Assistant", level: 2, exact: true }),
  });
  await expect(panel).toBeVisible();
  return panel;
}

test("E: create an in-memory Chat conversation without sending a message", async ({ page }) => {
  const panel = await openResearchChat(page);
  const composer = panel.getByPlaceholder("Ask about this research...", { exact: true });

  await expect(panel.getByText("No conversation yet", { exact: true })).toBeVisible();
  await expect(composer).toBeDisabled();
  await expect(panel.getByRole("button", { name: "Send", exact: true })).toBeDisabled();

  // The POST is fulfilled by the Chat-only mock; the real C2 Chat API remains 503.
  await panel.getByRole("button", { name: "New", exact: true }).click();
  await expect(panel.getByText("Conversation started", { exact: true })).toBeVisible();
  await expect(composer).toBeEnabled();
  await expect(panel.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
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
  // Do not select a History item yet: conversation-detail GET is not mocked.
});
