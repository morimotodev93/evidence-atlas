import { notFound } from "next/navigation";

import { requireUser } from "@/auth/requireUser";
import { requireWorkspaceAccess } from "@/auth/requireWorkspaceAccess";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { db } from "@/prisma/db";
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
    <>
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-8">
          <p className="text-sm text-muted-foreground">Workspace</p>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {currentWorkspace.name}
            </h1>

            <Badge variant="outline">{currentMembership.role}</Badge>
          </div>
        </header>

        <section aria-labelledby="workspace-members-heading">
          <div className="mb-4">
            <h2
              id="workspace-members-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Members
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              People who have access to this workspace.
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
                    workspaceId={currentWorkspace.id}
                    userId={membership.userId}
                    initialRole={membership.role}
                  />
                ) : (
                  <Badge variant="secondary">{membership.role}</Badge>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
