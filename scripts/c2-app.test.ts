import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ read: vi.fn(), spawn: vi.fn() }));
vi.mock("node:fs", () => ({ readFileSync: mocks.read }));
vi.mock("node:child_process", () => ({ spawn: mocks.spawn }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NODE_OPTIONS", "");
  vi.stubEnv("NODE_PATH", "");
  vi.spyOn(process, "argv", "get").mockReturnValue(["node", "c2-app.ts"]);
  vi.spyOn(process, "execArgv", "get").mockReturnValue([]);
  vi.spyOn(process, "once").mockReturnValue(process);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  process.exitCode = 0;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("launcher orchestration without starting Next", () => {
  it("missing config refuses before spawn and logs only a generic error", async () => {
    mocks.read.mockImplementation(() => {
      throw Object.assign(new Error("synthetic-private-secret"), {
        code: "ENOENT",
      });
    });
    await import("./c2-app");
    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      "synthetic-private-secret",
    );
  });
  it("valid config invokes only the installed Next bin with fixed arguments and no shell", async () => {
    mocks.read.mockImplementation((path: string) => {
      if (path.endsWith(".env.c2.local"))
        return "C2_MODE=local\nC2_POSTGRES_PASSWORD=synthetic-db\nC2_DATABASE_URL=postgresql://c2_local:synthetic-db@127.0.0.1:5433/evidence_atlas_c2";
      if (path.endsWith(".env.c2.auth.local"))
        return `AUTH_SECRET=${"s".repeat(32)}\nAUTH_GOOGLE_ID=synthetic.apps.googleusercontent.com\nAUTH_GOOGLE_SECRET=synthetic-oauth`;
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    });
    // 既存のmock child生成箇所
    const child = Object.assign(new EventEmitter(), {
      kill: vi.fn(),
      stdout: new PassThrough(),
      stderr: new PassThrough(),
    });
    mocks.spawn.mockReturnValue(child);
    await import("./c2-app");

    child.stdout.write("✓ Ready in 500ms\n");

    child.stderr.write("Error: listen EADDRINUSE synthetic-private-secret\n");

    expect(console.log).toHaveBeenCalledWith(
      "C2: Next.js reported ready. HTTP/OAuth not verified.",
    );

    expect(console.log).toHaveBeenCalledWith("C2: Port conflict detected.");

    expect(JSON.stringify(vi.mocked(console.log).mock.calls)).not.toContain(
      "synthetic-private-secret",
    );

    expect(mocks.spawn).toHaveBeenCalledTimes(1);
    const [executable, args, options] = mocks.spawn.mock.calls[0];
    expect(executable).toBe(process.execPath);
    expect(args[0]).toMatch(/next[\\/]dist[\\/]bin[\\/]next$/);
    expect(args.slice(1)).toEqual([
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3001",
    ]);
    expect(options).toMatchObject({
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: { AUTH_URL: "http://localhost:3001" },
    });
    expect(JSON.stringify(args)).not.toContain("synthetic-db");
    child.emit("error", new Error("synthetic-private-secret"));
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      "synthetic-private-secret",
    );
    child.emit("exit", 2, null);
    expect(console.log).toHaveBeenCalledWith(
      "C2 child exited: code=2 signal=none (raw output suppressed).",
    );
    expect(JSON.stringify(vi.mocked(console.log).mock.calls)).not.toMatch(
      /synthetic-(db|oauth|private-secret)/,
    );
  });
});
