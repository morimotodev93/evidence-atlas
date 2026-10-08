import "server-only";

import { notFound } from "next/navigation";

export function isPublicDemoMode() {
  const value = process.env.PUBLIC_DEMO_MODE?.trim();
  // Only empty/unset and the documented "false" opt into normal SaaS mode.
  // Unexpected non-empty values lock the application rather than reopening it.
  return value !== undefined && value !== "" && value !== "false";
}

export function requireApplicationEnabled() {
  if (isPublicDemoMode()) notFound();
}
