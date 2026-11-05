import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { updateOrganizationMemberRole } from "@/app/settings/organization/_actions/updateOrganizationMemberRole";
import { updateWorkspaceMemberRole } from "@/app/settings/workspace/_actions/updateWorkspaceMemberRole";

type Membership = {
  userId: string;
  role: "ADMIN" | "MEMBER";
  organizationId?: string;
  workspaceId?: string;
};
type Filter = Partial<Omit<Membership, "role">>;

const mocks = vi.hoisted(() => {
  function model() {
    return {
      rows: [] as Membership[],
      where: vi.fn(),
      first: vi.fn(),
      all: vi.fn(),
      update: vi.fn(),
    };
  }

  return {
    models: { Membership: model(), WorkspaceMembership: model() },
    auth: vi.fn(),
    redirect: vi.fn(),
    notFound: vi.fn(),
    cookies: vi.fn(),
    revalidatePath: vi.fn(),
    refresh: vi.fn(),
  };
});

// Keep requireUser and both access/admin guard chains real. Only their I/O is mocked.
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: mocks.models } } }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  refresh: mocks.refresh,
}));

const actorId = "acting-user";
const targetId = "target-user";
const state = { error: null };
const redirectError = new Error("NEXT_REDIRECT");

function roleForm(role: Membership["role"]) {
  const formData = new FormData();
  formData.set("role", role);
  return formData;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PUBLIC_DEMO_MODE", "false");
  mocks.auth.mockResolvedValue({ user: { id: actorId } });
  mocks.redirect.mockImplementation(() => { throw redirectError; });
  mocks.notFound.mockImplementation(() => { throw new Error("Unexpected 404"); });

  for (const model of Object.values(mocks.models)) {
    model.rows = [];
    const matches = (filter: Filter) => model.rows.filter((row) =>
      Object.entries(filter).every(([key, value]) => row[key as keyof Membership] === value),
    );
    model.first.mockImplementation(async (filter: Filter) => matches(filter)[0] ?? null);
    model.all.mockImplementation(async (filter: Filter) => matches(filter));
    model.update.mockResolvedValue(undefined);
    // Bind each terminal to its own predicate so a later where() cannot hide an
    // unscoped target lookup, admin count or update.
    model.where.mockImplementation((filter: Filter) => ({
      first: () => model.first(filter),
      all: () => model.all(filter),
      update: (change: { role: Membership["role"] }) => model.update(filter, change),
    }));
  }
});
afterEach(() => vi.unstubAllEnvs());

function expectNoEffects() {
  for (const model of Object.values(mocks.models)) {
    expect(model.update).not.toHaveBeenCalled();
  }
  expect(mocks.cookies).not.toHaveBeenCalled();
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
  expect(mocks.refresh).not.toHaveBeenCalled();
}

const scopes = [
  {
    name: "Organization",
    model: "Membership",
    otherModel: "WorkspaceMembership",
    key: "organizationId",
    id: "organization-id",
    otherId: "other-organization-id",
    oppositeScope: { workspaceId: "workspace-id" },
    action: updateOrganizationMemberRole,
    accessError: "Forbidden",
    invalidRoleCode: "ORGANIZATION_INVALID_ROLE",
    lastAdminCode: "ORGANIZATION_LAST_ADMIN",
    path: "/settings/organization",
  },
  {
    name: "Workspace",
    model: "WorkspaceMembership",
    otherModel: "Membership",
    key: "workspaceId",
    id: "workspace-id",
    otherId: "other-workspace-id",
    oppositeScope: { organizationId: "organization-id" },
    action: updateWorkspaceMemberRole,
    accessError: "Workspace access denied",
    invalidRoleCode: "WORKSPACE_INVALID_ROLE",
    lastAdminCode: "WORKSPACE_LAST_ADMIN",
    path: "/settings/workspace",
  },
] as const;

