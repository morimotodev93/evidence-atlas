import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  createEvent: vi.fn(),
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: mocks.send,
  },
  researchIndexRequested: {
    create: mocks.createEvent,
  },
}));

import { requestResearchIndex } from "@/inngest/request-research-index";

describe("requestResearchIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a research index requested event", async () => {
    const event = {
      name: "research/index.requested",
      data: {
        researchId: "research-1",
      },
    };

    mocks.createEvent.mockReturnValueOnce(event);
    mocks.send.mockResolvedValueOnce(undefined);

    await requestResearchIndex("research-1");

    expect(mocks.createEvent).toHaveBeenCalledTimes(1);
    expect(mocks.createEvent).toHaveBeenCalledWith({
      researchId: "research-1",
    });

    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(event);
  });

  it("does not throw when enqueueing fails", async () => {
    const error = new Error("Inngest unavailable");

    mocks.createEvent.mockReturnValueOnce({
      name: "research/index.requested",
      data: {
        researchId: "research-1",
      },
    });

    mocks.send.mockRejectedValueOnce(error);

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(requestResearchIndex("research-1")).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Failed to enqueue research indexing"),
      expect.objectContaining({
        researchId: "research-1",
        error,
      }),
    );
  });
});
