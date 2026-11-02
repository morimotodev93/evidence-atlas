import { en, type Dictionary, type TranslationKey } from "./dictionaries/en";
import { ja } from "./dictionaries/ja";
import { defaultLocale, resolveLocale, type Locale } from "./locales";

const dictionaries: Readonly<Record<Locale, Partial<Dictionary>>> = { en, ja };

// No request/global language state: safe to use in both server and client code.
export function translate(key: TranslationKey, locale: unknown = defaultLocale): string {
  return dictionaries[resolveLocale(locale)][key] ?? en[key];
}
