const SOURCE_CITATION_PATTERN = /\[source:([^\]\s]+)\]/g;

const FULLWIDTH_SOURCE_CITATION_PATTERN = /【source:([^\s【】\[\]]+)】/g;

const NON_BREAKING_HYPHEN_PATTERN = /\u2011/g;

const NORMALIZABLE_SOURCE_CITATION_PATTERN =
  /\[[ \t]*source:([^\]\s]+)[ \t]*\]/g;

export function normalizeSourceCitationMarkers(content: string): string {
  const normalizedBrackets = content.replace(
    FULLWIDTH_SOURCE_CITATION_PATTERN,
    (_match, sourceId: string) => `[source:${sourceId}]`,
  );

  return normalizedBrackets.replace(
    NORMALIZABLE_SOURCE_CITATION_PATTERN,
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
