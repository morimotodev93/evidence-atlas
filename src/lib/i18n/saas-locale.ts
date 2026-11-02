import "server-only";

import { cookies } from "next/headers";

import { resolveLocale, type Locale } from "./locales";

export const SAAS_LOCALE_COOKIE = "evidence_atlas_locale";

export async function getSaasLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(SAAS_LOCALE_COOKIE)?.value);
}
