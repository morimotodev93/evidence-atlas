import { resolveRuntimeDatabaseUrl } from "./runtime-database.ts";

// Server/build configuration only. No NEXT_PUBLIC flag or request input.
export function isC2Runtime(): boolean {
  const mode = process.env.C2_RUNTIME_MODE;
  if (mode === undefined || mode === "") return false;
  resolveRuntimeDatabaseUrl(process.env);
  return true;
}
export function requireExternalServiceEnabled() {
  if (isC2Runtime()) throw new Error("External services are disabled in C2 runtime.");
}
export function c2ServiceResponse(): Response | undefined {
  if (!isC2Runtime()) return;
  return Response.json({ error: "Service disabled in C2 runtime." }, {
    status: 503, headers: { "Cache-Control": "no-store" },
  });
}
