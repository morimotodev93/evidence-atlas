import * as Sentry from "@sentry/nextjs";
import { isC2Runtime } from "@/lib/c2/service-policy";

export async function register() {
  if (isC2Runtime()) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: typeof Sentry.captureRequestError = (...args) => {
  if (!isC2Runtime()) return Sentry.captureRequestError(...args);
};
