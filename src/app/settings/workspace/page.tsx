import { notFound } from "next/navigation";

import { requireUser } from "@/auth/requireUser";
import { requireWorkspaceAccess } from "@/auth/requireWorkspaceAccess";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { db } from "@/prisma/db";
import { translate } from "@/lib/i18n/translate";
import { requireCurrentWorkspace } from "@/workspace/requireCurrentWorkspace";
import { WorkspaceMemberRoleForm } from "./_components/workspace-member-role-form";

export default async function WorkspaceSettingsPage() {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace(user.id);

  const currentMembership = await requireWorkspaceAccess(user.id, workspace.id);

  const currentWorkspace = await db.orm.public.Workspace.where({
    id: workspace.id,
  })
    .include("memberships", (membership) => membership.include("user"))
    .first();

  if (!currentWorkspace) {
    notFound();
  }

  return (
    <AppShell>
      {(locale) => (
        <main lang={locale} className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <header className="mb-8">
            <p className="text-sm text-muted-foreground">{translate("nav.workspace", locale)}</p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {currentWorkspace.name}
              </h1>

              <Badge variant="outline">{translate(currentMembership.role === "ADMIN" ? "organization.adminBadge" : "organization.memberBadge", locale)}</Badge>
            </div>
          </header>

          <section aria-labelledby="workspace-members-heading">
            <div className="mb-4">
              <h2
                id="workspace-members-heading"
                className="text-lg font-semibold tracking-tight"
              >
                {translate("organization.members", locale)}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {translate("workspace.membersDescription", locale)}
              </p>
            </div>

            <div className="divide-y rounded-lg border">
              {currentWorkspace.memberships.map((membership) => (
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

                  {currentMembership.role === "ADMIN" ? (
                    <WorkspaceMemberRoleForm
                      locale={locale}
                      workspaceId={currentWorkspace.id}
                      userId={membership.userId}
                      initialRole={membership.role}
                    />
                  ) : (
                    <Badge variant="secondary">{translate(membership.role === "ADMIN" ? "organization.adminBadge" : "organization.memberBadge", locale)}</Badge>
                  )}
                </div>
              ))}
            </div>
          </section>
        </main>
      )}
    </AppShell>
  );
}
