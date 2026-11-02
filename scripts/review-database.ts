import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";
import { Client } from "pg";
import { adminSql, docker } from "./review-docker.ts";
import { REVIEW_DATABASE, REVIEW_ROLE, reviewConfig, reviewEnvironment } from "./review-policy.ts";

export function provisionReview(root: string) {
  const file = join(root, ".env.review.local");
  if (existsSync(file)) return;
  const exists = adminSql("postgres", `SELECT count(*) FROM pg_database WHERE datname='${REVIEW_DATABASE}'; SELECT count(*) FROM pg_roles WHERE rolname='${REVIEW_ROLE}';`);
  if (exists !== "0\n0" && exists !== "0\r\n0") throw new Error("Review DB/role already exists but dedicated config is missing. Inspect/adopt manually; no password or database reset.");
  const password = randomBytes(32).toString("hex");
  const authSecret = randomBytes(32).toString("hex");
  // Write once first: retain recovery credentials even if provisioning is interrupted.
  writeFileSync(file, `REVIEW_DATABASE_URL=postgresql://${REVIEW_ROLE}:${password}@127.0.0.1:5432/${REVIEW_DATABASE}\nREVIEW_AUTH_SECRET=${authSecret}\n`, { flag: "wx", mode: 0o600 });
  adminSql("postgres", `CREATE ROLE ${REVIEW_ROLE} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;\nCREATE DATABASE ${REVIEW_DATABASE} OWNER ${REVIEW_ROLE};`);
  // Public CONNECT privileges on other DBs cannot isolate a new login. HBA
  // rules apply ONLY to this new role; existing databases/roles are unchanged.
  const rules = `# Evidence Atlas review role isolation\nlocal ${REVIEW_DATABASE} ${REVIEW_ROLE} scram-sha-256\nlocal all ${REVIEW_ROLE} reject\nhost ${REVIEW_DATABASE} ${REVIEW_ROLE} all scram-sha-256\nhost all ${REVIEW_ROLE} all reject\n`;
  docker(["exec", "-i", "evidence-atlas-postgres", "sh", "-c",
    'set -eu; hba="$PGDATA/pg_hba.conf"; cp -p "$hba" "$hba.review-backup"; { cat; cat "$hba.review-backup"; } > "$hba"'], rules);
  adminSql("postgres", "SELECT pg_reload_conf();");
  console.log("Created dedicated review database/role and role-only HBA isolation; saved ignored .env.review.local.");
}

export function readReviewConfig(root: string) {
  if (!existsSync(join(root, ".env.review.local"))) throw new Error("Missing .env.review.local; run pnpm review:setup.");
  return reviewConfig(readFileSync(join(root, ".env.review.local"), "utf8"));
}

export async function reviewClient(config: ReturnType<typeof reviewConfig>, readOnly: boolean) {
  const url = new URL(config.url);
  const client = new Client({ host: "127.0.0.1", port: 5432, database: REVIEW_DATABASE, user: REVIEW_ROLE,
    password: url.password, ssl: false, connectionTimeoutMillis: 5000, statement_timeout: 15000,
    application_name: "evidence-atlas-review", options: readOnly ? "-c default_transaction_read_only=on" : "" });
  try {
    await client.connect();
    const identity = (await client.query("SELECT current_database() AS db,current_user AS role,inet_server_port() AS port,(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication FROM pg_roles WHERE rolname=current_user) AS privileged")).rows[0];
    if (identity.db !== REVIEW_DATABASE || identity.role !== REVIEW_ROLE || identity.port !== 5432 || identity.privileged) throw new Error("Unexpected review connection identity/privileges.");
    const fingerprint = (await client.query("SELECT pg_postmaster_start_time()::text||'|'||(SELECT oid::text FROM pg_database WHERE datname=current_database()) AS value")).rows[0].value;
    if (fingerprint !== adminSql("evidence_atlas_review", "SELECT pg_postmaster_start_time()::text||'|'||(SELECT oid::text FROM pg_database WHERE datname=current_database());")) throw new Error("TCP endpoint does not match the inspected Docker PostgreSQL instance.");
    const hba = adminSql("postgres", `SELECT count(*) FROM pg_hba_file_rules WHERE error IS NOT NULL; SELECT count(*) FROM pg_hba_file_rules WHERE user_name=ARRAY['${REVIEW_ROLE}'] AND auth_method='reject' AND database=ARRAY['all']; SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname='${REVIEW_DATABASE}';`);
    if (hba.replaceAll("\r", "") !== `0\n2\n${REVIEW_ROLE}`) throw new Error("Review role HBA isolation/database ownership missing; inspect manually.");
    // Confirm that a real TCP connection to the ordinary DB is rejected by HBA,
    // without reading or writing any application data.
    const forbidden = new Client({ host: "127.0.0.1", port: 5432, database: "evidence_atlas", user: REVIEW_ROLE, password: url.password, ssl: false, connectionTimeoutMillis: 5000 });
    let rejected = false;
    try { await forbidden.connect(); } catch (error) { rejected = (error as {code?: string}).code === "28000"; } finally { await forbidden.end(); }
    if (!rejected) throw new Error("Review login is not isolated from the ordinary database; refused.");
    return client;
  } catch (error) { await client.end(); throw error; }
}

export function prismaReview(root: string, config: ReturnType<typeof reviewConfig>, command: "preview" | "migrate" | "verify") {
  const env = reviewEnvironment(config, process.env);
  if (command === "migrate") {
    // The extension install requires a superuser. Read only the explicit local
    // compose admin configuration; never inherit a URL or use a cloud target.
    const local = parse(readFileSync(join(root, ".env"), "utf8"));
    let admin: URL;
    try { admin = new URL(local.DATABASE_URL); } catch { throw new Error("Cannot resolve local Compose administrator configuration."); }
    if (!["localhost", "127.0.0.1"].includes(admin.hostname) || admin.port !== "5432" || admin.pathname !== "/evidence_atlas" || admin.username !== "postgres" || !admin.password || admin.search || admin.hash) throw new Error("Unexpected Compose administrator config; bootstrap stopped.");
    admin.hostname = "127.0.0.1";
    admin.pathname = `/${REVIEW_DATABASE}`;
    env.DATABASE_URL = admin.href;
  } else {
    env.PGOPTIONS = "-c default_transaction_read_only=on";
  }
  const args = command === "verify" ? ["db", "verify"] : ["db", "migrate", ...(command === "preview" ? ["--show"] : [])];
  const result = spawnSync(process.execPath, [join(root, "node_modules/prisma/dist/prisma.js"), ...args], {
    cwd: root, env, encoding: "utf8", windowsHide: true, timeout: 60_000,
  });
  if (result.error || result.status !== 0) {
    const codes = [...new Set((`${result.stdout ?? ""}\n${result.stderr ?? ""}`).match(/\b(?:MIGRATION|CONTRACT|CONFIG|RUNTIME)\.[A-Z_]+\b/g) ?? [])];
    throw new Error(`Review Prisma ${command} failed (exit ${result.status}; ${codes.join(",") || "output suppressed"}). No migration-history conversion/reset will be attempted.`);
  }
  if (command === "migrate") adminSql("evidence_atlas_review", `GRANT USAGE ON SCHEMA public,prisma_contract TO ${REVIEW_ROLE}; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO ${REVIEW_ROLE}; GRANT SELECT ON ALL TABLES IN SCHEMA prisma_contract TO ${REVIEW_ROLE}; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO ${REVIEW_ROLE};`);
  console.log(`Prisma ${command}: passed.`);
}
