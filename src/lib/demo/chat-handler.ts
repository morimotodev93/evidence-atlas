import "server-only";

import { DemoChatConfigurationError } from "./chat-config";
import { getDemoChatStore } from "./chat-store";
import {
  DemoChatError, demoSessionCookie, readDemoChatInput, readDemoSession,
  requireDemoChatOrigin, verifyDemoTurnstile,
} from "./chat-security";

const defaults = {
  store: getDemoChatStore,
  verify: verifyDemoTurnstile,
  // Lazy import: disabled / malformed requests do not initialize the DB client.
  publicResearch: async (id: string) => (await import("./read")).getDemoResearch(id),
};

export function createDemoChatHandler(deps = defaults) {
  return async (request: Request): Promise<Response> => {
    try {
      const hostname = requireDemoChatOrigin(request);
      const input = await readDemoChatInput(request);
      if (!await deps.publicResearch(input.researchId)) throw new DemoChatError(404);
      if (input.operation === "session") {
        await deps.verify(input.turnstileToken, hostname);
        const { sessionId, threadId } = await deps.store().start(input.turnstileToken, input.researchId);
        return Response.json({ threadId }, {
          status: 201, headers: { "Cache-Control": "no-store", "Set-Cookie": demoSessionCookie(sessionId) },
        });
      }
      await deps.store().check(readDemoSession(request), input.threadId, input.researchId);
      // No model, generation, retrieval, embeddings, DB writes or question quota
      // reservation until the bounded context/history/response contract is ready.
      throw new DemoChatError(503);
    } catch (error) {
      const status = error instanceof DemoChatError ? error.status
        : error instanceof DemoChatConfigurationError ? 404 : 503;
      return Response.json({ error: "Demo Chat unavailable." }, {
        status, headers: { "Cache-Control": "no-store" },
      });
    }
  };
}
