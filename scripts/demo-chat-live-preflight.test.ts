import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  demoChatLivePreflight,
  runLivePreflight,
  type LiveReview,
} from "./demo-chat-live-preflight";

const env = {
  NODE_ENV: "test" as const,
  DEMO_CHAT_LIVE_PREFLIGHT: "review-isolated-preview",
  PUBLIC_DEMO_MODE: "true",
  DEMO_CHAT_ENABLED: "false",
  DATABASE_URL: "postgresql://synthetic:synthetic@isolated.invalid/fixture",
  DEMO_WORKSPACE_ID: "curated",
  DEMO_GROQ_API_KEY: "synthetic-groq-secret",
  NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY: "synthetic-public-key",
  DEMO_TURNSTILE_SECRET_KEY: "synthetic-widget-secret",
  UPSTASH_REDIS_REST_URL: "https://isolated.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "synthetic-redis-secret",
  DEMO_CHAT_ALLOWED_ORIGINS: "https://isolated-preview.invalid",
};
function syntheticLiveReview(): LiveReview {
  const comparison = (name: string) => ({
    targetId: `isolated-${name}`,
    productionId: `production-${name}`,
    configurationMatchesTarget: true as const,
    credentialsComparedSafely: "distinct" as const,
    evidence: "synthetic offline evidence; not a real review",
  });
  return {
    target: {
      kind: "isolated-preview",
      owner: "synthetic",
      projectId: "isolated-project",
      productionProjectId: "production-project",
      deploymentId: "isolated-deployment",
      branch: "test/isolated",
      commit: "a".repeat(40),
      origin: env.DEMO_CHAT_ALLOWED_ORIGINS,
      productionOrigins: ["https://production.invalid"],
      productionDeploymentIds: ["production-deployment"],
    },
    groq: {
      ...comparison("groq"),
      freePlan: true,
      modelAllowed: true,
      quotaAndOtherUseReviewed: true,
    },
    redis: {
      ...comparison("redis"),
      dedicatedDatabase: true,
      holdClearedForThisTarget: true,
      safetyAssumptionsReviewed: true,
    },
    turnstile: {
      ...comparison("widget"),
      hostname: "isolated-preview.invalid",
      action: "demo-chat",
    },
    database: {
      ...comparison("database"),
      curatedWorkspaceId: "curated",
      publicScopeReviewed: true,
    },
    operator: {
      name: "synthetic",
      reviewedAt: "2026-10-29T12:00:00+09:00",
      allSendersInventoried: true,
      unknownDeploymentsOrSenders: false,
      unknownRemoteWork: false,
      protectionReviewed: true,
      costBoundAndStopProcedureReviewed: true,
      evidence: "synthetic offline review",
    },
  };
}
const check = (
  changes: Record<string, string | undefined> = {},
  review: unknown = syntheticLiveReview(),
) => demoChatLivePreflight({ ...env, ...changes }, review);

