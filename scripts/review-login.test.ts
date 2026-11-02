import { expect, it, vi } from "vitest";
import { request } from "node:http";
import { reviewLogin } from "./review-login.ts";

const state = vi.hoisted(() => ({ writes: [] as {sql: string; values: string[]}[] }));
vi.mock("./review-database.ts", () => ({
  reviewClient: async () => ({
    query: async (sql: string, values: string[]) => { state.writes.push({sql, values}); },
    end: async () => {},
  }),
}));

it("local login rejects unrelated/cross-origin requests, then issues one ordinary fixture session without logging its token", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    await reviewLogin({ url: "unused mocked URL", password: "unused", authSecret: "unused" }, {
      demoWorkspaceId: "demo", demoResearchId: "demo-research", userId: "review-user", workspaceId: "review-workspace", emptyWorkspaceId: "empty", researchId: "research",
    });
    const message = String(log.mock.calls[0][0]);
    const link = message.match(/http:\/\/127\.0\.0\.1:3101\/[a-f0-9]+/)![0];
    try {
      for (const [url, init] of [
        ["http://127.0.0.1:3101/unrelated", {}],
        [link, { method: "POST" }],
        [link, { headers: { Origin: "https://untrusted.example" } }],
        [link, { headers: { Host: "untrusted.example" } }],
      ] as const) {
        // node:http preserves an explicit Host header (fetch may rewrite it).
        const status = await new Promise<number | undefined>((resolve, reject) => {
          const req = request(url, init, (response) => {
            response.resume(); response.on("end", () => resolve(response.statusCode));
          });
          req.on("error", reject); req.end();
        });
        expect(status).toBe(403);
      }
      expect(state.writes).toHaveLength(0);
    } finally {
      // Consume/close the bridge even if an assertion fails.
      const response = await fetch(link, { redirect: "manual" });
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("http://127.0.0.1:3100/research");
      const cookies = response.headers.getSetCookie();
      expect(cookies[0]).toContain("authjs.session-token=");
      expect(cookies[0]).toContain("HttpOnly; SameSite=Lax; Max-Age=28800");
      expect(cookies[1]).toContain("evidence_atlas_workspace=review-workspace;");
      expect(state.writes).toHaveLength(1);
      expect(state.writes[0].sql).toContain("INSERT INTO session");
      expect(state.writes[0].values[1]).toBe("review-user");
      expect(state.writes[0].values[0]).toMatch(/^[a-f0-9]{64}$/);
      expect(message).not.toContain(state.writes[0].values[0]);
    }
  } finally { log.mockRestore(); }
});