describe.each(scopes)("$name member-role Action with real guards", (scope) => {
  const model = mocks.models[scope.model];
  const otherModel = mocks.models[scope.otherModel];
  const actorFilter = { userId: actorId, [scope.key]: scope.id };
  const targetFilter = { userId: targetId, [scope.key]: scope.id };

  function membership(userId: string, role: Membership["role"], id: string = scope.id): Membership {
    return { userId, role, [scope.key]: id };
  }

  function run(userId = targetId, role: Membership["role"] = "ADMIN") {
    return scope.action(scope.id, userId, state, roleForm(role));
  }

  beforeEach(() => {
    model.rows = [membership(actorId, "ADMIN"), membership(targetId, "MEMBER")];
  });

  it.each([undefined, "", " \t ", "admin", " ADMIN ", "OWNER", "IN_PROGRESS"])(
    "rejects invalid role %j before authentication or membership queries", async (role) => {
      const data = new FormData();
      if (role !== undefined) data.set("role", role);

      await expect(scope.action(scope.id, targetId, state, data)).resolves.toEqual({
        error: { code: scope.invalidRoleCode },
      });

      expect(mocks.auth).not.toHaveBeenCalled();
      expect(model.where).not.toHaveBeenCalled();
      expect(otherModel.where).not.toHaveBeenCalled();
      expect(mocks.redirect).not.toHaveBeenCalled();
      expectNoEffects();
    },
  );

  it("redirects an unauthenticated direct call before any membership lookup", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(run()).rejects.toBe(redirectError);

    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/api/auth/signin");
    expect(model.where).not.toHaveBeenCalled();
    expect(otherModel.where).not.toHaveBeenCalled();
    expectNoEffects();
  });

  // Retains the original Workspace non-admin case, now using the real guards.
  it.each(["MEMBER", null] as const)(
    "does not grant admin access to %s from an ADMIN role in the opposite scope",
    async (role) => {
      model.rows = [membership(targetId, "MEMBER")];
      if (role) model.rows.push(membership(actorId, role));
      otherModel.rows = [{ userId: actorId, role: "ADMIN", ...scope.oppositeScope }];

      await expect(run()).rejects.toThrow(role ? "Forbidden" : scope.accessError);

      expect(model.where.mock.calls).toEqual([[actorFilter]]);
      expect(model.all).not.toHaveBeenCalled();
      expect(otherModel.where).not.toHaveBeenCalled();
      expectNoEffects();
    },
  );

  it("does not use ADMIN membership in another tenant for the requested tenant", async () => {
    model.rows = [
      membership(actorId, "ADMIN", scope.otherId),
      membership(targetId, "MEMBER"),
    ];

    await expect(run()).rejects.toThrow(scope.accessError);

    expect(model.where.mock.calls).toEqual([[actorFilter]]);
    expectNoEffects();
  });

  it.each([["MEMBER", true], ["MEMBER", false], [null, true], [null, false]] as const)(
    "does not disclose target membership existence to actor role %s when target exists=%s", async (role, targetExists) => {
      model.rows = [];
      if (role) model.rows.push(membership(actorId, role));
      if (targetExists) model.rows.push(membership(targetId, "MEMBER"));
      await expect(run()).rejects.toThrow(role ? "Forbidden" : scope.accessError);
      expect(model.where.mock.calls).toEqual([[actorFilter]]);
      expect(model.first).toHaveBeenCalledExactlyOnceWith(actorFilter);
      expect(model.all).not.toHaveBeenCalled();
      expectNoEffects();
    },
  );

  it("propagates unexpected authentication failures before any membership query", async () => {
    const failure = new Error("private auth failure");
    mocks.auth.mockRejectedValueOnce(failure);
    await expect(run()).rejects.toBe(failure);
    expect(model.where).not.toHaveBeenCalled();
    expect(otherModel.where).not.toHaveBeenCalled();
    expectNoEffects();
  });

  // Retains the original Workspace missing-member case and adds a target that
  // exists only in another Organization/Workspace.
  it.each(["missing", "other tenant"])("rejects a target membership in %s", async (location) => {
    model.rows = [membership(actorId, "ADMIN")];
    if (location === "other tenant") {
      model.rows.push(membership(targetId, "MEMBER", scope.otherId));
    }

    await expect(run()).resolves.toEqual({ error: { code: "MEMBER_NOT_FOUND" } });

    expect(model.where.mock.calls).toEqual([[actorFilter], [targetFilter]]);
    expect(model.all).not.toHaveBeenCalled();
    expectNoEffects();
  });

  // Retains the original Workspace last-admin case with a real, self-demoting
  // ADMIN caller; an ADMIN in another tenant must not affect the count.
  it("prevents demoting the last admin even when another tenant has an admin", async () => {
    model.rows.push(membership("external-admin", "ADMIN", scope.otherId));

    await expect(run(actorId, "MEMBER")).resolves.toEqual({ error: { code: scope.lastAdminCode } });

    expect(model.first.mock.calls).toEqual([[actorFilter], [actorFilter]]);
    expect(model.all).toHaveBeenCalledExactlyOnceWith({ [scope.key]: scope.id });
    expectNoEffects();
  });

  it("retains the defensive zero-admin refusal without mutation or revalidation", async () => {
    model.all.mockResolvedValueOnce([]);
    await expect(run(actorId, "MEMBER")).resolves.toEqual({ error: { code: scope.lastAdminCode } });
    expect(model.first.mock.calls).toEqual([[actorFilter], [actorFilter]]);
    expect(model.all).toHaveBeenCalledExactlyOnceWith({ [scope.key]: scope.id });
    expectNoEffects();
  });

  it.each(["ADMIN", "MEMBER"] as const)("preserves authorized %s no-op success without count, update or revalidation", async role => {
    model.rows = [membership(actorId, "ADMIN"), membership(targetId, role)];
    await expect(run(targetId, role)).resolves.toEqual({ error: null });
    expect(model.first.mock.calls).toEqual([[actorFilter], [targetFilter]]);
    expect(model.all).not.toHaveBeenCalled();
    expectNoEffects();
  });

  // Retains the original Workspace successful demotion case.
  it("allows demoting an admin when another admin remains in the same tenant", async () => {
    model.rows = [membership(actorId, "ADMIN"), membership(targetId, "ADMIN")];

    await expect(run(targetId, "MEMBER")).resolves.toEqual({ error: null });

    expect(model.first.mock.calls).toEqual([[actorFilter], [targetFilter]]);
    expect(model.all).toHaveBeenCalledExactlyOnceWith({ [scope.key]: scope.id });
    expect(model.update).toHaveBeenCalledExactlyOnceWith(targetFilter, { role: "MEMBER" });
    expect(mocks.revalidatePath).toHaveBeenCalledExactlyOnceWith(scope.path);
    const order = [mocks.auth, model.first, model.all, model.update, mocks.revalidatePath]
      .map(mock => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("allows the local ADMIN to promote only the requested membership with an opposite-scope MEMBER role", async () => {
    model.rows.push(membership(targetId, "MEMBER", scope.otherId));
    otherModel.rows = [{ userId: actorId, role: "MEMBER", ...scope.oppositeScope }];

    await expect(run()).resolves.toEqual({ error: null });

    expect(model.where.mock.calls).toEqual([[actorFilter], [targetFilter], [targetFilter]]);
    expect(model.first.mock.calls).toEqual([[actorFilter], [targetFilter]]);
    expect(model.update).toHaveBeenCalledExactlyOnceWith(targetFilter, { role: "ADMIN" });
    expect(model.all).not.toHaveBeenCalled();
    expect(otherModel.where).not.toHaveBeenCalled();
    expect(otherModel.update).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledExactlyOnceWith(scope.path);
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it.each(["actor membership", "target membership", "admin count"])(
    "propagates an unexpected DB error from %s without effects",
    async (stage) => {
      const error = new Error("Database unavailable");
      if (stage === "actor membership") {
        model.first.mockRejectedValueOnce(error);
      } else if (stage === "target membership") {
        model.first.mockResolvedValueOnce(model.rows[0]).mockRejectedValueOnce(error);
      } else {
        model.rows = [membership(actorId, "ADMIN"), membership(targetId, "ADMIN")];
        model.all.mockRejectedValueOnce(error);
      }

      await expect(run(targetId, stage === "admin count" ? "MEMBER" : "ADMIN")).rejects.toBe(error);

      expect(mocks.redirect).not.toHaveBeenCalled();
      expectNoEffects();
    },
  );

  it("retains the save-error state without cache or cookie effects", async () => {
    model.update.mockRejectedValueOnce(Object.assign(new Error("private database save failure"), {
      code: "23505", cause: "private row data", stack: "private stack",
    }));

    await expect(run()).resolves.toEqual({
      error: { code: "MEMBER_ROLE_UPDATE_FAILED" },
    });

    expect(model.update).toHaveBeenCalledExactlyOnceWith(targetFilter, { role: "ADMIN" });
    expect(otherModel.update).not.toHaveBeenCalled();
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("keeps revalidation failures outside the update catch without retrying or changing the saved role", async () => {
    const failure = new Error("private cache failure");
    mocks.revalidatePath.mockImplementationOnce(() => { throw failure; });
    await expect(run()).rejects.toBe(failure);
    expect(model.update).toHaveBeenCalledExactlyOnceWith(targetFilter, { role: "ADMIN" });
    expect(mocks.revalidatePath).toHaveBeenCalledExactlyOnceWith(scope.path);
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
