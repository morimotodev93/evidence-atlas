import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveRuntimeDatabaseUrl } from "./runtime-database";

const mocks = vi.hoisted(() => ({ prisma: vi.fn(), pool: vi.fn(), kysely: vi.fn(), dialect: vi.fn() }));
vi.mock("dotenv/config", () => ({}));
vi.mock("@prisma/orm-postgres/runtime", () => ({ default: mocks.prisma }));
vi.mock("@prisma/orm-extension-pgvector/runtime", () => ({ default: {} }));
vi.mock("pg", () => ({ Pool: mocks.pool }));
vi.mock("kysely", () => ({ PostgresDialect: mocks.dialect }));
vi.mock("@auth/kysely-adapter", () => ({ KyselyAuth: mocks.kysely }));
vi.mock("../../auth/authTableNamePlugin", () => ({ AuthTableNamePlugin: class {} }));

const url = "postgresql://c2_local:synthetic-db@127.0.0.1:5433/evidence_atlas_c2";
const env = { C2_RUNTIME_MODE: "local", C2_MODE: "local", PUBLIC_DEMO_MODE: "false",
  C2_DATABASE_URL: url, C2_POSTGRES_PASSWORD: "synthetic-db", DATABASE_URL: url };

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());

describe("database clients reject before construction (mocked, no connections)", () => {
  it.each([
    { DATABASE_URL: "postgresql://dev:dev@localhost:5432/evidence_atlas" },
    { C2_DATABASE_URL: undefined }, { C2_MODE: "wrong" }, { C2_POSTGRES_PASSWORD: "wrong" },
    { C2_RUNTIME_MODE: "typo" }, { PUBLIC_DEMO_MODE: "true" },
    { PGHOST: "remote.example" }, { DOTENV_CONFIG_OVERRIDE: "false" },
  ])("refuses both initializers for inconsistent C2 configuration (%#)", async (override) => {
    for (const [key, value] of Object.entries(override)) vi.stubEnv(key, value);
    await expect(import("../../prisma/db")).rejects.toThrow();
    await expect(import("../../auth/authDB")).rejects.toThrow();
    expect(mocks.prisma).not.toHaveBeenCalled();
    expect(mocks.pool).not.toHaveBeenCalled();
    expect(mocks.kysely).not.toHaveBeenCalled();
    expect(mocks.dialect).not.toHaveBeenCalled();
  });
  it("passes the identical validated URL to Prisma and the Auth Pool", async () => {
    await import("../../prisma/db"); await import("../../auth/authDB");
    expect(mocks.prisma).toHaveBeenCalledWith(expect.objectContaining({ url }));
    expect(mocks.pool).toHaveBeenCalledWith({ connectionString: url });
  });
  it.each(["false", "true"])("preserves non-C2 SaaS/Demo DB configuration (Demo=%s)", async (demo) => {
    vi.stubEnv("C2_RUNTIME_MODE", undefined); vi.stubEnv("PUBLIC_DEMO_MODE", demo);
    vi.stubEnv("DATABASE_URL", "synthetic-normal-url");
    await import("../../prisma/db"); await import("../../auth/authDB");
    expect(mocks.prisma).toHaveBeenCalledWith(expect.objectContaining({ url: "synthetic-normal-url" }));
    expect(mocks.pool).toHaveBeenCalledWith({ connectionString: "synthetic-normal-url" });
  });
  it("does not expose a secret-bearing mismatched runtime URL", () => {
    expect(() => resolveRuntimeDatabaseUrl({ ...env, DATABASE_URL: "synthetic-private-secret" })).toThrow("target mismatch");
  });
});
