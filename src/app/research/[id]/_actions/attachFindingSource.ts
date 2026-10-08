"use server";

import { redirect } from "next/navigation";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";
import { requireApplicationEnabled } from "@/lib/deployment-mode";
import { db } from "@/prisma/db";

export type AttachFindingSourceState = {
  error: string | null;
};

export async function attachFindingSource(
  findingId: string,
  _previousState: AttachFindingSourceState,
  formData: FormData,
): Promise<AttachFindingSourceState> {
  requireApplicationEnabled();

  const sourceId = String(formData.get("sourceId") ?? "");

  if (!sourceId) {
    return {
      error: "Please select a source.",
    };
  }

  const finding = await db.orm.public.Finding.where({
    id: findingId,
  }).first();

  if (!finding) {
    return {
      error: "Finding not found.",
    };
  }

  const user = await requireUser();

  try {
    await requireResearchAccess(user.id, finding.researchId);
  } catch (error) {
    if (error instanceof ResearchAccessError) {
      return { error: "Research not found." };
    }

    throw error;
  }

  const source = await db.orm.public.Source.where({
    id: sourceId,
  }).first();

  if (!source) {
    return {
      error: "Source not found.",
    };
  }

  if (finding.researchId !== source.researchId) {
    return {
      error: "Source does not belong to this research.",
    };
  }

  try {
    await db.orm.public.FindingSource.create({
      findingId: finding.id,
      sourceId: source.id,
    });
  } catch {
    return {
      error: "Failed to attach source. Please try again.",
    };
  }

  redirect(`/research/${finding.researchId}`);
}
