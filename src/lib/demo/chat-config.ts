import "server-only";

export const DEMO_CHAT_MODEL_PROVIDER = "groq";
export const DEMO_CHAT_MODEL_ID = "openai/gpt-oss-120b";

// Separate public ingress, bounded generation and Redis enforcement.
export const DEMO_CHAT_LIMITS = Object.freeze({
  maxUserQuestionsPerThread: 10,
  persistConversationHistory: false,
  maxInputCharacters: 500,
  anonymousSessionQuestions: 20,
  anonymousSessionWindowSeconds: 24 * 60 * 60,
  sourceQuestions: 3,
  sourceWindowSeconds: 60,
  globalQuestionsPerDay: 50,
  maxConcurrentGenerations: 2,
  maxOutputTokens: 1200,
} as const);

export const DEMO_CHAT_REDIS = Object.freeze({
  backend: "upstash",
  prefix: "evidence-atlas:demo-chat:v1",
  sessionPrefix: "evidence-atlas:demo-chat:v1:session",
  sourcePrefix: "evidence-atlas:demo-chat:v1:source",
  globalPrefix: "evidence-atlas:demo-chat:v1:global",
  concurrencyPrefix: "evidence-atlas:demo-chat:v1:concurrency",
  failurePolicy: "deny",
  allowMemoryFallback: false,
} as const);

export const DEMO_CHAT_TURNSTILE = Object.freeze({
  serverVerificationRequired: true,
  expectedAction: "demo-chat",
  trustedHostnameRequired: true,
} as const);

export class DemoChatConfigurationError extends Error {
  constructor() {
    super("Demo Chat is disabled or not configured.");
    this.name = "DemoChatConfigurationError";
  }
}

/**
 * Configuration eligibility only, NOT permission to execute a public request.
 * API ingress must additionally verify Origin, Turnstile, session and public data
 * scope. Future generation must reserve atomic Redis budgets and validate history.
 * This does not probe credentials, Redis connectivity or Turnstile validity.
 */
export function isDemoChatEnabled(): boolean {
  // Same non-empty C2 marker as service-policy; deny even malformed C2 config
  // without resolving a database URL or exposing configuration error details.
  const c2Mode = process.env.C2_RUNTIME_MODE;
  if (c2Mode !== undefined && c2Mode !== "") return false;
  if (process.env.PUBLIC_DEMO_MODE !== "true" || process.env.DEMO_CHAT_ENABLED !== "true") {
    return false;
  }

  // Preserve Redis.fromEnv() names and precedence, independent of SaaS backend.
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return [
    process.env.DEMO_WORKSPACE_ID,
    process.env.DEMO_GROQ_API_KEY,
    process.env.NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY,
    process.env.DEMO_TURNSTILE_SECRET_KEY,
    redisUrl,
    redisToken,
  ].every((value) => Boolean(value?.trim()));
}

export function requireDemoChatEnabled(): void {
  if (!isDemoChatEnabled()) throw new DemoChatConfigurationError();
}
