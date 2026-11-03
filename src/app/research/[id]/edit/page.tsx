import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  requireResearchAccess,
  ResearchAccessError,
} from "@/auth/requireResearchAccess";
import { requireUser } from "@/auth/requireUser";

import { updateResearch } from "@/app/research/_actions/updateResearch";
import { translate } from "@/lib/i18n/translate";

type ResearchEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ResearchEditPage({
  params,
}: ResearchEditPageProps) {
  const { id } = await params;

  const user = await requireUser();

  let research;

  try {
    research = await requireResearchAccess(user.id, id);
  } catch (error) {
    if (error instanceof ResearchAccessError) {
      notFound();
    }

    throw error;
  }

  return (
    <AppShell>
      {(locale) => <main lang={locale} className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <Link
            href={`/research/${research.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {translate("saasResearch.backToResearch", locale)}
          </Link>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            {translate("saasResearch.editTitle", locale)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {translate("saasResearch.editDescription", locale)}
          </p>
        </div>

        <form
          action={updateResearch.bind(null, research.id)}
          className="space-y-6"
        >
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              {translate("saasResearch.title", locale)}
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
              {translate("saasResearch.description", locale)}
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
              {translate("saasResearch.cancel", locale)}
            </Link>

            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {translate("saasResearch.saveChanges", locale)}
            </button>
          </div>
        </form>
      </main>}
    </AppShell>
  );
}
