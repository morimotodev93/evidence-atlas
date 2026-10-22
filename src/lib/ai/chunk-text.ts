const TARGET_CHUNK_TOKENS = 768;
const CHUNK_OVERLAP_TOKENS = 96;

// Conservative local approximation for Gemini text token counts.
// ASCII text is estimated at roughly 1 token per 3 characters.
// Non-ASCII text, including Japanese/CJK, is estimated more conservatively.
// Count sixths of a token to avoid rounding drift from repeated 1/3 addition.
const TOKEN_SCALE = 6;
const ASCII_TOKEN_UNITS = 2;
const NON_ASCII_TOKEN_UNITS = 9;

export function chunkText(text: string): string[] {
  const normalized = text.trim();

  if (!normalized) {
    return [];
  }

  if (estimateTokenCount(normalized) <= TARGET_CHUNK_TOKENS) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = findChunkEnd(normalized, start);
    const chunk = normalized.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) {
      break;
    }

    const overlapStart = findOverlapStart(
      normalized,
      start,
      end,
      CHUNK_OVERLAP_TOKENS,
    );

    start = Math.max(nextCodePointIndex(normalized, start), overlapStart);
  }

  return chunks;
}

export function estimateTokenCount(text: string): number {
  let tokenUnits = 0;

  for (const char of text) {
    tokenUnits +=
      char.charCodeAt(0) <= 127 ? ASCII_TOKEN_UNITS : NON_ASCII_TOKEN_UNITS;
  }

  return Math.ceil(tokenUnits / TOKEN_SCALE);
}

function nextCodePointIndex(text: string, index: number): number {
  return index + (text.codePointAt(index)! > 0xffff ? 2 : 1);
}

function findChunkEnd(text: string, start: number): number {
  let tokenUnits = 0;
  let lastParagraphBoundary = -1;
  let lastSentenceBoundary = -1;

  for (
    let index = start;
    index < text.length;
    index = nextCodePointIndex(text, index)
  ) {
    const char = text[index];

    tokenUnits +=
      char.charCodeAt(0) <= 127 ? ASCII_TOKEN_UNITS : NON_ASCII_TOKEN_UNITS;

    if (char === "\n" && text[index + 1] === "\n") {
      lastParagraphBoundary = index + 2;
    }

    if (isSentenceBoundary(char)) {
      lastSentenceBoundary = index + 1;
    }

    if (tokenUnits >= TARGET_CHUNK_TOKENS * TOKEN_SCALE) {
      if (lastParagraphBoundary > start) {
        return lastParagraphBoundary;
      }

      if (lastSentenceBoundary > start) {
        return lastSentenceBoundary;
      }

      return nextCodePointIndex(text, index);
    }
  }

  return text.length;
}

function findOverlapStart(
  text: string,
  chunkStart: number,
  chunkEnd: number,
  overlapTokens: number,
): number {
  let tokenUnits = 0;

  for (let index = chunkEnd; index > chunkStart; ) {
    index--;
    // Consume a valid surrogate pair together when walking backwards.
    if (
      index > chunkStart &&
      text.charCodeAt(index) >= 0xdc00 &&
      text.charCodeAt(index) <= 0xdfff &&
      text.charCodeAt(index - 1) >= 0xd800 &&
      text.charCodeAt(index - 1) <= 0xdbff
    ) {
      index--;
    }
    const char = text[index];

    tokenUnits +=
      char.charCodeAt(0) <= 127 ? ASCII_TOKEN_UNITS : NON_ASCII_TOKEN_UNITS;

    if (tokenUnits >= overlapTokens * TOKEN_SCALE) {
      return index;
    }
  }

  return chunkStart;
}

function isSentenceBoundary(char: string): boolean {
  return (
    char === "." ||
    char === "!" ||
    char === "?" ||
    char === "。" ||
    char === "！" ||
    char === "？"
  );
}
