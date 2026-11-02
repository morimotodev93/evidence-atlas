import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { reviewClient } from "./review-database.ts";
import { REVIEW_PORT, type reviewConfig } from "./review-policy.ts";
import type { reviewFixtures } from "./review-fixtures.ts";

export async function reviewLogin(config: ReturnType<typeof reviewConfig>, ids: Awaited<ReturnType<typeof reviewFixtures>>) {
  // No route/provider/auth callback is changed in the application. This explicit
  // CLI writes a normal Auth.js session only in the already-verified local DB.
  const nonce = randomBytes(24).toString("hex");
  let used = false;
  const server = createServer(async (request, response) => {
    if (used || request.method !== "GET" || request.url !== `/${nonce}` ||
        request.headers.host !== "127.0.0.1:3101" || request.headers.origin ||
        (request.headers["sec-fetch-site"] && request.headers["sec-fetch-site"] !== "none")) {
      response.writeHead(403).end(); return;
    }
    used = true;
    let client;
    try {
      client = await reviewClient(config, false);
      const token = randomBytes(32).toString("hex");
      await client.query('INSERT INTO session ("sessionToken","userId",expires) VALUES ($1,$2,now()+interval \'8 hours\')', [token, ids.userId]);
      response.writeHead(302, { Location: `http://127.0.0.1:${REVIEW_PORT}/research`,
        "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
        "Set-Cookie": [`authjs.session-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`, `evidence_atlas_workspace=${ids.workspaceId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`] }).end();
    } catch { response.writeHead(500).end("Local review session failed."); }
    finally { await client?.end(); server.close(); }
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(3101, "127.0.0.1", resolve); });
  console.log(`Open this one-use local login link within 2 minutes: http://127.0.0.1:3101/${nonce}`);
  const timer = setTimeout(() => server.close(), 120_000);
  server.on("close", () => clearTimeout(timer));
}
