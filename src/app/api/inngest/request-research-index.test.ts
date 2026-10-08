import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  createEvent: vi.fn(),
  requireProductionSafeInngestMode: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: mocks.send,
  },
  researchIndexRequested: {
    create: mocks.createEvent,
  },
  requireProductionSafeInngestMode: mocks.requireProductionSafeInngestMode,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}));

import { requestResearchIndex } from "@/inngest/request-research-index";

describe("requestResearchIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireProductionSafeInngestMode.mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("checks the production Inngest mode before sending a research index requested event", async () => {
    const event = {
      name: "research/index.requested",
      data: {
        researchId: "research-1",
      },
    };

    mocks.createEvent.mockReturnValueOnce(event);
    mocks.send.mockResolvedValueOnce(undefined);

    await requestResearchIndex("research-1");

    expect(mocks.requireProductionSafeInngestMode).toHaveBeenCalledTimes(1);

    expect(mocks.createEvent).toHaveBeenCalledTimes(1);
    expect(mocks.createEvent).toHaveBeenCalledWith({
      researchId: "research-1",
    });

    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(event);

    expect(
      mocks.requireProductionSafeInngestMode.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.send.mock.invocationCallOrder[0]!);

    expect(mocks.captureException).not.toHaveBeenCalled();
  });

  it("does not create or send an event when the production Inngest mode is unsafe", async () => {
    const error = new Error(
      "Inngest dev mode is not permitted in production. Check INNGEST_DEV.",
    );

    mocks.requireProductionSafeInngestMode.mockImplementationOnce(() => {
      throw error;
    });

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(requestResearchIndex("research-1")).resolves.toBeUndefined();

    expect(mocks.requireProductionSafeInngestMode).toHaveBeenCalledTimes(1);

    expect(mocks.createEvent).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();

    expect(mocks.captureException).toHaveBeenCalledTimes(1);
    expect(mocks.captureException).toHaveBeenCalledWith(error, {
      tags: {
        subsystem: "background-jobs",
        operation: "research-index-enqueue",
      },
      extra: {
        researchId: "research-1",
      },
    });

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Failed to enqueue research indexing"),
      expect.objectContaining({
        researchId: "research-1",
        error,
      }),
    );
  });

  it("reports the error without throwing when enqueueing fails", async () => {
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

    expect(mocks.requireProductionSafeInngestMode).toHaveBeenCalledTimes(1);

    expect(mocks.captureException).toHaveBeenCalledTimes(1);
    expect(mocks.captureException).toHaveBeenCalledWith(error, {
      tags: {
        subsystem: "background-jobs",
        operation: "research-index-enqueue",
      },
      extra: {
        researchId: "research-1",
      },
    });

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Failed to enqueue research indexing"),
      expect.objectContaining({
        researchId: "research-1",
        error,
      }),
    );
  });
});
