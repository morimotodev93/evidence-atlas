import { createResearch } from "@/app/research/_actions/createResearch";

export default function NewResearchPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Research
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Start a new research project and document what you discover.
        </p>
      </div>

      <form action={createResearch} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>

          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Enter a research title"
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
            placeholder="Describe what you want to investigate."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Create Research
          </button>
        </div>
      </form>
    </main>
  );
}
