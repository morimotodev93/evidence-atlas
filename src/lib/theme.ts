export const THEME_STORAGE_KEY = "theme";

export function isTheme(value: unknown): value is "light" | "dark" | "system" {
  return value === "light" || value === "dark" || value === "system";
}

// Run before next-themes' first-paint script and client initialization. Old or
// malformed preferences must not become DOM classes or prevent system fallback.
export const themeStorageScript = `(()=>{try{const t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!==null&&t!=="light"&&t!=="dark"&&t!=="system")localStorage.removeItem("${THEME_STORAGE_KEY}")}catch{}})();`;
