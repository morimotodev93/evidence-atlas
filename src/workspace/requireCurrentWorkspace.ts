// src/workspace/requireCurrentWorkspace.ts

import { getAccessibleWorkspaces } from "./getAccessibleWorkspaces";

export async function requireCurrentWorkspace(userId: string) {
  const [workspace] = await getAccessibleWorkspaces(userId);

  if (!workspace) {
    throw new Error("No accessible workspace.");
  }

  return workspace;
}
