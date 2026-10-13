import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureAppState } from "./c2-playwright-policy.ts";

const fs = vi.hoisted(() => {
  const info = { isDirectory: () => true, isFile: () => true, isSymbolicLink: () => false, nlink: 1, size: 1024, mode: 0o700, ino: 1, dev: 1 };
  const handle = { stat: vi.fn(async () => info), readFile: vi.fn(async () => "{}"), writeFile: vi.fn(async () => {}), sync: vi.fn(async () => {}), close: vi.fn(async () => {}) };
  return { info, handle, lstat: vi.fn<(path: string) => Promise<typeof info>>(async () => info), open: vi.fn<(path: string, flags: number, mode?: number) => Promise<typeof handle>>(async () => handle), mkdir: vi.fn(async () => {}) };
});
vi.mock("node:fs/promises", () => fs);
import { authFile, loadC2State, saveC2State } from "./c2-playwright-state.ts";

function state() {
  const now = Date.now();
  const user = { id: "synthetic-user", email: "synthetic@example.invalid" };
  return captureAppState({ cookies: [{ name: "authjs.session-token", value: "synthetic-token", domain: "localhost", path: "/", expires: (now + 3_600_000) / 1000, httpOnly: true, secure: false, sameSite: "Lax" }] }, "http://localhost:3001", { user, expires: new Date(now + 3_600_000).toISOString() }, user, now);
}
beforeEach(() => {
  vi.clearAllMocks();
  fs.lstat.mockImplementation(async () => fs.info);
  fs.open.mockImplementation(async () => fs.handle);
  fs.handle.stat.mockImplementation(async () => fs.info);
  fs.handle.readFile.mockResolvedValue(JSON.stringify(state()));
});

describe("C2 authentication state file boundaries (mocked filesystem only)", () => {
  it("loads only the dedicated file after validation", async () => {
    expect(authFile.replaceAll("\\", "/")).toMatch(/\/playwright\/\.auth\/c2-user\.json$/);
    const saved = await loadC2State();
    expect(saved.storageState.cookies).toHaveLength(1);
    expect(fs.open.mock.calls[0][0]).toBe(authFile);
    expect(fs.handle.close).toHaveBeenCalledOnce();
  });
  it("fails explicitly for a missing file without creating a session/file", async () => {
    fs.lstat.mockRejectedValueOnce(new Error("ENOENT synthetic-secret"));
    await expect(loadC2State()).rejects.toThrow("state-missing-invalid-or-untrusted");
    expect(fs.open).not.toHaveBeenCalled(); expect(fs.mkdir).not.toHaveBeenCalled();
  });
  it.each(["not-file", "symlink", "hardlink", "oversize"])("rejects untrusted %s before opening", async (kind) => {
    fs.lstat.mockImplementation(async (path) => path === authFile ? {
      ...fs.info, isFile: () => kind !== "not-file", isSymbolicLink: () => kind === "symlink", nlink: kind === "hardlink" ? 2 : 1, size: kind === "oversize" ? 20_000 : 1024,
    } : fs.info);
    await expect(loadC2State()).rejects.toThrow(); expect(fs.open).not.toHaveBeenCalled();
  });
  it("rejects symlinked parent directories", async () => {
    fs.lstat.mockResolvedValueOnce({ ...fs.info, isSymbolicLink: () => true });
    await expect(loadC2State()).rejects.toThrow(); expect(fs.open).not.toHaveBeenCalled();
  });
  it.each(["invalid JSON", "{}", '{"storageState":{"cookies":[{"domain":"google.com"}]}}'])("rejects invalid state %s without leaking contents", async (text) => {
    fs.handle.readFile.mockResolvedValueOnce(text);
    await expect(loadC2State()).rejects.toThrow("state-missing-invalid-or-untrusted");
    expect(fs.handle.close).toHaveBeenCalledOnce();
  });
  it("rejects a file changed between stat and open", async () => {
    fs.handle.stat.mockResolvedValueOnce({ ...fs.info, ino: 2 });
    await expect(loadC2State()).rejects.toThrow(); expect(fs.handle.close).toHaveBeenCalledOnce();
  });
  it("saves with restrictive modes and exclusive creation, never overwrites a previous session", async () => {
    const seen = new Set<string>();
    fs.lstat.mockImplementation(async (path) => {
      if (!seen.has(path)) { seen.add(path); throw Object.assign(new Error("missing synthetic directory"), { code: "ENOENT" }); }
      return fs.info;
    });
    await saveC2State(state());
    expect(fs.mkdir).toHaveBeenCalledWith(expect.any(String), { mode: 0o700 });
    expect(fs.open).toHaveBeenCalledWith(authFile, expect.any(Number), 0o600);
    expect(fs.handle.writeFile).toHaveBeenCalledOnce(); expect(fs.handle.sync).toHaveBeenCalledOnce(); expect(fs.handle.close).toHaveBeenCalledOnce();
    fs.open.mockRejectedValueOnce(new Error("EEXIST synthetic-secret"));
    await expect(saveC2State(state())).rejects.toThrow("state-persistence");
    expect(fs.handle.writeFile).toHaveBeenCalledOnce();
  });
  it("does not create directories or state through a symlinked parent", async () => {
    fs.lstat.mockResolvedValue({ ...fs.info, isSymbolicLink: () => true });
    await expect(saveC2State(state())).rejects.toThrow("state-persistence");
    expect(fs.mkdir).not.toHaveBeenCalled(); expect(fs.open).not.toHaveBeenCalled();
  });
  it("rejects invalid state before any filesystem write", async () => {
    const invalid = state(); invalid.origin = "https://production.invalid";
    await expect(saveC2State(invalid)).rejects.toThrow("state-persistence");
    expect(fs.mkdir).not.toHaveBeenCalled(); expect(fs.open).not.toHaveBeenCalled();
  });
});
