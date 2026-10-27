import { DEMO_CHAT_REDIS } from "../src/lib/demo/chat-config";

/** No dotenv loading and no fallback to application credentials. */
export function redisVerificationTarget(env: Record<string, string | undefined>) {
  const url = env.DEMO_CHAT_TEST_REDIS_REST_URL;
  const token = env.DEMO_CHAT_TEST_REDIS_REST_TOKEN;
  if (env.DEMO_CHAT_REDIS_VERIFY !== "dedicated-test-database" || !url || !token?.trim()) {
    throw new Error("Explicit dedicated test database opt-in is required.");
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash
      || parsed.pathname !== "/" || !parsed.hostname.endsWith(".upstash.io")) throw new Error();
    for (const configured of [env.UPSTASH_REDIS_REST_URL, env.KV_REST_API_URL]) {
      if (configured && new URL(configured).origin === parsed.origin) throw new Error();
    }
    if ([env.UPSTASH_REDIS_REST_TOKEN, env.KV_REST_API_TOKEN].includes(token)) throw new Error();
  } catch { throw new Error("Unsafe Redis verification target."); }
  return { url, token };
}

// TTL is installed in the SAME EVAL, even after a Lua runtime error. Redis Lua
// errors do not roll back earlier writes. No client-side finally is relied on.
export function boundedVerificationScript(script: string, keys: string[], prefix: string) {
  if (!/^evidence-atlas:demo-chat:test:[a-zA-Z0-9_-]{1,80}$/.test(prefix)
    || prefix.startsWith(DEMO_CHAT_REDIS.prefix) || !keys.length
    || keys.some((key) => !key.startsWith(`${prefix}:`))) {
    throw new Error("Unsafe Redis verification keys.");
  }
  return `local ok, result = pcall(function()\n${script}\nend)
for _, key in ipairs(KEYS) do
  local ttl = redis.call('PTTL', key)
  if ttl == -1 or ttl > 900000 then redis.call('PEXPIRE', key, 900000) end
end
if not ok then return redis.error_reply('Verification Lua failed') end
return result`;
}
