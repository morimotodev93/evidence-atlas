"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";

import { requireUser } from "@/auth/requireUser";
import { requireWorkspaceAccess } from "@/auth/requireWorkspaceAccess";

import { CURRENT_WORKSPACE_COOKIE } from "./currentWorkspace";

export async function switchWorkspace(workspaceId: string) {
  const user = await requireUser();

  await requireWorkspaceAccess(user.id, workspaceId);

  const cookieStore = await cookies();

  cookieStore.set(CURRENT_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  refresh();
}
