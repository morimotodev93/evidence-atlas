export function validateReviewUrl(value: string | undefined): string {
  let url: URL;
  try { url = new URL(value ?? ""); } catch { throw new Error("Missing/invalid explicit review database URL."); }
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" ||
      url.port !== "5432" || url.pathname !== "/evidence_atlas_review" ||
      url.username !== "evidence_atlas_review" || !/^[a-f0-9]{64}$/.test(url.password) ||
      url.search || url.hash || value !== url.href) {
    throw new Error("Review target refused: expected explicit loopback:5432 review database/role.");
  }
  return url.href;
}
