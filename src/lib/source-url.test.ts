import { describe, expect, it } from "vitest";
import { safeSourceHref } from "./source-url";

describe("safeSourceHref", () => {
  it.each([
    ["https://example.com/path", "https://example.com/path"],
    ["http://example.com", "http://example.com/"],
    ["http://localhost:3000", "http://localhost:3000/"],
    ["HTTP://EXAMPLE.COM:80/Path?q=Value#Part", "http://example.com/Path?q=Value#Part"],
    ["hTtPs://EXAMPLE.COM:443/Path", "https://example.com/Path"],
    ["  https://example.com/path  ", "https://example.com/path"],
    ["https://example.com/a b", "https://example.com/a%20b"],
    ["http://127.0.0.1", "http://127.0.0.1/"],
    ["http://[::1]:3000", "http://[::1]:3000/"],
  ])("allows and normalizes %s", (value, expected) => {
    expect(safeSourceHref(value)).toBe(expected);
  });

  it.each([
    "javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<h1>test</h1>",
    "vbscript:msgbox(1)", "file:///tmp/source", "blob:https://example.com/id",
    "ftp://example.com/file", "mailto:person@example.com", "/relative",
    "//example.com", "", " \t\r\n ", "not a URL", "https://", "http://[invalid]",
    "https://exa mple.com", "https://example.com:invalid",
  ])("rejects %j", (value) => {
    expect(safeSourceHref(value)).toBeNull();
  });

  const malformedValues: unknown[] = [
    null, undefined, 42, true, [], {}, Symbol("url"),
    { toString() { throw new Error("Do not coerce untrusted values"); } },
  ];
  it.each(malformedValues.map((value) => ({ value })))("rejects malformed non-string input %# without coercion or exceptions", ({ value }) => {
    expect(safeSourceHref(value)).toBeNull();
  });
});
