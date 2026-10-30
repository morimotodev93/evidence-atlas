import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { z } from "zod";

// Offline only. No dotenv, application/server imports, credential retrieval or IO
// other than the operator's stdin. Values and validation errors are never echoed.
const text = z.string().trim().min(1).max(240);
const comparison = z.object({
  targetId: text,
  productionId: text,
  configurationMatchesTarget: z.literal(true),
  credentialsComparedSafely: z.enum(["distinct", "same", "unavailable"]),
  evidence: text,
}).strict();
export const liveReviewSchema = z.object({
  target: z.object({
    kind: z.literal("isolated-preview"), owner: text, projectId: text,
    deploymentId: text, branch: text, commit: z.string().regex(/^[a-f0-9]{40}$/),
    origin: text, productionProjectId: text, productionOrigins: z.array(text).min(1),
    productionDeploymentIds: z.array(text).min(1),
    sharedProjectReview: z.object({
      branch: text, branchOnlyConfiguration: z.literal(true),
      oldDeploymentAdmissionClosed: z.literal(true), evidence: text,
    }).strict().optional(),
  }).strict(),
  // Non-secret service/database identity from the operator's trusted console.
  // IDs must use the same provider scope on both sides (not aliases/key labels).
  groq: comparison.extend({ freePlan: z.literal(true), modelAllowed: z.literal(true), quotaAndOtherUseReviewed: z.literal(true) }),
  redis: comparison.extend({ dedicatedDatabase: z.literal(true), holdClearedForThisTarget: z.literal(true), safetyAssumptionsReviewed: z.literal(true) }),
  turnstile: comparison.extend({ hostname: text, action: z.literal("demo-chat") }),
  database: comparison.extend({ curatedWorkspaceId: text, publicScopeReviewed: z.literal(true) }),
  operator: z.object({
    name: text, reviewedAt: z.string().datetime({ offset: true }),
    allSendersInventoried: z.literal(true), unknownDeploymentsOrSenders: z.literal(false),
    unknownRemoteWork: z.literal(false), protectionReviewed: z.literal(true),
    costBoundAndStopProcedureReviewed: z.literal(true), evidence: text,
  }).strict(),
}).strict();
export type LiveReview = z.infer<typeof liveReviewSchema>;
type Env = Record<string, string | undefined>;

function httpsOrigin(value: string): URL | undefined {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && url.origin === value && !url.username && !url.password
      && !url.hostname.includes("*") && !url.port) return url;
  } catch { /* Do not surface parser input. */ }
}
function redisRoot(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && url.pathname === "/" && !url.search && !url.hash && url.hostname.endsWith(".upstash.io");
  } catch { return false; }
}

