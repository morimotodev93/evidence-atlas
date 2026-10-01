const SOURCE_CITATION_PATTERN = /\[source:([^\]\s]+)\]/g;

export function parseSourceCitations(content: string) {
  const sourceIds: string[] = [];

  const text = content
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
  return content.replace(SOURCE_CITATION_PATTERN, (marker, sourceId: string) =>
    allowedSourceIds.has(sourceId) ? marker : "",
  );
}
