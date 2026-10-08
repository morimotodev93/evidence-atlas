import type { serve } from "inngest/next";
import type { NextRequest } from "next/server";

import { isPublicDemoMode } from "@/lib/deployment-mode";

let handlers: Promise<ReturnType<typeof serve>> | undefined;

function getHandlers() {
  // Demo requests must not initialize the SDK/client/indexing dependencies.
  return (handlers ??= Promise.all([
    import("inngest/next"),
    import("@/inngest/client"),
    import("@/inngest/functions/index-research"),
  ]).then(
    ([
      { serve },
      { inngest, requireProductionSafeInngestMode },
      { indexResearchFunction },
    ]) => {
      requireProductionSafeInngestMode();

      return serve({
        client: inngest,
        functions: [indexResearchFunction],
        // Supported SDK policy: signed Cloud/in-band sync remains available.
        // Local development keeps the previous SDK/env behavior.
        enableUnauthedSync:
          process.env.NODE_ENV === "production" ? false : undefined,
      });
    },
  ));
}

async function dispatch(
  method: "GET" | "POST" | "PUT",
  request: NextRequest,
  context: unknown,
) {
  if (isPublicDemoMode()) {
    return new Response(null, {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  return (await getHandlers())[method](request, context);
}

export async function GET(request: NextRequest, context?: unknown) {
  return dispatch("GET", request, context);
}

export async function POST(request: NextRequest, context?: unknown) {
  return dispatch("POST", request, context);
}

export async function PUT(request: NextRequest, context?: unknown) {
  return dispatch("PUT", request, context);
}
