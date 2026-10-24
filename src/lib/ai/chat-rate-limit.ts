import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { requireExternalServiceEnabled } from "@/lib/c2/service-policy";

type ChatRateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  reason?: string;
};

type ChatRateLimit = {
  limit(identifier: string): Promise<ChatRateLimitResult>;
};

export class ChatRateLimitConfigurationError extends Error {
  constructor() {
    super("Chat rate limiting is not configured for this environment.");
    this.name = "ChatRateLimitConfigurationError";
  }
}

const MEMORY_LIMIT = 10;
const MEMORY_WINDOW_MS = 60_000;

// Development only: one process, at most ten timestamps per active identifier.
// Prune all expired identifiers on the next check; no background timer is needed.
class MemoryChatRateLimit implements ChatRateLimit {
  private readonly requests = new Map<string, number[]>();

  async limit(identifier: string): Promise<ChatRateLimitResult> {
    const now = Date.now();
    for (const [key, timestamps] of this.requests) {
      const active = timestamps.filter((timestamp) => timestamp > now - MEMORY_WINDOW_MS);
      if (active.length === 0) this.requests.delete(key);
      else this.requests.set(key, active);
    }

    const timestamps = this.requests.get(identifier) ?? [];
    const success = timestamps.length < MEMORY_LIMIT;
    if (success) timestamps.push(now);
    this.requests.set(identifier, timestamps);

    return {
      success,
      limit: MEMORY_LIMIT,
      remaining: MEMORY_LIMIT - timestamps.length,
      reset: timestamps[0] + MEMORY_WINDOW_MS,
    };
  }
}

let chatRateLimit: Ratelimit | undefined;
let memoryRateLimit: MemoryChatRateLimit | undefined;

export function getChatRateLimit(): ChatRateLimit {
  requireExternalServiceEnabled();

  const backend = process.env.CHAT_RATE_LIMIT_BACKEND?.trim() || "upstash";
  if (backend === "memory") {
    if (process.env.NODE_ENV !== "development") {
      throw new ChatRateLimitConfigurationError();
    }
    return (memoryRateLimit ??= new MemoryChatRateLimit());
  }

  if (backend !== "upstash") throw new ChatRateLimitConfigurationError();

  // Keep the installed Redis.fromEnv() fallback names and precedence.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url?.trim() || !token?.trim()) throw new ChatRateLimitConfigurationError();

  return (chatRateLimit ??= new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "evidence-atlas:ai-chat",
    analytics: true,
  }));
}
