export const supportedLocales = ["en", "ja"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return supportedLocales.some((locale) => locale === value);
}

// Exact locale codes only; URL/browser preference negotiation belongs to routing.
export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale;
}
