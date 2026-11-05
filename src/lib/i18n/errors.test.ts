import { describe, expect, expectTypeOf, it } from "vitest";

import { type Dictionary } from "./dictionaries/en";
import { ja } from "./dictionaries/ja";
import { getErrorMessage, type DisplayError, type ErrorCode } from "./errors";

const messages = [
  ["INVALID_INPUT", "Check your input and try again.", "入力内容を確認して、もう一度お試しください。"],
  ["UNAUTHENTICATED", "Sign in to continue.", "続けるにはログインしてください。"],
  ["FORBIDDEN", "You do not have permission to perform this action.", "この操作を行う権限がありません。"],
  ["NOT_FOUND", "The requested item could not be found.", "対象のデータが見つかりません。"],
  ["CONFLICT", "This action cannot be completed in the current state. Check and try again.", "現在の状態ではこの操作を完了できません。確認して、もう一度お試しください。"],
  ["INTERNAL_ERROR", "Something went wrong. Please try again.", "エラーが発生しました。もう一度お試しください。"],
  ["ONBOARDING_INVALID_INPUT", "Enter an organization name and workspace name.", "Organization名とWorkspace名を入力してください。"],
  ["ONBOARDING_CREATE_FAILED", "Failed to create your workspace. Please try again.", "Workspaceを作成できませんでした。もう一度お試しください。"],
] as const satisfies ReadonlyArray<readonly [ErrorCode, string, string]>;

describe("error display contract", () => {
  it.each(messages)("renders %s in English by default and in Japanese", (code, en, ja) => {
    expect(getErrorMessage({ code })).toBe(en);
    expect(getErrorMessage({ code }, "en")).toBe(en);
    expect(getErrorMessage({ code }, "ja")).toBe(ja);
    expect(getErrorMessage({ code }, "ja-JP")).toBe(en);
  });

  it("requires a numeric length parameter in the typed contract", () => {
    expectTypeOf<Extract<DisplayError, { code: "INPUT_TOO_LONG" }>["params"]>()
      .toEqualTypeOf<{ readonly maxLength: number }>();
  });

  it("interpolates only the validated parameter without mutating or retaining caller state", () => {
    const error = Object.freeze({
      code: "INPUT_TOO_LONG",
      params: Object.freeze({ maxLength: 200 }),
    } as const satisfies DisplayError);
    // Runs in Node without browser globals, Next.js mocks, a DB or cookie state.
    expect(getErrorMessage(error)).toBe("Use 200 characters or fewer.");
    expect(getErrorMessage(error, "ja")).toBe("200文字以内で入力してください。");
    expect(getErrorMessage({ code: "INPUT_TOO_LONG", params: { maxLength: 100 } }, "ja"))
      .toBe("100文字以内で入力してください。");
    expect(getErrorMessage(error)).toBe("Use 200 characters or fewer.");
    expect(error).toEqual({ code: "INPUT_TOO_LONG", params: { maxLength: 200 } });
  });

  it("reuses per-key English fallback, including interpolation", () => {
    const partial: { -readonly [K in keyof Dictionary]?: string } = ja;
    const saved = partial["errors.inputTooLong"];
    try {
      delete partial["errors.inputTooLong"];
      expect(getErrorMessage({ code: "INPUT_TOO_LONG", params: { maxLength: 200 } }, "ja"))
        .toBe("Use 200 characters or fewer.");
    } finally {
      partial["errors.inputTooLong"] = saved;
    }
  });

  it.each([
    undefined, null, "Research not found.", "NOT_FOUND", 42, {}, [],
    { code: "UNKNOWN" }, { code: "__proto__" }, { code: "constructor" },
    { code: "toString" }, { code: 42 }, { code: null },
  ])("uses a safe generic message for unknown input %j", (error) => {
    expect(getErrorMessage(error)).toBe("Something went wrong. Please try again.");
    expect(getErrorMessage(error, "ja")).toBe("エラーが発生しました。もう一度お試しください。");
  });

  it.each([
    undefined, null, {}, { maxLength: "DB private diagnostic" },
    { maxLength: 0 }, { maxLength: -1 }, { maxLength: 1.5 },
    { maxLength: NaN }, { maxLength: Infinity }, { maxLength: Number.MAX_SAFE_INTEGER + 1 },
    { maxLength: { toString: () => "DB private diagnostic" } },
  ])("does not interpolate invalid parameters %j", (params) => {
    expect(getErrorMessage({ code: "INPUT_TOO_LONG", params }))
      .toBe("Something went wrong. Please try again.");
  });

  it("never reads exception or diagnostic text, even alongside a known code", () => {
    const diagnostics = {
      get message(): never { throw new Error("Private DB message was read"); },
      get cause(): never { throw new Error("Private DB cause was read"); },
      get stack(): never { throw new Error("Private DB stack was read"); },
    };
    Object.defineProperty(diagnostics, "code", { value: "INTERNAL_ERROR" });
    expect(getErrorMessage(diagnostics)).toBe("Something went wrong. Please try again.");
    expect(getErrorMessage(new Error("SELECT secret FROM private_table"), "ja"))
      .toBe("エラーが発生しました。もう一度お試しください。");
    expect(getErrorMessage({ code: "23505", detail: "Private constraint and row data" }))
      .toBe("Something went wrong. Please try again.");
    expect(getErrorMessage({
      code: "INPUT_TOO_LONG",
      message: "Private exception",
      params: { maxLength: 200, detail: "Private row data", message: "Private DB error" },
    }, "ja")).toBe("200文字以内で入力してください。");
  });
});
