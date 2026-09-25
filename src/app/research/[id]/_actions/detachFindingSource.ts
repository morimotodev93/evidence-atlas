"use server";

import { redirect } from "next/navigation";

import { db } from "@/prisma/db";

export async function detachFindingSource(findingId: string, sourceId: string) {
  const finding = await db.orm.public.Finding.where({
    id: findingId,
  }).first();

  if (!finding) {
    throw new Error("Finding not found.");
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
