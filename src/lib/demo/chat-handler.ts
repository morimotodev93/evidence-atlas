import "server-only";

import { DemoChatConfigurationError } from "./chat-config";
import { getDemoChatStore } from "./chat-store";
import { buildDemoChatContext, type DemoPublicResearch } from "./chat-context";
import { generateDemoAnswer, runDemoGeneration } from "./chat-generation";
import {
  DemoChatError, demoSessionCookie, readDemoChatInput, readDemoSession,
  requireDemoChatOrigin, verifyDemoTurnstile,
} from "./chat-security";

const defaults = {
  store: getDemoChatStore,
  verify: verifyDemoTurnstile,
  // Lazy import: disabled / malformed requests do not initialize the DB client.
  publicResearch: async (id: string) => (await import("./read")).getDemoResearch(id),
  generate: generateDemoAnswer,
};

type Dependencies = {
  store: typeof getDemoChatStore;
  verify: typeof verifyDemoTurnstile;
  publicResearch: (id: string) => Promise<DemoPublicResearch | null>;
  generate?: typeof generateDemoAnswer;
};

export function createDemoChatHandler(deps: Dependencies = defaults) {
  return async (request: Request): Promise<Response> => {
    try {
      const hostname = requireDemoChatOrigin(request);
      const input = await readDemoChatInput(request);
      if (input.operation === "session") {
        await deps.verify(input.turnstileToken, hostname);
        if (!await deps.publicResearch(input.researchId)) throw new DemoChatError(404);
        const { sessionId, threadId } = await deps.store().start(input.turnstileToken, input.researchId);
        return Response.json({ threadId }, {
          status: 201, headers: { "Cache-Control": "no-store", "Set-Cookie": demoSessionCookie(sessionId) },
        });
      }
      const session = readDemoSession(request);
      const store = deps.store();
      await store.check(session, input.threadId, input.researchId);
      const research = await deps.publicResearch(input.researchId);
      if (!research) throw new DemoChatError(404);
      if (request.signal.aborted) throw new DemoChatError(503);
      const lease = await store.reserve(session, input.threadId, input.researchId);
      const answer = await runDemoGeneration(store, lease, () => buildDemoChatContext(research),
        input.message, request.signal, deps.generate);
      return Response.json(answer, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const status = error instanceof DemoChatError ? error.status
        : error instanceof DemoChatConfigurationError ? 404 : 503;
      return Response.json({ error: "Demo Chat unavailable." }, {
        status, headers: { "Cache-Control": "no-store" },
      });
    }
  };
}
