import { AppShell } from "@/components/layout/app-shell";
import { createResearch } from "@/app/research/_actions/createResearch";
import { requireUser } from "@/auth/requireUser";
import { translate } from "@/lib/i18n/translate";

export default async function NewResearchPage() {
  await requireUser();

  return (
    <AppShell>
      {(locale) => <main lang={locale} className="mx-auto w-full max-w-2xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {translate("saasResearch.create", locale)}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {translate("saasResearch.createDescription", locale)}
          </p>
        </div>

        <form action={createResearch} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              {translate("saasResearch.title", locale)}
            </label>

            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder={translate("saasResearch.titlePlaceholder", locale)}
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
              placeholder={translate("saasResearch.descriptionPlaceholder", locale)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {translate("saasResearch.create", locale)}
            </button>
          </div>
        </form>
      </main>}
    </AppShell>
  );
}
