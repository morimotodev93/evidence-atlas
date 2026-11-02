import type { Metadata } from "next";
import { isLocale, type Locale } from "./locales";
import { translate } from "./translate";

export function demoPath(locale?: Locale, researchId?: string): string {
  return `${locale ? `/${locale}` : ""}/demo${researchId ? `/research/${encodeURIComponent(researchId)}` : ""}`;
}

// Only recognized Demo paths are switchable; never carry a foreign destination.
export function localizedDemoPath(pathname: string, locale: Locale): string {
  const match = pathname.match(/^\/(?:(en|ja)\/)?demo(\/research\/[^/]+)?\/?$/);
  return match ? `/${locale}/demo${match[2] ?? ""}` : demoPath(locale);
}

export function requireDemoLocale(value: string): Locale | null {
  return isLocale(value) ? value : null;
}

export function demoMetadata(locale: Locale, researchId?: string): Metadata {
  return {
    title: translate("demo.title", locale),
    description: translate("demo.description", locale),
    alternates: {
      canonical: demoPath(locale, researchId),
      languages: { en: demoPath("en", researchId), ja: demoPath("ja", researchId), "x-default": demoPath(undefined, researchId) },
    },
  };
}
