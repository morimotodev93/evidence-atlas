import { describe, expect, it } from "vitest";
import { populate } from "dotenv";
import {
  parseC2Command,
  prepareC2Prisma,
  validateC2Target,
} from "./c2-db-target";

const config = {
  C2_MODE: "local",
  C2_POSTGRES_PASSWORD: "synthetic-secret",
  C2_DATABASE_URL:
    "postgresql://c2_local:synthetic-secret@127.0.0.1:5433/evidence_atlas_c2",
};

describe("C2 target safeguards (no database connection)", () => {
  it.each(["127.0.0.1", "localhost"])(
    "accepts the complete dedicated target at %s",
    (host) => {
      const input = {
        ...config,
        C2_DATABASE_URL: config.C2_DATABASE_URL.replace("127.0.0.1", host),
      };
      expect(validateC2Target(input)).toBe(input.C2_DATABASE_URL);
    },
  );

  it.each([
    "https://c2_local:synthetic-secret@127.0.0.1:5433/evidence_atlas_c2",
    "postgresql://c2_local:synthetic-secret@remote.example:5433/evidence_atlas_c2",
    "postgresql://c2_local:synthetic-secret@127.0.0.1:5432/evidence_atlas_c2",
    "postgresql://c2_local:synthetic-secret@127.0.0.1/evidence_atlas_c2",
    "postgresql://c2_local:synthetic-secret@127.0.0.1:5433/evidence_atlas",
    "postgresql://postgres:synthetic-secret@127.0.0.1:5433/evidence_atlas_c2",
    "postgresql://c2_local@127.0.0.1:5433/evidence_atlas_c2",
    "postgresql://c2_local:other@127.0.0.1:5433/evidence_atlas_c2",
    `${config.C2_DATABASE_URL}?host=remote.example`,
    `${config.C2_DATABASE_URL}#fragment`,
    `${config.C2_DATABASE_URL}/`,
    "not a URL with synthetic-secret",
  ])(
    "rejects unsafe or ambiguous targets without leaking input (%#)",
    (url) => {
      expect(() =>
        validateC2Target({ ...config, C2_DATABASE_URL: url }),
      ).toThrow("Rejected C2 connection target or password mismatch.");
    },
  );

  it.each(["C2_MODE", "C2_POSTGRES_PASSWORD", "C2_DATABASE_URL"])(
    "requires explicit %s",
    (key) => {
      expect(() => validateC2Target({ ...config, [key]: "" })).toThrow();
    },
  );

  it("accepts URL-encoded passwords without interpreting them as URL options", () => {
    const password = "p@ss:/?#%";
    expect(
      validateC2Target({
        ...config,
        C2_POSTGRES_PASSWORD: password,
        C2_DATABASE_URL: `postgresql://c2_local:${encodeURIComponent(password)}@127.0.0.1:5433/evidence_atlas_c2`,
      }),
    ).toContain("@127.0.0.1:5433/");
  });

  it.each(
    [
      [],
      ["seed"],
      ["migrate"],
      ["migrate", "--allow-c2-write", "--db", "other"],
      ["verify", "--db", "other"],
    ].map((args) => ({ args })),
  )(
    "rejects absent intent, unapproved writes and arbitrary Prisma arguments (%#)",
    ({ args }) => {
      expect(() => parseC2Command(args)).toThrow("Usage:");
    },
  );

  it("allows only the explicit migration write intent", () => {
    expect(parseC2Command(["migrate", "--allow-c2-write"])).toBe("migrate");
    expect(parseC2Command(["validate"])).toBe("validate");
  });

  it("overrides development targeting and dotenv/libpq overrides in the child only", () => {
    const inherited = {
      NODE_ENV: "test" as const,
      DATABASE_URL: "postgresql://dev:dev@localhost:5432/evidence_atlas",
      PGHOST: "remote.example",
      PGDATABASE: "shared",
      PGPORT: "5432",
      DOTENV_CONFIG_PATH: ".env",
      DOTENV_CONFIG_OVERRIDE: "true",
      PATH: "tools",
    };
    const invocation = prepareC2Prisma(
      "migrate",
      config,
      "/project/.env.c2.local",
      inherited,
    );
    expect(invocation.args).toEqual(["db", "migrate"]);
    expect(invocation.env).toEqual({
      NODE_ENV: "test",
      PATH: "tools",

      DATABASE_URL: config.C2_DATABASE_URL,

      DOTENV_PATH: "/project/.env.c2.local",
      DOTENV_CONFIG_PATH: "/project/.env.c2.local",

      DOTENV_QUIET: "true",
      DOTENV_CONFIG_QUIET: "true",
    });
    expect(inherited.DOTENV_CONFIG_PATH).toBe(".env");
    expect(invocation.args.join(" ")).not.toContain(
      config.C2_POSTGRES_PASSWORD,
    );
  });

  it("never falls back to an inherited valid URL", () => {
    expect(() =>
      prepareC2Prisma("verify", {}, "explicit-file", {
        NODE_ENV: "test",
        DATABASE_URL: config.C2_DATABASE_URL,
      }),
    ).toThrow();
  });

  it.each(["DATABASE_URL", "DOTENV_CONFIG_OVERRIDE", "AUTH_SECRET", "EXTRA"])(
    "rejects unexpected dedicated DB config keys (%s)", (key) => {
      expect(() => validateC2Target({ ...config, [key]: "synthetic-secret" })).toThrow("Unexpected keys");
    },
  );

  it("removes literal false overrides and preserves the validated URL with installed dotenv", () => {
    const vulnerable = { DATABASE_URL: config.C2_DATABASE_URL };
    populate(vulnerable, { DATABASE_URL: "synthetic-other" }, { override: "false" as unknown as boolean });
    expect(vulnerable.DATABASE_URL).toBe("synthetic-other");
    const fixed = prepareC2Prisma("verify", config, "explicit-file", {
      NODE_ENV: "test", DOTENV_CONFIG_OVERRIDE: "false", DOTENV_OVERRIDE: "false",
      DOTENV_KEY: "synthetic-key", PGHOST: "remote.example",
    }).env;
    expect(fixed.DOTENV_CONFIG_OVERRIDE).toBeUndefined();
    expect(fixed.DOTENV_OVERRIDE).toBeUndefined();
    expect(fixed.DOTENV_KEY).toBeUndefined();
    populate(fixed, { DATABASE_URL: "synthetic-other" });
    expect(fixed.DATABASE_URL).toBe(config.C2_DATABASE_URL);
  });

  it.each(["show", "verify"] as const)(
    "uses supported Prisma 8 %s arguments",
    (command) => {
      expect(
        prepareC2Prisma(command, config, "explicit-file", { NODE_ENV: "test" })
          .args,
      ).toEqual(
        command === "show" ? ["db", "migrate", "--show"] : ["db", "verify"],
      );
    },
  );
});
