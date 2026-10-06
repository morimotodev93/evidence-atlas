import { afterEach, describe, expect, it } from "vitest";

import { getSentryTracesSampleRate } from "@/lib/observability/sentry-config";

const ENV_NAME = "NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE";
const originalValue = process.env[ENV_NAME];

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env[ENV_NAME];
    return;
  }

  process.env[ENV_NAME] = originalValue;
});

describe("getSentryTracesSampleRate", () => {
  it.each([
    [undefined, 0],
    ["0", 0],
    ["0.1", 0.1],
    ["0.5", 0.5],
    ["1", 1],
    ["-0.1", 0],
    ["1.1", 0],
    ["abc", 0],
    ["", 0],
  ])("returns %s as %s", (value, expected) => {
    if (value === undefined) {
      delete process.env[ENV_NAME];
    } else {
      process.env[ENV_NAME] = value;
    }

    expect(getSentryTracesSampleRate()).toBe(expected);
  });
});
