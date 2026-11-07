import "server-only";

import { DEMO_CHAT_OPERATION_TTL_MS, DEMO_CHAT_REDIS } from "./chat-config";
import { demoChatId } from "./chat-security";

// Preparation only: no Redis client, connection, runner or automatic migration.
// A future, explicitly authorized operator supplies bounded HSCAN results while
// every old and new writer is stopped. Compare all records before changing TTLs.
export const MIGRATE_DEMO_OPERATION_RETENTION = `
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000.0 + math.floor(tonumber(t[2]) / 1000)
if #ARGV == 0 or #ARGV % 3 ~= 0 or #ARGV > 300 then return 503 end
if redis.call('PTTL', KEYS[1]) ~= -1 then return 409 end
for i = 1, #ARGV, 3 do
  local createdAt = tonumber(ARGV[i + 2])
  if not createdAt or createdAt < 0 or createdAt ~= math.floor(createdAt) or createdAt > now then return 503 end
  if redis.call('HGET', KEYS[1], ARGV[i]) ~= ARGV[i + 1] then return 409 end
end
for i = 1, #ARGV, 3 do
  local result = redis.call('HPEXPIREAT', KEYS[1], tonumber(ARGV[i + 2]) + ${DEMO_CHAT_OPERATION_TTL_MS}, 'FIELDS', 1, ARGV[i])
  if result[1] ~= 1 and result[1] ~= 2 then error('Operation retention migration failed') end
end
return 1`;

export function prepareDemoOperationRetentionBatch(records: readonly (readonly [string, string])[]) {
  if (records.length === 0 || records.length > 100) throw new Error("Invalid operation retention batch.");
  const seen = new Set<string>();
  const args: (string | number)[] = [];
  for (const [operationId, expectedRecord] of records) {
    let record;
    try { record = JSON.parse(expectedRecord); }
    catch { throw new Error("Invalid legacy operation record."); }
    if (!demoChatId.test(operationId) || seen.has(operationId) || !record || record.schema !== 1
      || typeof record.leaseId !== "string" || !demoChatId.test(record.leaseId)
      || typeof record.scopeHash !== "string" || !/^[a-f0-9]{64}$/.test(record.scopeHash)
      || !Number.isSafeInteger(record.reservedAt) || record.reservedAt < 0
      || !["attempted", "reserved"].includes(record.reservationState)) {
      throw new Error("Invalid legacy operation record.");
    }
    seen.add(operationId);
    args.push(operationId, expectedRecord, record.reservedAt);
  }
  return { script: MIGRATE_DEMO_OPERATION_RETENTION, keys: [`${DEMO_CHAT_REDIS.prefix}:operations`], args };
}
