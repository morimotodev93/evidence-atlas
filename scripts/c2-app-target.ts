import { parse } from "dotenv";
import { join } from "node:path";
import {
  requireAllowedKeys,
  validateC2Target,
} from "../src/lib/c2/database-target.ts";

export const C2_ORIGIN = "http://localhost:3001";
const OAUTH_KEYS = ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"];
const OS_KEYS = new Set([
  "PATH",
  "PATHEXT",
  "SYSTEMROOT",
  "WINDIR",
  "COMSPEC",
  "TEMP",
  "TMP",
  "TMPDIR",
  "HOME",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "LANG",
  "LC_ALL",
  "TZ",
]);
const STANDARD_ENV_FILES = [
  ".env.development.local",
  ".env.local",
  ".env.development",
  ".env",
];

type Inputs = {
  root: string;
  args: readonly string[];
  execArgv: readonly string[];
  inherited: Record<string, string | undefined>;
  readText: (path: string) => string | undefined;
};

export function parseDedicated(text: string | undefined): Record<string, string> {
  if (text === undefined)
    throw new Error("Required dedicated C2 configuration file is missing.");
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (!match || seen.has(match[1]))
      throw new Error("Malformed dedicated C2 configuration.");
    const rawValue = line.slice(match[0].length).trim();
    if (/^['"`]/.test(rawValue) && !/^(['"`]).*\1\s*(?:#.*)?$/.test(rawValue)) {
      throw new Error("Malformed dedicated C2 configuration.");
    }
    seen.add(match[1]);
  }
  return parse(text);
}

export function prepareC2App(input: Inputs) {
  if (input.args.length) throw new Error("C2 launcher accepts no arguments.");
  const inherited = Object.fromEntries(
    Object.entries(input.inherited).map(([key, value]) => [
      key.toUpperCase(),
      value,
    ]),
  );
  if (
    inherited.NODE_OPTIONS?.trim() ||
    inherited.NODE_PATH?.trim() ||
    input.execArgv.some((arg) =>
      /^-r|^--(?:require|import|(?:experimental-)?loader)(?:=|$)/.test(arg),
    )
  ) {
    throw new Error("C2 launcher refuses inherited Node preload settings.");
  }
  const conflicts = [
    "AUTH_TRUST_HOST",
    "AUTH_REDIRECT_PROXY_URL",
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "AUTH_SECRET_1",
    "AUTH_SECRET_2",
    "AUTH_SECRET_3",
    "AUTH_GOOGLE_ISSUER",
  ];
  if (
    conflicts.some((key) => inherited[key]) ||
    (inherited.AUTH_URL && inherited.AUTH_URL !== C2_ORIGIN) ||
    (inherited.PORT && inherited.PORT !== "3001") ||
    (inherited.HOST && inherited.HOST !== "127.0.0.1") ||
    (inherited.C2_RUNTIME_MODE && inherited.C2_RUNTIME_MODE !== "local") ||
    (inherited.PUBLIC_DEMO_MODE && inherited.PUBLIC_DEMO_MODE !== "false")
  ) {
    throw new Error("Conflicting C2 origin, host or authentication settings.");
  }
  const dbPath = join(input.root, ".env.c2.local");
  const db = parseDedicated(input.readText(dbPath));
  const databaseUrl = validateC2Target(db);
  const oauth = parseDedicated(
    input.readText(join(input.root, ".env.c2.auth.local")),
  );
  requireAllowedKeys(oauth, OAUTH_KEYS);
  if (
    OAUTH_KEYS.some(
      (key) =>
        !oauth[key]?.trim() ||
        oauth[key] !== oauth[key].trim() ||
        /[\r\n\0]/.test(oauth[key]),
    ) ||
    oauth.AUTH_SECRET.length < 32 ||
    !/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(
      oauth.AUTH_GOOGLE_ID,
    )
  ) {
    throw new Error("Invalid or missing dedicated C2 OAuth credentials.");
  }
  const osEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.inherited)) {
    if (OS_KEYS.has(key.toUpperCase()) && value !== undefined)
      osEnv[key.toUpperCase()] = value;
  }
  const env: Record<string, string> = {};
  const names = new Map<string, string>();
  const reserved = new Set([
    ...Object.keys(osEnv),
    ...Object.keys(db),
    ...OAUTH_KEYS,
    "DATABASE_URL",
    "C2_RUNTIME_MODE",
    "AUTH_URL",
    "PUBLIC_DEMO_MODE",
    "NEXT_TELEMETRY_DISABLED",
    "NEXT_PRIVATE_DISABLE_DEV_OVERLAY_UX",
    "NODE_ENV",
    "NODE_OPTIONS",
    "NODE_PATH",
    "DOTENV_CONFIG_PATH",
    "DOTENV_CONFIG_QUIET",
    "PORT",
    "DOTENV_CONFIG_OVERRIDE",
    "DOTENV_OVERRIDE",
  ]);
  // @next/env only fills keys absent from its initial process environment.
  // Shadow ALL discovered keys, including unknown public credentials/preloads.
  // Rebuild the approved configuration afterward. Never copy their values.
  for (const file of STANDARD_ENV_FILES) {
    const text = input.readText(join(input.root, file));
    if (text !== undefined)
      for (const key of Object.keys(parse(text))) {
        const upper = key.toUpperCase();
        if (
          (names.has(upper) && names.get(upper) !== key) ||
          (reserved.has(upper) && key !== upper)
        ) {
          throw new Error(
            "Ambiguous case variants in standard environment configuration.",
          );
        }
        names.set(upper, key);
        env[key] = "";
      }
  }
  Object.assign(env, osEnv, db, oauth, {
    DATABASE_URL: databaseUrl,
    C2_RUNTIME_MODE: "local",
    AUTH_URL: C2_ORIGIN,
    PUBLIC_DEMO_MODE: "false",
    NEXT_TELEMETRY_DISABLED: "1",
    // Developer overlay fonts/endpoints are outside the C2 test surface.
    // Disable the overlay at its source; HMR and application hydration remain.
    NEXT_PRIVATE_DISABLE_DEV_OVERLAY_UX: "1",
    NEXT_PUBLIC_SENTRY_DSN: "",
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: "0",
    SENTRY_AUTH_TOKEN: "",
    SENTRY_ORG: "",
    SENTRY_PROJECT: "",
    NODE_ENV: "development",
    NODE_OPTIONS: "",
    NODE_PATH: "",
    DOTENV_CONFIG_PATH: dbPath,
    DOTENV_CONFIG_QUIET: "true",
    PORT: "3001",
  });
  // Empty shadow values prevent Next from restoring these; never use "false".
  env.DOTENV_CONFIG_OVERRIDE = "";
  env.DOTENV_OVERRIDE = "";
  const childEnv: Record<string, string> & { NODE_ENV: "development" } = {
    ...env,
    NODE_ENV: "development",
  };
  return {
    env: childEnv,
    args: ["dev", "--hostname", "127.0.0.1", "--port", "3001"],
  };
}
