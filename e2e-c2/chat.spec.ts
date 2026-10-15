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
    has: dialog.getByText(HISTORY_PREVIEW, { exact: true }),
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
  await expect(panel.getByRole("alert")).toHaveText("Failed to send message.");
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
  await expect(composer).toBeEnabled();
  await expect(send).toBeDisabled();
  await expect(panel.getByRole("alert")).toHaveCount(0);
});
