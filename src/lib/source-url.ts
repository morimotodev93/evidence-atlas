/**
 * Render-only protocol allowlist. Uses WHATWG URL.href normalization (including
 * scheme/host casing and default ports); never rewrites the stored/displayed URL.
 * No network requests, hostname restrictions, or SSRF protection are involved.
 */
export function safeSourceHref(value: unknown): string | null {
  if (typeof value !== "string") return null;

  try {
    // No base: relative and protocol-relative URLs cannot resolve.
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}
