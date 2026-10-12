// src/lib/ai/chat-rate-limit.ts

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { requireExternalServiceEnabled } from "@/lib/c2/service-policy";

let chatRateLimit: Ratelimit | undefined;

export function getChatRateLimit() {
  requireExternalServiceEnabled();
  return (chatRateLimit ??= new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "evidence-atlas:ai-chat",
    analytics: true,
  }));
}
