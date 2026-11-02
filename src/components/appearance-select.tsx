"use client";

import { defaultLocale, type Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";

import { useTheme } from "next-themes";
import { useId, useSyncExternalStore } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const controlSize = "h-9 min-h-9 w-28 shrink-0";

export function AppearanceSelect({ className, locale = defaultLocale }: { className?: string; locale?: Locale }) {
  const options = (["light", "dark", "system"] as const).map((value) => ({ value, label: translate(`appearance.${value}`, locale) }));
  const labelId = useId();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);

  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-sm", className)}>
      <span id={labelId} className="text-xs text-muted-foreground">{translate("appearance.label", locale)}</span>
      {!mounted ? (
        // No form control exists for Firefox to restore before hydration.
        <span
          aria-hidden="true"
          data-slot="appearance-placeholder"
          className={cn("flex items-center rounded-lg border border-input px-2.5 text-sm text-muted-foreground", controlSize)}
        >
          {translate("appearance.theme", locale)}
        </span>
      ) : <Select
        items={options}
        value={mounted ? (isTheme(theme) ? theme : "system") : null}
        onValueChange={(value) => { if (isTheme(value)) setTheme(value); }}
        disabled={!mounted}
      >
        <SelectTrigger aria-labelledby={labelId} className={controlSize}>
          <SelectValue placeholder={translate("appearance.theme", locale)} />
        </SelectTrigger>
        <SelectContent align="start">
          {options.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>}
    </div>
  );
}
