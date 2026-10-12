import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { resolve } from "node:path";
import { isC2Runtime } from "./src/lib/c2/service-policy.ts";

const c2 = isC2Runtime();
const c2Aliases = {
  "@/lib/app-font": "./src/lib/c2/app-font.ts",
  "@sentry/nextjs": "./src/lib/c2/sentry-disabled.ts",
  "@/lib/observability/sentry-config": "./src/lib/c2/sentry-disabled.ts",
};

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(c2 ? {
    distDir: ".next-c2",
    typescript: { tsconfigPath: "tsconfig.c2.json" },
    turbopack: { resolveAlias: c2Aliases },
    webpack(config) {
      config.resolve ??= {};
      config.resolve.alias = { ...config.resolve.alias,
        ...Object.fromEntries(Object.entries(c2Aliases).map(([key, file]) => [`${key}$`, resolve(file)])),
      };
      return config;
    },
  } satisfies Partial<NextConfig> : {}),
};

export default c2 ? nextConfig : withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  buildTimeInstrumentation: false,
  telemetry: false,

  silent: !process.env.CI,

  widenClientFileUpload: true,

  webpack: {
    automaticVercelMonitors: false,

    treeshake: {
      removeDebugLogging: true,
    },
  },
});
