import "server-only";

import { DemoChatConfigurationError } from "./chat-config";
import { createDemoChatOperationId, getDemoChatStore } from "./chat-store";
import { buildDemoChatContext, type DemoPublicResearch } from "./chat-context";
import { generateDemoAnswer, runDemoGeneration } from "./chat-generation";
import { DemoChatFailure, logDemoChatFailure, type DemoChatPhase } from "./chat-diagnostics";
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
    let phase: DemoChatPhase = "ingress";
    try {
      const hostname = requireDemoChatOrigin(request);
      const input = await readDemoChatInput(request);
      if (input.operation === "session") {
        phase = "verification";
        await deps.verify(input.turnstileToken, hostname);
        phase = "research";
        if (!await deps.publicResearch(input.researchId)) throw new DemoChatError(404);
        phase = "session";
        const { sessionId, threadId } = await deps.store().start(input.turnstileToken, input.researchId);
        return Response.json({ threadId }, {
          status: 201, headers: { "Cache-Control": "no-store", "Set-Cookie": demoSessionCookie(sessionId) },
        });
      }
      const session = readDemoSession(request);
      phase = "store";
      const store = deps.store();
      phase = "check";
      await store.check(session, input.threadId, input.researchId);
      phase = "research";
      const research = await deps.publicResearch(input.researchId);
      if (!research) throw new DemoChatError(404);
      if (request.signal.aborted) throw new DemoChatFailure("request_aborted", "preparation");
      const operationId = createDemoChatOperationId();
      phase = "reserve";
      const lease = await store.reserve(session, input.threadId, input.researchId, operationId);
      phase = "generation";
      const answer = await runDemoGeneration(store, lease, () => buildDemoChatContext(research),
        input.message, request.signal, deps.generate);
      return Response.json(answer, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const status = error instanceof DemoChatError ? error.status
        : error instanceof DemoChatConfigurationError ? 404 : 503;
      if (status === 503) logDemoChatFailure(error, phase);
      return Response.json({ error: "Demo Chat unavailable." }, {
        status, headers: { "Cache-Control": "no-store" },
      });
    }
  };
}
