"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect, type ReactNode } from "react";

import { isTheme, THEME_STORAGE_KEY } from "@/lib/theme";

const themeClasses: Record<string, string> = Object.assign(Object.create(null), {
  light: "light", dark: "dark",
});

function ValidatePreference() {
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    // Also handle invalid preferences received through cross-tab storage events.
    if (theme !== undefined && !isTheme(theme)) setTheme("system");
  }, [theme, setTheme]);
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      storageKey={THEME_STORAGE_KEY}
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      value={themeClasses}
    >
      <ValidatePreference />
      {children}
    </NextThemesProvider>
  );
}
