import { en, type Dictionary, type TranslationKey } from "./dictionaries/en";
import { ja } from "./dictionaries/ja";
import { defaultLocale, resolveLocale, type Locale } from "./locales";

const dictionaries: Readonly<Record<Locale, Partial<Dictionary>>> = { en, ja };

// No request/global language state: safe to use in both server and client code.
export function translate(key: TranslationKey, locale: unknown = defaultLocale, values: Readonly<Record<string, string | number>> = {}): string {
  return (dictionaries[resolveLocale(locale)][key] ?? en[key]).replace(/\{(\w+)\}/g,
    (placeholder, name: string) => Object.hasOwn(values, name) ? String(values[name]) : placeholder);
}
