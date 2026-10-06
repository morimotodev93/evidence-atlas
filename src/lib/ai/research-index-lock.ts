import { createHash } from "node:crypto";

import { db } from "@/prisma/db";

function researchIndexLockKeys(researchId: string) {
  const digest = createHash("sha256")
    .update(`evidence-atlas:research-index:${researchId}`)
    .digest();

  return [digest.readInt32BE(0), digest.readInt32BE(4)] as const;
}

export function buildResearchIndexLockPlan(researchId: string) {
  const [key1, key2] = researchIndexLockKeys(researchId);

  return db.raw.sql`
    WITH research_index_lock AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(
        ${key1}::int4,
        ${key2}::int4
      )
    )
    SELECT 1::int4 AS "locked"
    FROM research_index_lock
  `
    .returnsRow({
      locked: "pg/int4@1",
    })
    .build();
}
