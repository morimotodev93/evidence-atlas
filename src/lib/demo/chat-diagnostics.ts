import "server-only";

import { DemoChatError } from "./chat-security";

export type DemoChatFailureCategory =
  | "provider_error" | "generation_timeout" | "invalid_response"
  | "generation_incomplete" | "lease_error" | "request_aborted" | "unexpected_error";
export type DemoChatPhase =
  | "ingress" | "verification" | "research" | "store" | "session" | "check" | "reserve"
  | "context" | "preparation" | "generation" | "validation" | "renew" | "release";

// Internal metadata only: never retain the upstream error, message or stack.
export class DemoChatFailure extends DemoChatError {
  constructor(public readonly category: DemoChatFailureCategory, public readonly phase: DemoChatPhase) {
    super(503);
  }
}

export function logDemoChatFailure(error: unknown, phase: DemoChatPhase) {
  const category = error instanceof DemoChatFailure ? error.category
    : ["store", "session", "check", "reserve"].includes(phase) ? "lease_error" : "unexpected_error";
  const failurePhase = error instanceof DemoChatFailure ? error.phase : phase;
  try {
    console.error(`[demo-chat] failure category=${category} phase=${failurePhase} status=503`);
  } catch {
    // Observability must never alter the response or lease lifecycle.
  }
}
