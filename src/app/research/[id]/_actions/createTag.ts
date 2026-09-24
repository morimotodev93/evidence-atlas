"use server";

import { redirect } from "next/navigation";

import { db } from "@/prisma/db";
import { tagSchema } from "@/types/research/tag";

export type CreateTagState = {
  error: string | null;
};

export async function createTag(
  researchId: string,
  _previousState: CreateTagState,
  formData: FormData,
): Promise<CreateTagState> {
  const result = tagSchema.safeParse({
    name: String(formData.get("name") ?? ""),
  });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Invalid tag.",
    };
  }

  const research = await db.orm.public.Research.where({
    id: researchId,
  }).first();

  if (!research) {
    return {
      error: "Research not found.",
    };
  }

  try {
    const existingTag = await db.orm.public.Tag.where({
      workspaceId: research.workspaceId,
      name: result.data.name,
    }).first();

    if (existingTag) {
      const existingResearchTag = await db.orm.public.ResearchTag.where({
        researchId: research.id,
        tagId: existingTag.id,
      }).first();

      if (existingResearchTag) {
        return {
          error: "Tag is already attached.",
        };
      }

      await db.orm.public.ResearchTag.create({
        researchId: research.id,
        tagId: existingTag.id,
      });
    } else {
      await db.transaction(async (tx) => {
        const newTag = await tx.orm.public.Tag.create({
          workspaceId: research.workspaceId,
          name: result.data.name,
        });

        await tx.orm.public.ResearchTag.create({
          researchId: research.id,
          tagId: newTag.id,
        });
      });
    }
  } catch (error) {
    if ((error as { sqlState?: string }).sqlState === "23505") {
      return {
        error: "Tag is already attached.",
      };
    }
    return {
      error: "Failed to attach tag. Please try again.",
    };
  }

  redirect(`/research/${research.id}`);
}
