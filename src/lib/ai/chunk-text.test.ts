import { describe, expect, it } from "vitest";

import { chunkText, estimateTokenCount } from "./chunk-text";

it("does not split the surrogate pairs in the reported ASCII/emoji input", () => {
  const text = "aaaaa" + String.fromCodePoint(0x1f600).repeat(600);
  const chunks = chunkText(text);
  for (const chunk of chunks) {
    expect(chunk).not.toMatch(/[\uD800-\uDBFF]$/);
    expect(chunk).not.toMatch(/^[\uDC00-\uDFFF]/);
  }
  expect(chunks).toEqual([text.slice(0, 1027), text.slice(899)]);
});

describe("Unicode code point boundaries", () => {
  const emoji = String.fromCodePoint(0x1f600);
  const symbols = Array.from({ length: 1400 }, (_, index) => String.fromCodePoint(0x1f300 + index));

  function expectIntactChunks(text: string, checkOverlap: boolean) {
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.length).toBeLessThan(Array.from(text).length);
    let previousStart = -1;
    let previousChunk = "";
    let coveredEnd = 0;
    let reconstructed = "";
    for (const chunk of chunks) {
      expect(chunk.length).toBeGreaterThan(0);
      expect(chunk).not.toMatch(/[\uD800-\uDBFF]$/);
      expect(chunk).not.toMatch(/^[\uDC00-\uDFFF]/);
      // Inspect every code point, including internal boundaries.
      expect(Array.from(chunk).some((char) => {
        const codePoint = char.codePointAt(0)!;
        return codePoint >= 0xd800 && codePoint <= 0xdfff;
      })).toBe(false);
      // Trimming can yield the same chunk as the cursor crosses newlines.
      const start = chunk === previousChunk
        ? previousStart
        : text.indexOf(chunk, previousStart + 1);
      expect(start).toBeGreaterThanOrEqual(Math.max(0, previousStart));
      expect(text.slice(coveredEnd, start).trim()).toBe("");
      if (previousStart >= 0 && checkOverlap) {
        expect(start).toBeLessThan(coveredEnd);
        const overlapTokens = estimateTokenCount(text.slice(start, coveredEnd));
        // The last whole code point can overshoot 96 by less than 1.5 tokens.
        expect(overlapTokens).toBeGreaterThanOrEqual(96);
        expect(overlapTokens).toBeLessThanOrEqual(98);
      }
      reconstructed += chunk.slice(Math.max(0, coveredEnd - start));
      previousStart = start;
      previousChunk = chunk;
      coveredEnd = start + chunk.length;
    }
    expect(coveredEnd).toBe(text.length);
    expect(reconstructed.replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
    return chunks;
  }

  it.each([
    { label: "supplementary symbols including emoji", text: symbols.join("") },
    { label: "ASCII and emoji", text: symbols.map((char, index) => `word${index}_${char}`).join("") },
    { label: "Japanese and emoji", text: symbols.map((char, index) => `観測${index}_${char}`).join("") },
  ])("retains whole code points, overlap, body and finite progress for $label", ({ text }) => {
    expectIntactChunks(text, true);
  });

  it.each([
    { count: 511, tokens: 767, chunks: 1 },
    { count: 512, tokens: 768, chunks: 1 },
    { count: 513, tokens: 770, chunks: 2 },
  ])("aligns estimation and splitting for $count emoji", ({ count, tokens, chunks }) => {
    const text = emoji.repeat(count);
    expect(estimateTokenCount(text)).toBe(tokens);
    const result = chunkText(text);
    expect(result).toHaveLength(chunks);
    expect(result[0]).toBe(emoji.repeat(Math.min(count, 512)));
    if (chunks === 2) expect(result[1]).toBe(emoji.repeat(65));
  });

  it("advances by a whole code point when an early sentence leaves less than the requested overlap", () => {
    const text = `${symbols[0]}。${symbols.slice(1).join("")}`;
    const chunks = expectIntactChunks(text, false);
    expect(chunks[0]).toBe(`${symbols[0]}。`);
    expect(chunks[1]).toBe("。");
    expect(chunks[2]).toBe(text.slice(3, 1027));
  });

  it("keeps paragraph priority over a later sentence and preserves code points during fallback progress", () => {
    const prefix = `${symbols.slice(0, 20).join("")}.\n\n`;
    const text = `${prefix}${symbols.slice(20, 40).join("")}!${symbols.slice(40).join("")}`;
    const chunks = expectIntactChunks(text, false);
    expect(chunks[0]).toBe(prefix.trim());
  });
});

