import { constants } from "node:fs";
import { lstat, mkdir, open } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { C2_AUTH_PATH, refuse, validateSavedState, type SavedState } from "./c2-playwright-policy.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
export const authFile = join(root, C2_AUTH_PATH);
async function trustedParents() {
  for (const path of [join(root, "playwright"), dirname(authFile)]) {
    const info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink() || (process.platform !== "win32" && (info.mode & 0o077) !== 0)) refuse("state-directory");
  }
}
async function createTrustedParents() {
  for (const path of [join(root, "playwright"), dirname(authFile)]) {
    try { await lstat(path); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      // Never recursively create through an unchecked existing parent/symlink.
      await mkdir(path, { mode: 0o700 });
    }
    const info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink() || (process.platform !== "win32" && (info.mode & 0o077) !== 0)) refuse("state-directory");
  }
}
export async function loadC2State(): Promise<SavedState> {
  try {
    await trustedParents();
    const info = await lstat(authFile);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.size > 16_384 ||
      (process.platform !== "win32" && (info.mode & 0o077) !== 0)) refuse("state-file");
    const handle = await open(authFile, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    try {
      const current = await handle.stat();
      if (current.ino !== info.ino || current.dev !== info.dev || current.size !== info.size) refuse("state-file-changed");
      return validateSavedState(JSON.parse(await handle.readFile("utf8")));
    } finally { await handle.close(); }
  } catch { return refuse("state-missing-invalid-or-untrusted"); }
}
export async function saveC2State(state: SavedState) {
  try {
    validateSavedState(state);
    await createTrustedParents();
    // Never overwrite a previous session silently; renewal needs private review.
    const handle = await open(authFile, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try { await handle.writeFile(JSON.stringify(state), "utf8"); await handle.sync(); }
    finally { await handle.close(); }
  } catch { refuse("state-persistence"); }
}