export function demoChatLivePreflight(env: Env, input: unknown) {
  const blocked = new Set<string>();
  if (env.DEMO_CHAT_LIVE_PREFLIGHT !== "review-isolated-preview") blocked.add("explicit-opt-in-required");
  if (env.PUBLIC_DEMO_MODE !== "true") blocked.add("public-demo-required");
  if (env.DEMO_CHAT_ENABLED !== "false") blocked.add("preparation-flag-must-stay-false");
  if (env.C2_RUNTIME_MODE !== undefined && env.C2_RUNTIME_MODE !== "") blocked.add("c2-forbidden");
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "preview") blocked.add("non-preview-environment");
  if (env.VERCEL_TARGET_ENV && env.VERCEL_TARGET_ENV !== "preview") blocked.add("non-preview-environment");
  for (const key of ["DATABASE_URL", "DEMO_WORKSPACE_ID", "DEMO_GROQ_API_KEY",
    "NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY", "DEMO_TURNSTILE_SECRET_KEY", "DEMO_CHAT_ALLOWED_ORIGINS"]) {
    if (!env[key]?.trim()) blocked.add("missing-required-configuration");
  }
  // Stronger than runtime eligibility: forbid fallback/mixed Redis credentials
  // in this dedicated target, while leaving the production factory unchanged.
  if (!env.UPSTASH_REDIS_REST_URL?.trim() || !env.UPSTASH_REDIS_REST_TOKEN?.trim()) blocked.add("dedicated-redis-required");
  if (env.KV_REST_API_URL || env.KV_REST_API_TOKEN) blocked.add("redis-fallback-forbidden");
  if (!redisRoot(env.UPSTASH_REDIS_REST_URL ?? "")) blocked.add("invalid-redis-endpoint");
  try {
    const db = new URL(env.DATABASE_URL ?? "");
    if (!["postgres:", "postgresql:"].includes(db.protocol) || !db.hostname || db.pathname.length < 2) blocked.add("invalid-database-configuration");
  } catch { blocked.add("invalid-database-configuration"); }
  const parsed = liveReviewSchema.safeParse(input);
  if (!parsed.success) blocked.add("target-or-operator-review-missing");
  else {
    const review = parsed.data;
    const { target } = review;
    const origin = httpsOrigin(target.origin);
    if (!origin || target.productionOrigins.some((value) => !httpsOrigin(value))
      || target.productionOrigins.includes(target.origin)) blocked.add("unsafe-origin");
    if (target.productionDeploymentIds.includes(target.deploymentId)) blocked.add("production-deployment-forbidden");
    // A separate project is preferred, not required by the project specification.
    // Sharing requires explicit evidence of branch-scoped settings and closure
    // of old senders; never infer this from dedicated key names or Preview URLs.
    if (target.projectId === target.productionProjectId
      && (!target.sharedProjectReview || target.sharedProjectReview.branch !== target.branch)) blocked.add("shared-project-isolation-unproven");
    // One fixed verification origin; no wildcard, trailing slash, extra origin
    // or host-derived default. Deployment identity is operator reviewed offline.
    if (env.DEMO_CHAT_ALLOWED_ORIGINS !== target.origin) blocked.add("origin-binding-mismatch");
    if (review.turnstile.hostname !== origin?.hostname) blocked.add("turnstile-hostname-mismatch");
    if (env.DEMO_WORKSPACE_ID !== review.database.curatedWorkspaceId) blocked.add("workspace-binding-mismatch");
    if ((env.VERCEL_PROJECT_ID && env.VERCEL_PROJECT_ID !== target.projectId)
      || (env.VERCEL_DEPLOYMENT_ID && env.VERCEL_DEPLOYMENT_ID !== target.deploymentId)
      || (env.VERCEL_GIT_COMMIT_REF && env.VERCEL_GIT_COMMIT_REF !== target.branch)
      || (env.VERCEL_GIT_COMMIT_SHA && env.VERCEL_GIT_COMMIT_SHA !== target.commit)) blocked.add("deployment-binding-mismatch");
    for (const service of ["groq", "redis", "turnstile", "database"] as const) {
      const checked = review[service];
      if (checked.targetId === checked.productionId || checked.credentialsComparedSafely === "same") blocked.add(`${service}-production-reuse`);
      if (checked.credentialsComparedSafely === "unavailable") blocked.add(`${service}-separation-unproven`);
    }
  }
  return {
    status: blocked.size ? "Blocked" as const : "Pass" as const,
    scope: "offline-structure-and-operator-review-only",
    blocked: [...blocked].sort(),
    liveAuthorized: false,
    publicActivation: "No-Go",
  };
}

export function runLivePreflight(env: Env, stdin: string): ReturnType<typeof demoChatLivePreflight> {
  let input: unknown;
  try { input = JSON.parse(stdin); } catch { /* Report only fixed failure codes. */ }
  return demoChatLivePreflight(env, input);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = runLivePreflight(process.env, readFileSync(0, "utf8"));
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.status === "Pass" ? 0 : 2;
  } catch {
    process.stdout.write('{"status":"Blocked","blocked":["preflight-input-error"],"liveAuthorized":false}\n');
    process.exitCode = 2;
  }
}
