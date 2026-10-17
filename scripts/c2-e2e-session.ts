import { randomBytes } from "node:crypto";
import { constants, readFileSync } from "node:fs";
import { lstat, open, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { parseDedicated } from "./c2-app-target.ts";
import { C2_DATABASE_KEYS, validateC2Target } from "../src/lib/c2/database-target.ts";
import { requireExpectedUser, requireHarnessEnvironment } from "./c2-playwright-policy.ts";
import { authFile, saveC2State } from "./c2-playwright-state.ts";
import { createC2E2ESession, ownedC2E2EToken, revokeC2E2ESession } from "./c2-e2e-session-core.ts";

// This is a manual, C2-only CLI. No route/provider/configuration is added to the app.
const root = fileURLToPath(new URL("../", import.meta.url));
async function assertMissingFile() {
  try { await lstat(authFile); throw new Error("Already exists."); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}
async function readOwnedFile() {
  for (const path of [join(root, "playwright"), dirname(authFile)]) {
    const stat = await lstat(path);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (process.platform !== "win32" && (stat.mode & 0o077) !== 0)) throw Error();
  }
  const before = await lstat(authFile);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size > 16_384 ||
    (process.platform !== "win32" && (before.mode & 0o077) !== 0)) throw Error();
  const handle = await open(authFile, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const after = await handle.stat();
    if (before.ino !== after.ino || before.dev !== after.dev || before.size !== after.size) throw Error();
    return { token: ownedC2E2EToken(JSON.parse(await handle.readFile("utf8"))), info: after };
  } finally { await handle.close(); }
}

let client: Client | undefined;
try {
  const mode = process.argv.slice(2);
  if (mode.length !== 1 || !["--allow-c2-e2e-session-create", "--allow-c2-e2e-session-revoke"].includes(mode[0])) throw Error();
  requireHarnessEnvironment(process.env);
  if (process.execArgv.some((arg) => /^-r|^--(?:require|import|(?:experimental-)?loader)(?:=|$)/.test(arg))) throw Error();
  const expected = requireExpectedUser(process.env);
  const dedicated = parseDedicated(readFileSync(new URL("../.env.c2.local", import.meta.url), "utf8"));
  if (Object.keys(dedicated).some((key) => !(C2_DATABASE_KEYS as readonly string[]).includes(key))) throw Error();
  const url = new URL(validateC2Target(dedicated));
  const creating = mode[0] === "--allow-c2-e2e-session-create";
  if (creating) await assertMissingFile();
  const existing = creating ? undefined : await readOwnedFile();
  client = new Client({
    host: url.hostname, port: Number(url.port), database: "evidence_atlas_c2", user: "c2_local",
    password: decodeURIComponent(url.password), ssl: false, options: "",
    application_name: "evidence-atlas-c2-e2e-session", connectionTimeoutMillis: 5_000, statement_timeout: 10_000,
  });
  client.on("error", () => { /* Never log credentials, SQL detail, or tokens. */ });
  await client.connect();
  if (creating) {
    const token = `c2e2e_${randomBytes(32).toString("hex")}`;
    const state = await createC2E2ESession(client, expected, token, Date.now());
    try { await saveC2State(state); }
    catch {
      // If file persistence fails after commit, revoke only the newly minted row.
      await revokeC2E2ESession(client, expected, token).catch(() => {});
      throw Error();
    }
    console.log("C2 E2E session created privately; no Google OAuth performed.");
  } else {
    if (!existing) throw Error();
    await revokeC2E2ESession(client, expected, existing.token);
    const current = await lstat(authFile);
    if (current.ino !== existing.info.ino || current.dev !== existing.info.dev || current.size !== existing.info.size) throw Error();
    await unlink(authFile);
    console.log("C2 E2E session revoked and private state file removed.");
  }
} catch {
  console.error("C2 E2E session command refused or failed; details suppressed.");
  process.exitCode = 1;
} finally {
  if (client) await client.end().catch(() => {});
}
