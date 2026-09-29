const TARGET_CHUNK_TOKENS = 768;
const CHUNK_OVERLAP_TOKENS = 96;

// Conservative local approximation for Gemini text token counts.
// ASCII text is estimated at roughly 1 token per 3 characters.
// Non-ASCII text, including Japanese/CJK, is estimated more conservatively.
const ASCII_TOKEN_WEIGHT = 1 / 3;
const NON_ASCII_TOKEN_WEIGHT = 1.5;

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

    start = Math.max(start + 1, overlapStart);
  }

  return chunks;
}

export function estimateTokenCount(text: string): number {
  let tokens = 0;

  for (const char of text) {
    tokens +=
      char.charCodeAt(0) <= 127 ? ASCII_TOKEN_WEIGHT : NON_ASCII_TOKEN_WEIGHT;
  }

  return Math.ceil(tokens);
}

function findChunkEnd(text: string, start: number): number {
  let estimatedTokens = 0;
  let lastParagraphBoundary = -1;
  let lastSentenceBoundary = -1;

  for (let index = start; index < text.length; index++) {
    const char = text[index];

    estimatedTokens +=
      char.charCodeAt(0) <= 127 ? ASCII_TOKEN_WEIGHT : NON_ASCII_TOKEN_WEIGHT;

    if (char === "\n" && text[index + 1] === "\n") {
      lastParagraphBoundary = index + 2;
    }

    if (isSentenceBoundary(char)) {
      lastSentenceBoundary = index + 1;
    }

    if (estimatedTokens >= TARGET_CHUNK_TOKENS) {
      if (lastParagraphBoundary > start) {
        return lastParagraphBoundary;
      }

      if (lastSentenceBoundary > start) {
        return lastSentenceBoundary;
      }

      return index + 1;
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
  let estimatedTokens = 0;

  for (let index = chunkEnd - 1; index > chunkStart; index--) {
    const char = text[index];

    estimatedTokens +=
      char.charCodeAt(0) <= 127 ? ASCII_TOKEN_WEIGHT : NON_ASCII_TOKEN_WEIGHT;

    if (estimatedTokens >= overlapTokens) {
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
