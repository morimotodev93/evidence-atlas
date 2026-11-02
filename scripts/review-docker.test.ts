import { beforeEach, expect, it, vi } from "vitest";
import { verifyReviewContainer } from "./review-docker.ts";
import { resolve } from "node:path";

const state = vi.hoisted(() => ({ endpoint: "", image: "", root: "", port: "", project: "" }));
vi.mock("node:child_process", () => ({ spawnSync: (_bin: string, args: string[]) => {
  const format = args.at(-1)!;
  const values: Record<string, unknown> = {
    "Config.Labels": { "com.docker.compose.project": state.project, "com.docker.compose.service": "postgres", "com.docker.compose.project.working_dir": state.root, "com.docker.compose.project.config_files": resolve(state.root, "compose.yml") },
    "Config.Image": state.image, "NetworkSettings.Ports": { "5432/tcp": [{HostPort: state.port}] }, "Id": "fixture-container-id",
  };
  return {status: 0, stdout: args.includes("context") ? state.endpoint : JSON.stringify(values[format.slice(8, -2)])};
} }));

beforeEach(() => Object.assign(state, { endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine", image: "pgvector/pgvector:pg18-trixie", root: process.cwd(), port: "5432", project: "evidence-atlas" }));
it("accepts the expected local Compose container metadata", () => expect(verifyReviewContainer(process.cwd())).toBe("fixture-container-id"));
it.each([
  { endpoint: "tcp://remote.example:2376" }, { image: "postgres:latest" },
  { project: "evidence-atlas-c2" }, { port: "5433" }, { root: resolve(process.cwd(), "another-checkout") },
])("refuses mismatched Docker ownership/endpoint before connecting", (changes) => {
  Object.assign(state, changes);
  expect(() => verifyReviewContainer(process.cwd())).toThrow();
});