describe("chunkText offline boundaries", () => {
  it.each(["", " \t\r\n ", "　\n　"])("omits empty or whitespace input %j", (text) => {
    expect(chunkText(text)).toEqual([]);
  });

  it.each(["Short ASCII text", "日本語の短い本文です。"])("trims only surrounding whitespace for %s", (text) => {
    expect(chunkText(` \n${text}\t `)).toEqual([text]);
  });

  it.each([
    { label: "ASCII below", text: "a".repeat(2303), count: 1 },
    { label: "ASCII at", text: "a".repeat(2304), count: 1 },
    { label: "ASCII above", text: "a".repeat(2305), count: 2 },
    { label: "CJK below", text: "界".repeat(511), count: 1 },
    { label: "CJK at", text: "界".repeat(512), count: 1 },
    { label: "CJK above", text: "界".repeat(513), count: 2 },
  ])("splits $label the 768-token target", ({ text, count }) => {
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(count);
    expect(chunks[0]).toBe(text.slice(0, text.startsWith("a") ? 2304 : 512));
    expect(chunks.at(-1)?.endsWith(text.at(-1)!)).toBe(true);
  });

  const ascii = Array.from({ length: 1200 }, (_, index) => `word${String(index).padStart(4, "0")}_`).join("");
  const japanese = Array.from({ length: 2400 }, (_, index) => String.fromCharCode(0x4e00 + index)).join("");

  it.each([
    { label: "ASCII", text: ascii },
    { label: "Japanese", text: japanese },
    { label: "paragraph and sentence boundaries", text: `${ascii.slice(0, 900)}。\n\n${ascii.slice(900, 1800)}!${ascii.slice(1800)}` },
    { label: "early boundary with overlap longer than the first chunk", text: `。${japanese}` },
  ])("terminates with overlapping chunks and no missing body for $label", ({ text }) => {
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(2);
    // A finite representative progress bound; this is not a proof for all strings.
    expect(chunks.length).toBeLessThan(text.length);

    let previousStart = -1;
    let coveredEnd = 0;
    let reconstructed = "";
    for (const chunk of chunks) {
      expect(chunk.trim()).toBe(chunk);
      expect(chunk.length).toBeGreaterThan(0);
      const start = text.indexOf(chunk, previousStart + 1);
      expect(start).toBeGreaterThan(previousStart);
      // Boundary trim may remove whitespace, but never non-whitespace body.
      expect(text.slice(coveredEnd, start).trim()).toBe("");
      if (previousStart >= 0 && start < coveredEnd) {
        expect(chunk.slice(0, coveredEnd - start)).toBe(text.slice(start, coveredEnd));
      }
      if (previousStart >= 0 && (text === ascii || text === japanese)) {
        expect(start).toBeLessThan(coveredEnd);
        const overlapTokens = estimateTokenCount(text.slice(start, coveredEnd));
        expect(overlapTokens).toBeGreaterThanOrEqual(96);
        expect(overlapTokens).toBeLessThanOrEqual(97);
      }
      reconstructed += chunk.slice(Math.max(0, coveredEnd - start));
      previousStart = start;
      coveredEnd = start + chunk.length;
    }
    expect(coveredEnd).toBe(text.length);
    expect(reconstructed.replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
  });
});

describe("estimateTokenCount local approximation", () => {
  it.each([
    ["", 0], ["abc", 1], ["abcd", 2], ["日本語", 5], ["abc日", 3],
  ] as const)("estimates %j as %i", (text, expected) => {
    expect(estimateTokenCount(text)).toBe(expected);
  });

  it.each([
    { label: "ASCII below target", text: "a".repeat(2303), expected: 768 },
    { label: "ASCII above target", text: "a".repeat(2305), expected: 769 },
    { label: "mixed text at target", text: "abc日本".repeat(192), expected: 768 },
  ])("preserves the weighted estimate for $label", ({ text, expected }) => {
    expect(estimateTokenCount(text)).toBe(expected);
  });

  it("retains exactly 96 estimated tokens of ASCII overlap without an extra character", () => {
    const text = Array.from({ length: 700 }, (_, index) => `word${String(index).padStart(4, "0")}_`).join("");
    const chunks = chunkText(text);
    expect(chunks[0]).toBe(text.slice(0, 2304));
    expect(chunks[1]).toBe(text.slice(2016, 4320));
    expect(chunks[0].slice(-288)).toBe(chunks[1].slice(0, 288));
    expect(estimateTokenCount(chunks[0].slice(-288))).toBe(96);
  });

  it("does not round an exact 768-token ASCII boundary up to 769", () => {
    // Regression: repeated floating-point 1/3 addition previously produced 769.
    // Preserve the exact weighted boundary when changing the implementation.
    expect(estimateTokenCount("a".repeat(2304))).toBe(768);
  });
});
