import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareC2App } from "./c2-app-target.ts";

const root = fileURLToPath(new URL("../", import.meta.url));

try {
  const invocation = prepareC2App({
    root, args: process.argv.slice(2), execArgv: process.execArgv, inherited: process.env,
    readText(path) {
      try { return readFileSync(path, "utf8"); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
        throw new Error("Cannot read C2 environment configuration.");
      }
    },
  });
  const require = createRequire(import.meta.url);
  const nextBin = join(dirname(require.resolve("next/package.json")), "dist/bin/next");
  const child = spawn(process.execPath, [nextBin, ...invocation.args], {
    cwd: root, env: invocation.env, shell: false,
    // Driver/Auth/Next errors can include credentials. Do not forward raw output.
    stdio: "ignore",
  });
  console.log("C2 child requested: origin=http://localhost:3001 bind=127.0.0.1:3001 artifacts=.next-c2. Readiness is not verified.");
  child.on("error", () => { console.error("C2 child startup failed (details suppressed)."); process.exitCode = 1; });
  child.on("exit", (code, signal) => {
    console.log(`C2 child exited: code=${code ?? "none"} signal=${signal ?? "none"} (raw output suppressed).`);
    process.exitCode = code ?? (signal ? 1 : 0);
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => { child.kill(signal); });
  }
} catch {
  console.error("C2 launcher refused startup; check dedicated configuration and inherited settings (details suppressed).");
  process.exitCode = 1;
}
