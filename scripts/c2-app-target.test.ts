import { mkdtempSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { C2_ORIGIN, prepareC2App } from "./c2-app-target";

const database = "postgresql://c2_local:synthetic-db@127.0.0.1:5433/evidence_atlas_c2";
const dbText = `C2_MODE=local\nC2_POSTGRES_PASSWORD=synthetic-db\nC2_DATABASE_URL=${database}`;
const authText = `AUTH_SECRET=${"s".repeat(32)}\nAUTH_GOOGLE_ID=synthetic.apps.googleusercontent.com\nAUTH_GOOGLE_SECRET=synthetic-oauth`;
const defaults = { ".env.c2.local": dbText, ".env.c2.auth.local": authText };

function prepare(files: Record<string, string | undefined> = {}, inherited: Record<string, string | undefined> = {}, args: string[] = [], execArgv: string[] = []) {
  const all: Record<string, string | undefined> = { ...defaults, ...files };
  return prepareC2App({ root: "/synthetic", args, execArgv, inherited,
    readText: (path) => all[path.split(/[\\/]/).at(-1)!],
  });
}

describe("C2 launcher offline preparation", () => {
  it.each([".env.c2.local", ".env.c2.auth.local"])("requires %s", (file) => {
    expect(() => prepare({ [file]: undefined })).toThrow("missing");
  });
  it.each([
    dbText.replace("C2_MODE=local", "C2_MODE=other"),
    dbText.replace("5433", "5432"), dbText.replace("127.0.0.1", "remote.example"),
    dbText.replace("C2_POSTGRES_PASSWORD=synthetic-db", "C2_POSTGRES_PASSWORD=other"),
    `${dbText}\nDATABASE_URL=synthetic-other`, `${dbText}\nUNKNOWN=synthetic-secret`,
    `${dbText}\nC2_MODE=local`, `${dbText}\nmalformed-line`,
  ])("rejects invalid DB files before startup (%#)", (text) => {
    expect(() => prepare({ ".env.c2.local": text })).toThrow();
  });
  it.each([
    authText.replace("s".repeat(32), ""),
    authText.replace("AUTH_GOOGLE_ID=synthetic.apps.googleusercontent.com", "AUTH_GOOGLE_ID="),
    authText.replace("AUTH_GOOGLE_SECRET=synthetic-oauth", "AUTH_GOOGLE_SECRET="),
    authText.replace("synthetic.apps.googleusercontent.com", "invalid"),
    `${authText}\nAUTH_URL=http://remote.example`, `${authText}\nUNEXPECTED=synthetic-secret`,
  ])("rejects incomplete/unexpected OAuth configuration (%#)", (text) => {
    expect(() => prepare({ ".env.c2.auth.local": text })).toThrow();
  });
  it.each([
    { NODE_OPTIONS: "--require synthetic-hook" }, { NODE_PATH: "synthetic-path" },
    { AUTH_URL: "http://localhost:3000" }, { AUTH_REDIRECT_PROXY_URL: "https://remote.example" },
    { AUTH_TRUST_HOST: "false" }, { NEXTAUTH_SECRET: "synthetic-secret" },
    { AUTH_SECRET_1: "synthetic-secret" }, { HOST: "0.0.0.0" }, { PORT: "3000" },
    { PUBLIC_DEMO_MODE: "true" }, { C2_RUNTIME_MODE: "typo" },
  ])("rejects inherited preload/host/auth conflicts (%#)", (env) => {
    expect(() => prepare({}, env)).toThrow();
  });
  it.each(["--require", "--import=synthetic-hook", "--loader=synthetic-hook"])("rejects execArgv %s", (flag) => {
    expect(() => prepare({}, {}, [], [flag])).toThrow("preload");
  });
  it("refuses arbitrary CLI arguments", () => {
    expect(() => prepare({}, {}, ["--hostname", "0.0.0.0"])).toThrow("no arguments");
  });
  it("passes only approved runtime values, shadows unknown keys, and preserves its inputs", () => {
    const inherited = { PATH: "tools", DATABASE_URL: "synthetic-dev", PGHOST: "remote.example",
      DOTENV_CONFIG_OVERRIDE: "false", GOOGLE_GENERATIVE_AI_API_KEY: "synthetic-ai",
      GROQ_API_KEY: "synthetic-groq", UPSTASH_REDIS_REST_TOKEN: "synthetic-redis",
      INNGEST_EVENT_KEY: "synthetic-event", SENTRY_AUTH_TOKEN: "synthetic-upload",
      NEXT_PUBLIC_UNEXPECTED_SECRET: "synthetic-public", AUTH_SECRET: "synthetic-normal" };
    const invocation = prepare({ ".env.local": "UNKNOWN_SECRET=synthetic-unknown\nNEXT_PUBLIC_OTHER=synthetic-public\nDOTENV_CONFIG_OVERRIDE=false" }, inherited);
    expect(invocation.args).toEqual(["dev", "--hostname", "127.0.0.1", "--port", "3001"]);
    expect(invocation.env.DATABASE_URL).toBe(database);
    expect(invocation.env.AUTH_URL).toBe(C2_ORIGIN);
    expect(invocation.env.PUBLIC_DEMO_MODE).toBe("false");
    expect(invocation.env.NEXT_TELEMETRY_DISABLED).toBe("1");
    expect(invocation.env.UNKNOWN_SECRET).toBe("");
    expect(invocation.env.NEXT_PUBLIC_OTHER).toBe("");
    expect(invocation.env.DOTENV_CONFIG_OVERRIDE).toBe("");
    expect(JSON.stringify(invocation)).not.toMatch(/synthetic-(dev|ai|groq|redis|event|upload|public|normal|unknown)/);
    expect(inherited.DATABASE_URL).toBe("synthetic-dev");
  });
  it("rejects Windows case ambiguity in standard dotenv keys", () => {
    expect(() => prepare({ ".env": "database_url=synthetic-dev" })).toThrow("case variants");
  });
  it("errors never interpolate secret-bearing input", () => {
    try { prepare({ ".env.c2.local": `${dbText}\nsynthetic-private-secret` }); }
    catch (error) {
      expect(String(error)).not.toContain("synthetic-private-secret");
      expect(String(error)).not.toContain(database);
    }
  });

  it("actual installed @next/env cannot restore ordinary credentials (synthetic temp directory)", () => {
    const tempParent = realpathSync(tmpdir());
    const root = mkdtempSync(join(tempParent, "evidence-atlas-c2-env-"));
    try {
      const standard = {
        ".env": "DATABASE_URL=synthetic-dev\nGOOGLE_GENERATIVE_AI_API_KEY=synthetic-google\nGROQ_API_KEY=synthetic-groq\nEXPANDED=${GOOGLE_GENERATIVE_AI_API_KEY}",
        ".env.local": "AUTH_SECRET=synthetic-normal\nAUTH_GOOGLE_SECRET=synthetic-normal-google\nNEXT_PUBLIC_UNEXPECTED=synthetic-public\nNEXT_PUBLIC_SENTRY_DSN=https://synthetic.invalid\nNEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=1\nPGHOST=remote.example\nDOTENV_CONFIG_OVERRIDE=false",
        ".env.development": "INNGEST_EVENT_KEY=synthetic-event\nSENTRY_AUTH_TOKEN=synthetic-upload",
        ".env.development.local": "UPSTASH_REDIS_REST_TOKEN=synthetic-redis\nNODE_OPTIONS=--require=synthetic-hook\nAUTH_REDIRECT_PROXY_URL=https://remote.example",
      };
      for (const [file, text] of Object.entries(standard)) writeFileSync(join(root, file), text);
      const texts: Record<string, string> = { ...defaults, ...standard };
      for (const [file, text] of Object.entries(defaults)) writeFileSync(join(root, file), text);
      const { env } = prepareC2App({ root, args: [], execArgv: [], inherited: {
        PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, TEMP: process.env.TEMP,
      },
        readText: (file) => texts[file.split(/[\\/]/).at(-1)!],
      });
      const require = createRequire(import.meta.url);
      const envModule = createRequire(require.resolve("next/package.json")).resolve("@next/env");
      const dotenvModule = require.resolve("dotenv/config");
      const code = `const {loadEnvConfig}=require(${JSON.stringify(envModule)});loadEnvConfig(${JSON.stringify(root)},true,{info(){},error(){}});require(${JSON.stringify(dotenvModule)});console.log(JSON.stringify(process.env));`;
      const result = spawnSync(process.execPath, ["-e", code], { env, encoding: "utf8", shell: false });
      expect(result.status).toBe(0);
      const loaded = JSON.parse(result.stdout);
      expect(loaded.DATABASE_URL).toBe(database);
      expect(loaded.AUTH_SECRET).toBe("s".repeat(32));
      expect(loaded.AUTH_GOOGLE_SECRET).toBe("synthetic-oauth");
      expect(loaded.NEXT_TELEMETRY_DISABLED).toBe("1");
      expect(loaded.NEXT_PUBLIC_SENTRY_DSN).toBe("");
      expect(loaded.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE).toBe("0");
      for (const key of ["GOOGLE_GENERATIVE_AI_API_KEY", "GROQ_API_KEY", "INNGEST_EVENT_KEY", "SENTRY_AUTH_TOKEN",
        "UPSTASH_REDIS_REST_TOKEN", "NEXT_PUBLIC_UNEXPECTED", "PGHOST", "DOTENV_CONFIG_OVERRIDE", "NODE_OPTIONS", "AUTH_REDIRECT_PROXY_URL", "EXPANDED"]) {
        expect(loaded[key], key).toBe("");
      }
      expect(result.stderr).toBe("");
    } finally {
      if (dirname(realpathSync(root)) !== tempParent) throw new Error("Unexpected temporary fixture path.");
      rmSync(root, { recursive: true, force: true });
    }
  });
});
