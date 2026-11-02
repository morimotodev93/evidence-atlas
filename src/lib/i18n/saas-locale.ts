import "server-only";

import { cookies } from "next/headers";

import { resolveLocale, type Locale } from "./locales";

export async function getSaasLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get("evidence_atlas_locale")?.value);
}
