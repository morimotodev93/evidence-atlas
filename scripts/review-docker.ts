import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export function docker(args: string[], input?: string) {
  const result = spawnSync("docker", ["--context", "desktop-linux", ...args], {
    input, encoding: "utf8", windowsHide: true, timeout: 30_000,
  });
  if (result.error || result.status !== 0) throw new Error("Local review Docker operation failed (raw output suppressed). Check Docker Desktop permissions/status.");
  return result.stdout.trim();
}

export function verifyReviewContainer(root: string) {
  const endpoint = docker(["context", "inspect", "desktop-linux", "--format", "{{.Endpoints.docker.Host}}"]);
  if (endpoint !== "npipe:////./pipe/dockerDesktopLinuxEngine") throw new Error("Review requires the local Docker Desktop Linux named-pipe endpoint.");
  const inspect = (field: string) => JSON.parse(docker(["inspect", "evidence-atlas-postgres", "--format", `{{json .${field}}}`]));
  const labels = inspect("Config.Labels");
  const bindings = inspect("NetworkSettings.Ports");
  if (inspect("Config.Image") !== "pgvector/pgvector:pg18-trixie" ||
      labels["com.docker.compose.project"] !== "evidence-atlas" ||
      labels["com.docker.compose.service"] !== "postgres" ||
      resolve(labels["com.docker.compose.project.working_dir"]) !== resolve(root) ||
      resolve(labels["com.docker.compose.project.config_files"]) !== resolve(root, "compose.yml") ||
      !bindings["5432/tcp"]?.length ||
      bindings["5432/tcp"].some((binding: {HostPort: string}) => binding.HostPort !== "5432")) {
    throw new Error("Unexpected container ownership/image/ports; no review operation performed.");
  }
  return inspect("Id") as string;
}

export function adminSql(database: "postgres" | "evidence_atlas_review", sql: string) {
  return docker(["exec", "-i", "evidence-atlas-postgres", "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", database, "-At"], sql);
}
