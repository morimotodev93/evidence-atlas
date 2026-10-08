"use server";

import { redirect } from "next/navigation";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";
import { requireApplicationEnabled } from "@/lib/deployment-mode";
import { db } from "@/prisma/db";

export async function detachFindingSource(findingId: string, sourceId: string) {
  requireApplicationEnabled();

  const finding = await db.orm.public.Finding.where({
    id: findingId,
  }).first();

  if (!finding) {
    throw new Error("Finding not found.");
  }

  const user = await requireUser();

  try {
    await requireResearchAccess(user.id, finding.researchId);
  } catch (error) {
    if (error instanceof ResearchAccessError) {
      throw new Error("Research not found.");
    }

    throw error;
  }

  const findingSource = await db.orm.public.FindingSource.where({
    findingId,
    sourceId,
  }).first();

  if (!findingSource) {
    throw new Error("Supporting source not found.");
  }

  await db.orm.public.FindingSource.where({
    findingId,
    sourceId,
  }).delete();

  redirect(`/research/${finding.researchId}`);
}
