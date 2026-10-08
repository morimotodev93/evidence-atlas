import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Tests run on the server; Next.js supplies this alias in application builds.
      "server-only": "next/dist/compiled/server-only/empty.js",
    },
  },
});
