import type { Locale } from "./i18n/locales";

export function formatDate(date: Temporal.Instant, locale: Locale = "en") {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(Number(date.epochMilliseconds)));
}
