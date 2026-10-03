import { notFound } from "next/navigation";

import { requireOrganizationAccess } from "@/auth/requireOrganizationAccess";
import { requireUser } from "@/auth/requireUser";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { db } from "@/prisma/db";
import { requireCurrentWorkspace } from "@/workspace/requireCurrentWorkspace";

export default async function OrganizationSettingsPage() {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace(user.id);

  const currentMembership = await requireOrganizationAccess(
    user.id,
    workspace.organizationId,
  );

  const organization = await db.orm.public.Organization.where({
    id: workspace.organizationId,
  })
    .include("memberships", (membership) => membership.include("user"))
    .first();

  if (!organization) {
    notFound();
  }

  return (
    <>
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-8">
          <p className="text-sm text-muted-foreground">Organization</p>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {organization.name}
            </h1>

            <Badge variant="outline">{currentMembership.role}</Badge>
          </div>
        </header>

        <section aria-labelledby="members-heading">
          <div className="mb-4">
            <h2
              id="members-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Members
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              People who belong to this organization.
            </p>
          </div>

          <div className="divide-y rounded-lg border">
            {organization.memberships.map((membership) => (
              <div
                key={membership.userId}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {membership.user.name ?? membership.user.email}
                  </p>

                  {membership.user.name && (
                    <p className="truncate text-sm text-muted-foreground">
                      {membership.user.email}
                    </p>
                  )}
                </div>

                <Badge variant="secondary">{membership.role}</Badge>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
