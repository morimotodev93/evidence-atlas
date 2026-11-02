"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import { localizedDemoPath } from "@/lib/i18n/demo-routes";
import { translate } from "@/lib/i18n/translate";

const ChatActivity = createContext({ busy: false, setBusy: (_busy: boolean) => {} });
export const useDemoChatActivity = () => useContext(ChatActivity);

export function DemoLanguageBoundary({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  return <ChatActivity.Provider value={{ busy, setBusy }}>{children}</ChatActivity.Provider>;
}

export function DemoLanguageSelect({ locale }: { locale: Locale }) {
  const { busy } = useDemoChatActivity();
  const id = useId();
  return <div className="flex max-w-full flex-wrap items-center gap-2 text-sm">
    <label htmlFor={id} className="text-xs text-muted-foreground">{translate("demo.language", locale)}</label>
    <select id={id} value={locale} disabled={busy}
      title={busy ? translate("demo.languageBusy", locale) : undefined}
      className="h-9 max-w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
      onChange={(event) => {
        const next = event.target.value;
        if (busy || !isLocale(next) || next === locale) return;
        window.location.assign(localizedDemoPath(window.location.pathname, next) + window.location.search + window.location.hash);
      }}>
      <option value="en" lang="en">English</option>
      <option value="ja" lang="ja">日本語</option>
    </select>
  </div>;
}
