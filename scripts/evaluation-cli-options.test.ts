import { describe, expect, it } from "vitest";

import { parseEvaluationCliOptions } from "./evaluation-cli-options";

describe("parseEvaluationCliOptions", () => {
  it.each([
    { args: [], caseId: "ai-chat-01-agreement", provider: "gemini", save: false },
    { args: ["--save"], caseId: "ai-chat-01-agreement", provider: "gemini", save: true },
    { args: ["ai-chat-03-inference"], caseId: "ai-chat-03-inference", provider: "gemini", save: false },
    { args: ["ai-chat-03-inference", "groq"], caseId: "ai-chat-03-inference", provider: "groq", save: false },
    { args: ["ai-chat-03-inference", "groq", "--save"], caseId: "ai-chat-03-inference", provider: "groq", save: true },
    { args: ["ai-chat-03-inference", "--save"], caseId: "ai-chat-03-inference", provider: "gemini", save: true },
    { args: ["--save", "ai-chat-03-inference", "groq"], caseId: "ai-chat-03-inference", provider: "groq", save: true },
  ])("preserves positional arguments and defaults: $args", ({ args, ...expected }) => {
    expect(parseEvaluationCliOptions(args)).toEqual(expected);
  });

  it.each(["--unknown", "--save=true", "-s"])("rejects unsupported option %s", (option) => {
    expect(() => parseEvaluationCliOptions([option])).toThrow(
      `Unsupported evaluation option: ${option}`,
    );
  });

  it("rejects unsupported providers", () => {
    expect(() => parseEvaluationCliOptions(["case-id", "unknown"])).toThrow(
      "Unsupported evaluation provider: unknown",
    );
  });

  it("rejects excess positional arguments", () => {
    expect(() => parseEvaluationCliOptions(["case-id", "groq", "extra"])).toThrow("Usage:");
  });
});
