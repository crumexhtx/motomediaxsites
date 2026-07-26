/**
 * Thin wrapper: enrich complaints only (same pipeline as enrich-nhtsa-recalls).
 * Usage: pnpm enrich:nhtsa-complaints [--brand bmw] [--limit 10] [--force]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "enrich-nhtsa-recalls.ts");
const extra = process.argv.slice(2);
const result = spawnSync(
  "pnpm",
  ["exec", "tsx", script, "--complaints-only", "--with-complaints", ...extra],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
