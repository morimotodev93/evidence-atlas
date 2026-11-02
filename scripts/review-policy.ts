import { parse } from "dotenv";
import { validateReviewUrl } from "../src/lib/review/database-target.ts";

export const REVIEW_DATABASE = "evidence_atlas_review";
export const REVIEW_ROLE = "evidence_atlas_review";
export const REVIEW_PORT = 3100;

export function reviewConfig(text: string) {
  const config = parse(text);
  if (Object.keys(config).some((key) => !["REVIEW_DATABASE_URL", "REVIEW_AUTH_SECRET"].includes(key))) {
    throw new Error("Review config permits only REVIEW_DATABASE_URL and REVIEW_AUTH_SECRET.");
  }
  const url = new URL(validateReviewUrl(config.REVIEW_DATABASE_URL));
  if (!/^[a-f0-9]{64}$/.test(config.REVIEW_AUTH_SECRET ?? "")) throw new Error("Missing dedicated REVIEW_AUTH_SECRET.");
  return { url: url.href, password: url.password, authSecret: config.REVIEW_AUTH_SECRET };
}

export function reviewEnvironment(config: ReturnType<typeof reviewConfig>, inherited: NodeJS.ProcessEnv) {
  // Only OS necessities are inherited. Next's loader preserves explicit process
  // values; reserve every key found in its dotenv files in the launcher as well.
  const env: NodeJS.ProcessEnv = { NODE_ENV: "development" };
  for (const [key, value] of Object.entries(inherited)) {
    if (/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|HOME|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|NUMBER_OF_PROCESSORS)$/i.test(key)) env[key] = value;
  }
  return Object.assign(env, {
    DATABASE_URL: config.url,
    PUBLIC_DEMO_MODE: "false",
    AUTH_SECRET: config.authSecret,
    AUTH_URL: `http://127.0.0.1:${REVIEW_PORT}`,
    AUTH_TRUST_HOST: "true",
    REVIEW_RUNTIME_MODE: "local",
    DOTENV_CONFIG_PATH: ".env.review.local",
    DOTENV_CONFIG_QUIET: "true",
    NEXT_TELEMETRY_DISABLED: "1",
    PRISMA_DISABLE_TELEMETRY: "1",
    DO_NOT_TRACK: "1",
  });
}
