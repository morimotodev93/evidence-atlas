import { describe, expect, it } from "vitest";

import { researchSchema } from "@/types/research";
import { commentSchema } from "./comment";
import { conclusionSchema } from "./conclusion";
import { findingSchema } from "./finding";
import { sourceSchema } from "./source";
import { researchStatusSchema } from "./status";
import { tagSchema } from "./tag";

// These are the existing field contracts, including the two fields that allow
// empty strings. Action-specific null/newline conversion is tested separately.
const textFields = [
  { name: "Research title", schema: researchSchema.shape.title, max: 200, empty: false, nullable: false },
  { name: "Research description", schema: researchSchema.shape.description, max: 2000, empty: true, nullable: true },
  { name: "Source title", schema: sourceSchema.shape.title, max: 200, empty: false, nullable: false },
  { name: "Finding content", schema: findingSchema.shape.content, max: 10000, empty: false, nullable: false },
  { name: "Comment content", schema: commentSchema.shape.content, max: 5000, empty: false, nullable: false },
  { name: "Tag name", schema: tagSchema.shape.name, max: 50, empty: false, nullable: false },
  { name: "Conclusion", schema: conclusionSchema.shape.conclusion, max: 5000, empty: true, nullable: false },
];

describe.each(textFields)("$name schema", ({ schema, max, empty, nullable }) => {
  it("requires the property even when its value may be empty or null", () => {
    expect(schema.safeParse(undefined).success).toBe(false);
  });

  it("preserves the field's null contract", () => {
    const result = schema.safeParse(null);
    expect(result.success).toBe(nullable);
    if (result.success) expect(result.data).toBeNull();
  });

  it.each(["", " \t\r\n\u3000 "])("handles empty/whitespace input %j", (value) => {
    const result = schema.safeParse(value);
    expect(result.success).toBe(empty);
    if (result.success) expect(result.data).toBe("");
  });

  it("accepts a single character", () => {
    expect(schema.parse("x")).toBe("x");
  });

  it.each([-1, 0])("accepts max length plus %i", (offset) => {
    const value = "x".repeat(max + offset);
    expect(schema.parse(value)).toBe(value);
  });

  it("rejects one character over the limit", () => {
    const result = schema.safeParse("x".repeat(max + 1));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].code).toBe("too_big");
  });

  it("trims before checking length and preserves internal newlines", () => {
    expect(schema.parse(` \t${"x".repeat(max)}\r\n `)).toBe("x".repeat(max));
    expect(schema.parse(" \tfirst\r\nsecond\rthird\nlast \t")).toBe("first\r\nsecond\rthird\nlast");
  });

  it("preserves installed Zod 4.6.5's supplementary-character counting", () => {
    // The installed max-length check counts code points, not UTF-16 units.
    // Characterize that implementation; do not impose a new app-level counter.
    const value = "😀".repeat(max);
    expect(value.length).toBe(max * 2);
    expect(schema.parse(value)).toBe(value);
    expect(schema.safeParse(`${value}x`).success).toBe(false);
  });

  it.each([{ value: 42 }, { value: {} }, { value: [] }])("rejects non-string schema input (case %#)", ({ value }) => {
    expect(schema.safeParse(value).success).toBe(false);
  });
});

describe("Source URL schema", () => {
  const schema = sourceSchema.shape.url;

  it.each([undefined, null, "", " \t ", "example.com", "/relative", "https://", "https://exa mple.com"])(
    "rejects invalid URL %j", (value) => {
      expect(schema.safeParse(value).success).toBe(false);
    },
  );

  it.each(["https://example.com/path?q=value#section", "http://localhost:3000", "ftp://example.com/file", "mailto:person@example.com"])(
    "retains the existing z.url acceptance of %s", (value) => {
      expect(schema.parse(value)).toBe(value);
    },
  );

  it("trims URL whitespace without canonicalizing the stored spelling", () => {
    expect(schema.parse(" \tHTTPS://EXAMPLE.COM:443/a \r\n")).toBe("HTTPS://EXAMPLE.COM:443/a");
  });

  it.each([-1, 0, 1])("checks the 2048-character limit plus %i", (offset) => {
    const prefix = "https://example.com/";
    const value = prefix + "a".repeat(2048 + offset - prefix.length);
    const result = schema.safeParse(value);
    expect(result.success).toBe(offset <= 0);
    if (result.success) expect(result.data).toBe(value);
    else expect(result.error.issues[0].code).toBe("too_big");
  });
});

describe("Research status schema", () => {
  it.each(["IN_PROGRESS", "COMPLETED", "ARCHIVED"])("accepts %s", (value) => {
    expect(researchStatusSchema.parse(value)).toBe(value);
  });

  it.each([undefined, null, "", " ", "completed", " COMPLETED ", "DELETED", 1])(
    "rejects %j without trimming or coercion", (value) => {
      expect(researchStatusSchema.safeParse(value).success).toBe(false);
    },
  );
});

it("does not make nullable Research description optional", () => {
  expect(researchSchema.safeParse({ title: "Research" }).success).toBe(false);
  expect(researchSchema.parse({ title: " Research ", description: null })).toEqual({
    title: "Research", description: null,
  });
});
