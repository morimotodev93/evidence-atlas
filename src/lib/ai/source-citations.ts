const SOURCE_CITATION_PATTERN = /\[source:([^\]\s]+)\]/g;

const FULLWIDTH_SOURCE_CITATION_PATTERN = /【source:([^\s【】\[\]]+)】/g;

const NON_BREAKING_HYPHEN_PATTERN = /\u2011/g;

export function normalizeSourceCitationMarkers(content: string): string {
  // 1. 日本語括弧を標準形式に変更
  const normalizedBrackets = content.replace(
    FULLWIDTH_SOURCE_CITATION_PATTERN,
    (_match, sourceId: string) => `[source:${sourceId}]`,
  );

  // 2. Citation内部のNon-breaking Hyphenだけを変換
  return normalizedBrackets.replace(
    SOURCE_CITATION_PATTERN,
    (_match, sourceId: string) =>
      `[source:${sourceId.replace(NON_BREAKING_HYPHEN_PATTERN, "-")}]`,
  );
}

export function parseSourceCitations(content: string) {
  const sourceIds: string[] = [];

  const normalized = normalizeSourceCitationMarkers(content);

  const text = normalized
    .replace(SOURCE_CITATION_PATTERN, (_match, sourceId: string) => {
      sourceIds.push(sourceId);
      return "";
    })
    .replace(/\s+([.,!?。、！？])/g, "$1")
    .trim();

  return {
    text: text.trim(),
    sourceIds: [...new Set(sourceIds)],
  };
}

export function validateSourceCitations(
  content: string,
  allowedSourceIds: ReadonlySet<string>,
) {
  const normalized = normalizeSourceCitationMarkers(content);

  return normalized.replace(
    SOURCE_CITATION_PATTERN,
    (marker, sourceId: string) =>
      allowedSourceIds.has(sourceId) ? marker : "",
  );
}
