import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "e2e/**", "e2e-c2/**", "build/**"],
    // Auth.js uses extensionless Next.js imports supplied by the app bundler.
    // Transform this package so offline tests can exercise its real handlers.
    server: { deps: { inline: ["next-auth"] } },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Tests run on the server; Next.js supplies this alias in application builds.
      "server-only": "next/dist/compiled/server-only/empty.js",
    },
  },
});
