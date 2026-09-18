import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/prisma/db";

import { updateResearch } from "@/app/research/_actions/updateResearch";

type ResearchEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ResearchEditPage({
  params,
}: ResearchEditPageProps) {
  const { id } = await params;

  const research = await db.orm.public.Research.where({
    id,
  }).first();

  if (!research) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <Link
          href={`/research/${research.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Research
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Edit Research
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the research title and description.
        </p>
      </div>

      <form
        action={updateResearch.bind(null, research.id)}
        className="space-y-6"
      >
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>

          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={research.title}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>

          <textarea
            id="description"
            name="description"
            rows={6}
            defaultValue={research.description ?? ""}
            className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/research/${research.id}`}
            className="rounded-md border px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Save Changes
          </button>
        </div>
      </form>
    </main>
  );
}
