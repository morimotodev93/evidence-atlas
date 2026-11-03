"use client";

import { usePathname } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";

import { isLocale, type Locale } from "@/lib/i18n/locales";
import { setSaasLocale } from "@/lib/i18n/set-saas-locale";
import { translate } from "@/lib/i18n/translate";

export function SaasLanguageSelect({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const id = useId();
  const [selection, setSelection] = useState<Locale | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);
  // Home has no draft forms or AI panel. All other routes fail closed until
  // their input/stream preservation has been verified in a real Next.js app.
  const allowed = pathname === "/";
  const reason = translate("nav.languageRestriction", locale);

  return <div className="flex max-w-full flex-wrap items-center gap-2 text-sm" aria-busy={pending}>
    <label htmlFor={id} className="text-xs text-muted-foreground">{translate("demo.language", locale)}</label>
    <select id={id} value={selection ?? locale} disabled={!allowed || pending}
      aria-describedby={!allowed ? `${id}-restriction` : error ? `${id}-error` : undefined}
      title={!allowed ? reason : undefined}
      className="h-9 max-w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
      onChange={(event) => {
        const next = event.target.value;
        if (!allowed || pending || saving.current || !isLocale(next) || next === locale) return;
        saving.current = true;
        setSelection(next);
        setError(null);
        startTransition(async () => {
          try {
            // Cookie mutation returns updated Server Component props. No URL
            // navigation, document reload or additional refresh is needed.
            await setSaasLocale(next);
          } catch {
            setError(translate("nav.languageSaveError", locale));
          } finally {
            setSelection(null);
            saving.current = false;
          }
        });
      }}>
      <option value="en" lang="en">English</option>
      <option value="ja" lang="ja">日本語</option>
    </select>
    {!allowed && <span id={`${id}-restriction`} title={reason} className="text-xs text-muted-foreground">
      <span aria-hidden="true">{translate("nav.homeOnly", locale)}</span><span className="sr-only">{reason}</span>
    </span>}
    {error && <span id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</span>}
  </div>;
}
