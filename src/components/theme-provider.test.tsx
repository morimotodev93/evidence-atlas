import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { themeStorageScript } from "@/lib/theme";
import { ThemeProvider } from "./theme-provider";

describe("Root theme provider", () => {
  it.each([null, "light", "dark", "system", "old", "dark light", ""])("restores %s safely before first paint in either OS scheme", (saved) => {
    for (const osDark of [false, true]) {
      let stored = saved;
      const classes = new Set(["font-existing", "antialiased"]);
      const element = { classList: {
        remove: (...values: string[]) => values.forEach((value) => classes.delete(value)),
        add: (value: string) => { if (/\s/.test(value)) throw new Error("Invalid class"); classes.add(value); },
      }, style: { colorScheme: "" } };
      const context = {
        localStorage: { getItem: () => stored, removeItem: () => { stored = null; } },
        document: { documentElement: element },
        window: { matchMedia: () => ({ matches: osDark }) },
      };
      runInNewContext(themeStorageScript, context);
      // Exercise the installed library's actual SSR bootstrap, not a copy.
      const html = renderToStaticMarkup(<ThemeProvider><main>Content</main></ThemeProvider>);
      const bootstrap = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1];
      runInNewContext(bootstrap, context);
      const expected = saved === "light" || saved === "dark" ? saved : osDark ? "dark" : "light";
      expect(classes).toEqual(new Set(["font-existing", "antialiased", expected]));
      expect(element.style.colorScheme).toBe(expected);
      expect(html).toContain("Content");
    }
  });

  it("tolerates unavailable browser storage", () => {
    expect(() => runInNewContext(themeStorageScript, {
      localStorage: { getItem: () => { throw new Error("Storage blocked"); } },
    })).not.toThrow();
  });
});
