import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateResearchStatus } from "@/app/research/[id]/_actions/updateResearchStatus";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), researchWhere: vi.fn(), researchFirst: vi.fn(), update: vi.fn(),
  membershipWhere: vi.fn(), membershipFirst: vi.fn(), redirect: vi.fn(), notFound: vi.fn(),
  cookies: vi.fn(), index: vi.fn(), transaction: vi.fn(), revalidatePath: vi.fn(),
}));
// Keep the User, Research and Workspace guards real; replace every external I/O.
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/prisma/db", () => ({ db: { transaction: mocks.transaction, orm: { public: {
  Research: { where: mocks.researchWhere }, WorkspaceMembership: { where: mocks.membershipWhere },
} } } }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/inngest/request-research-index", () => ({ requestResearchIndex: mocks.index }));

const state = { error: null };
const researchId = "original-research-id";
const workspaceId = "original-workspace-id";
const userId = "original-user-id";
const redirectError = new Error("NEXT_REDIRECT");
const demoError = new Error("NEXT_HTTP_ERROR_FALLBACK;404");
function form(status?: string) {
  const data = new FormData();
  if (status !== undefined) data.set("status", status);
  return data;
}
const run = (status = "COMPLETED") => updateResearchStatus(researchId, state, form(status));
function noAncillaryEffects() {
  for (const mock of [mocks.cookies, mocks.index, mocks.transaction, mocks.revalidatePath]) expect(mock).not.toHaveBeenCalled();
}
function noMutation() {
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
  noAncillaryEffects();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PUBLIC_DEMO_MODE", "false");
  mocks.auth.mockResolvedValue({ user: { id: userId } });
  mocks.researchWhere.mockReturnValue({ first: mocks.researchFirst, update: mocks.update });
  mocks.researchFirst.mockResolvedValue({ id: researchId, workspaceId, status: "IN_PROGRESS" });
  mocks.membershipWhere.mockReturnValue({ first: mocks.membershipFirst });
  mocks.membershipFirst.mockResolvedValue({ userId, workspaceId, role: "MEMBER" });
  mocks.update.mockResolvedValue({ id: researchId, status: "COMPLETED" });
  mocks.redirect.mockImplementation(() => { throw redirectError; });
  mocks.notFound.mockImplementation(() => { throw demoError; });
});
afterEach(() => vi.unstubAllEnvs());

describe("Research status structured errors with real access guards", () => {
  it.each([undefined, "", " \t ", "completed", " COMPLETED ", "MEMBER", "UNKNOWN"])("returns only the validation code for %j before auth or DB reads", async status => {
    expect(await updateResearchStatus(researchId, state, form(status))).toEqual({ error: { code: "RESEARCH_INVALID_STATUS" } });
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.researchWhere).not.toHaveBeenCalled();
    expect(mocks.membershipWhere).not.toHaveBeenCalled();
    noMutation();
  });

  it("preserves String coercion and rejects a File-valued status without exposing its contents", async () => {
    const data = new FormData(); data.set("status", new File(["private-file-data"], "private-name"));
    expect(await updateResearchStatus(researchId, state, data)).toEqual({ error: { code: "RESEARCH_INVALID_STATUS" } });
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.researchWhere).not.toHaveBeenCalled();
    noMutation();
  });

  it.each(["missing", "inaccessible"])("uses the same safe not-found code for %s Research without writing", async reason => {
    (reason === "missing" ? mocks.researchFirst : mocks.membershipFirst).mockResolvedValue(null);
    expect(await run()).toEqual({ error: { code: "RESEARCH_NOT_FOUND" } });
    expect(mocks.researchWhere).toHaveBeenCalledExactlyOnceWith({ id: researchId });
    if (reason === "missing") expect(mocks.membershipWhere).not.toHaveBeenCalled();
    else expect(mocks.membershipWhere).toHaveBeenCalledExactlyOnceWith({ userId, workspaceId });
    noMutation();
  });

  it("preserves the unauthenticated sign-in redirect before Research reads", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(run()).rejects.toBe(redirectError);
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/api/auth/signin");
    expect(mocks.researchWhere).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    noAncillaryEffects();
  });

  it.each(["auth", "researchFirst", "membershipFirst"] as const)("keeps unexpected %s exceptions outside the returned-error contract", async stage => {
    const failure = Object.assign(new Error("private diagnostic"), { code: "23505", cause: "private row data" });
    mocks[stage].mockRejectedValueOnce(failure);
    await expect(run()).rejects.toBe(failure);
    noMutation();
  });

  it("returns only the save-failure code without exposing database exceptions", async () => {
    mocks.update.mockRejectedValueOnce(Object.assign(new Error("private save diagnostic"), {
      code: "23505", cause: "private row data", stack: "private stack",
    }));
    expect(await run()).toEqual({ error: { code: "RESEARCH_STATUS_UPDATE_FAILED" } });
    expect(mocks.researchWhere.mock.calls).toEqual([[{ id: researchId }], [{ id: researchId }]]);
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ status: "COMPLETED" });
    expect(mocks.redirect).not.toHaveBeenCalled();
    noAncillaryEffects();
  });

  describe.each(["MEMBER", "ADMIN"])("authorized Workspace %s", role => {
    it.each(["IN_PROGRESS", "COMPLETED", "ARCHIVED"])("persists original enum %s once, then redirects without new effects", async status => {
      mocks.membershipFirst.mockResolvedValue({ userId, workspaceId, role });
      await expect(run(status)).rejects.toBe(redirectError);
      expect(mocks.researchWhere.mock.calls).toEqual([[{ id: researchId }], [{ id: researchId }]]);
      expect(mocks.membershipWhere).toHaveBeenCalledExactlyOnceWith({ userId, workspaceId });
      expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ status });
      expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(`/research/${researchId}`);
      const order = [mocks.auth, mocks.researchFirst, mocks.membershipFirst, mocks.update, mocks.redirect]
        .map(mock => mock.mock.invocationCallOrder[0]);
      expect(order).toEqual([...order].sort((a, b) => a - b));
      noAncillaryEffects();
    });
  });

  it("uses the access guard's Research ID for the update and redirect, ignoring previous error state", async () => {
    mocks.researchFirst.mockResolvedValue({ id: "guard-research-id", workspaceId });
    await expect(updateResearchStatus(researchId, { error: { code: "RESEARCH_INVALID_STATUS" } }, form("ARCHIVED"))).rejects.toBe(redirectError);
    expect(mocks.researchWhere.mock.calls).toEqual([[{ id: researchId }], [{ id: "guard-research-id" }]]);
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ status: "ARCHIVED" });
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/research/guard-research-id");
  });

  it("retains redirect behavior when persistence resolves null rather than throwing", async () => {
    mocks.update.mockResolvedValueOnce(null);
    await expect(run()).rejects.toBe(redirectError);
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(`/research/${researchId}`);
    noAncillaryEffects();
  });

  it("retains the Public Demo refusal before auth or DB work for valid status", async () => {
    vi.stubEnv("PUBLIC_DEMO_MODE", "true");
    await expect(run()).rejects.toBe(demoError);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.researchWhere).not.toHaveBeenCalled();
    noMutation();
  });

  it("retains validation before the Public Demo guard for invalid status", async () => {
    vi.stubEnv("PUBLIC_DEMO_MODE", "true");
    expect(await run("INVALID")).toEqual({ error: { code: "RESEARCH_INVALID_STATUS" } });
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.researchWhere).not.toHaveBeenCalled();
    noMutation();
  });
});