describe("Live preflight: offline structure and explicit operator evidence only", () => {
  it("never authorizes live traffic or public activation, including on success", () => {
    expect(check()).toEqual({
      status: "Pass",
      scope: "offline-structure-and-operator-review-only",
      blocked: [],
      liveAuthorized: false,
      publicActivation: "No-Go",
    });
  });
  it.each([undefined, "", "true", "production"])(
    "rejects absent or wrong opt-in %s",
    (value) => {
      expect(check({ DEMO_CHAT_LIVE_PREFLIGHT: value }).blocked).toContain(
        "explicit-opt-in-required",
      );
    },
  );
  it.each([undefined, {}, { target: { kind: "production" } }])(
    "blocks unknown/unapproved target",
    (review) => {
      expect(demoChatLivePreflight(env, review).status).toBe("Blocked");
    },
  );
  it.each(["production", "development", "custom"])(
    "rejects Vercel environment %s",
    (value) => {
      expect(check({ VERCEL_ENV: value }).blocked).toContain(
        "non-preview-environment",
      );
      expect(check({ VERCEL_TARGET_ENV: value }).blocked).toContain(
        "non-preview-environment",
      );
    },
  );
  it("rejects unreviewed project sharing, Production origin and deployment identity mismatch", () => {
    const review = syntheticLiveReview();
    review.target.projectId = review.target.productionProjectId;
    review.target.productionOrigins.push(review.target.origin);
    expect(check({}, review).blocked).toEqual(
      expect.arrayContaining(["shared-project-isolation-unproven", "unsafe-origin"]),
    );
    for (const key of [
      "VERCEL_PROJECT_ID",
      "VERCEL_DEPLOYMENT_ID",
      "VERCEL_GIT_COMMIT_SHA",
      "VERCEL_GIT_COMMIT_REF",
    ]) {
      expect(check({ [key]: "mismatch" }).blocked).toContain(
        "deployment-binding-mismatch",
      );
    }
  });
  it("rejects a known Production deployment even with a Preview-shaped review", () => {
    const review = syntheticLiveReview();
    review.target.deploymentId = review.target.productionDeploymentIds[0];
    expect(check({}, review).blocked).toContain("production-deployment-forbidden");
  });
  it("allows shared project only with explicit reviewed branch isolation and old-sender closure", () => {
    const review = syntheticLiveReview();
    review.target.projectId = review.target.productionProjectId;
    expect(check({}, review).blocked).toContain("shared-project-isolation-unproven");
    review.target.sharedProjectReview = {
      branch: review.target.branch, branchOnlyConfiguration: true,
      oldDeploymentAdmissionClosed: true, evidence: "synthetic scoped-setting review",
    };
    expect(check({}, review).status).toBe("Pass");
    review.target.sharedProjectReview.branch = "another-branch";
    expect(check({}, review).blocked).toContain("shared-project-isolation-unproven");
  });
  it("blocks shared project on incomplete isolation evidence, without accepting missing booleans", () => {
    const review = syntheticLiveReview();
    review.target.projectId = review.target.productionProjectId;
    for (const scope of [
      { branch: review.target.branch, branchOnlyConfiguration: false, oldDeploymentAdmissionClosed: true, evidence: "synthetic" },
      { branch: review.target.branch, branchOnlyConfiguration: true, oldDeploymentAdmissionClosed: false, evidence: "synthetic" },
      { branch: review.target.branch, branchOnlyConfiguration: true, oldDeploymentAdmissionClosed: true, evidence: "" },
      { branch: review.target.branch, evidence: "synthetic" },
    ]) expect(check({}, { ...review, target: { ...review.target, sharedProjectReview: scope } }).status).toBe("Blocked");
  });
  it.each(Object.keys(env).filter((key) => !["DEMO_CHAT_LIVE_PREFLIGHT", "NODE_ENV"].includes(key)))(
    "rejects missing configuration %s",
    (key) => {
      expect(check({ [key]: undefined }).status).toBe("Blocked");
    },
  );
  it.each(["true", "1", " "])(
    "keeps preparation feature flag false %s",
    (value) => {
      expect(check({ DEMO_CHAT_ENABLED: value }).status).toBe("Blocked");
    },
  );
  it.each(["true", "false", "malformed", " "])(
    "rejects every nonempty C2 marker %s",
    (value) => {
      expect(check({ C2_RUNTIME_MODE: value }).blocked).toContain(
        "c2-forbidden",
      );
    },
  );
  it("allows only an absent or empty C2 marker", () => {
    expect(check({ C2_RUNTIME_MODE: "" }).status).toBe("Pass");
  });
  it.each([
    "http://isolated-preview.invalid",
    "https://isolated-preview.invalid/",
    "https://isolated-preview.invalid/path",
    "https://*.invalid",
    "https://user:secret@isolated-preview.invalid",
    "https://isolated-preview.invalid:8443",
    "https://other.invalid",
    "https://isolated-preview.invalid,https://other.invalid",
  ])("rejects wrong Origin %s", (value) => {
    expect(check({ DEMO_CHAT_ALLOWED_ORIGINS: value }).status).toBe("Blocked");
    const review = syntheticLiveReview();
    review.target.origin = value;
    // A new origin must also match the reviewed hostname and strict HTTPS form.
    expect(check({ DEMO_CHAT_ALLOWED_ORIGINS: value }, review).status).toBe(
      "Blocked",
    );
  });
  it.each(["groq", "redis", "turnstile", "database"] as const)(
    "requires safe Production comparison and distinct resource for %s",
    (service) => {
      const review = syntheticLiveReview();
      review[service].credentialsComparedSafely = "unavailable";
      expect(check({}, review).blocked).toContain(
        `${service}-separation-unproven`,
      );
      review[service].credentialsComparedSafely = "same";
      expect(check({}, review).blocked).toContain(
        `${service}-production-reuse`,
      );
      review[service].credentialsComparedSafely = "distinct";
      review[service].targetId = review[service].productionId;
      expect(check({}, review).blocked).toContain(
        `${service}-production-reuse`,
      );
      review[service].targetId = "isolated";
      review[service].evidence = "";
      expect(check({}, review).status).toBe("Blocked");
    },
  );
  it("requires free plan, hold clearance, sender inventory, protection and cost/stop review", () => {
    const reviews = [
      {
        ...syntheticLiveReview(),
        groq: { ...syntheticLiveReview().groq, freePlan: false },
      },
      {
        ...syntheticLiveReview(),
        redis: {
          ...syntheticLiveReview().redis,
          holdClearedForThisTarget: false,
        },
      },
      ...[
        "allSendersInventoried",
        "protectionReviewed",
        "costBoundAndStopProcedureReviewed",
      ].map((key) => ({
        ...syntheticLiveReview(),
        operator: { ...syntheticLiveReview().operator, [key]: false },
      })),
      ...["unknownDeploymentsOrSenders", "unknownRemoteWork"].map((key) => ({
        ...syntheticLiveReview(),
        operator: { ...syntheticLiveReview().operator, [key]: true },
      })),
    ];
    for (const review of reviews)
      expect(check({}, review).status).toBe("Blocked");
  });
  it("rejects fallback Redis settings, unsafe REST endpoints and wrong curated workspace", () => {
    for (const key of ["KV_REST_API_URL", "KV_REST_API_TOKEN"])
      expect(check({ [key]: "synthetic" }).blocked).toContain(
        "redis-fallback-forbidden",
      );
    for (const url of [
      "http://test.upstash.io",
      "https://evil.invalid",
      "https://test.upstash.io/path",
      "https://test.upstash.io?token=secret",
    ]) {
      expect(check({ UPSTASH_REDIS_REST_URL: url }).blocked).toContain(
        "invalid-redis-endpoint",
      );
    }
    expect(check({ DEMO_WORKSPACE_ID: "other" }).blocked).toContain(
      "workspace-binding-mismatch",
    );
  });
  it("does not fetch, print, echo parser failures or include any input value in reports", () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Network forbidden"));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const secret = "UNIQUE_SECRET_MUST_NOT_APPEAR";
      const review = syntheticLiveReview();
      review.operator.evidence = secret;
      const output = JSON.stringify([
        check(
          Object.fromEntries(Object.keys(env).map((key) => [key, secret])),
          review,
        ),
        runLivePreflight(env, `{"secret":"${secret}"`),
        check({}, { secret }),
        check(),
      ]);
      expect(output).not.toContain(secret);
      for (const value of Object.values(env))
        expect(output).not.toContain(JSON.stringify(value));
      expect(fetcher).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    } finally {
      fetcher.mockRestore();
      log.mockRestore();
    }
  });
  it.each([false, true])(
    "CLI exits safely with synthetic-only process environment, complete=%s",
    (complete) => {
      const child = spawnSync(
        process.execPath,
        [
          fileURLToPath(
            new URL("./demo-chat-live-preflight.ts", import.meta.url),
          ),
        ],
        {
          env: complete ? env : { NODE_ENV: "test" },
          encoding: "utf8",
          timeout: 10_000,
          input: complete
            ? JSON.stringify(syntheticLiveReview())
            : '{"secret":"UNIQUE_CLI_SECRET"',
        },
      );
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(complete ? 0 : 2);
      expect(child.stderr).toBe("");
      expect(JSON.parse(child.stdout)).toMatchObject({
        status: complete ? "Pass" : "Blocked",
        liveAuthorized: false,
      });
      expect(child.stdout).not.toMatch(
        /UNIQUE_CLI_SECRET|synthetic-groq-secret|synthetic-widget-secret|synthetic-redis-secret/,
      );
    },
  );
});
