// src/app/api/auth/[...nextauth]/route.ts

import { handlers } from "@/auth";
import type { NextRequest } from "next/server";
import { isPublicDemoMode } from "@/lib/deployment-mode";

export async function GET(request: NextRequest) {
  if (isPublicDemoMode()) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (isPublicDemoMode()) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return handlers.POST(request);
}
