/**
 * Snapshot / compare NHTSA recall campaign sets in catalog.generated.json.
 *
 * Used by the daily recalls workflow to decide whether to commit. Compares
 * campaign identity + content (date/component/summary) and ignores
 * safetyStatus.fetchedAt-only churn.
 *
 * Usage:
 *   pnpm recall:snapshot -- --out scripts/.cache/recalls-before.json
 *   pnpm recall:diff -- --before scripts/.cache/recalls-before.json --out recall-diff.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MakeEntry } from "../src/data/catalog";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "src/data/catalog.generated.json");

type CampaignEntry = {
  key: string;
  date: string;
  component: string;
  summary: string;
};

type Snapshot = {
  generatedAt: string;
  campaigns: CampaignEntry[];
};

type DiffResult = {
  changed: boolean;
  addedCount: number;
  removedCount: number;
  updatedCount: number;
  added: string[];
  removed: string[];
  updated: string[];
};

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function command(): string {
  const cmd = process.argv[2];
  if (cmd === "snapshot" || cmd === "compare") return cmd;
  // Allow `tsx scripts/recall-diff.ts -- --out ...` via npm script aliases.
  if (argValue("--before")) return "compare";
  if (argValue("--out") && !argValue("--before")) return "snapshot";
  return cmd ?? "";
}

function loadCatalog(): MakeEntry[] {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`Missing ${CATALOG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8")) as MakeEntry[];
}

function campaignFingerprint(c: Pick<CampaignEntry, "date" | "component" | "summary">): string {
  return `${c.date}\0${c.component}\0${c.summary}`;
}

export function collectCampaigns(catalog: MakeEntry[]): CampaignEntry[] {
  const out: CampaignEntry[] = [];
  for (const make of catalog) {
    for (const model of make.models) {
      for (const year of model.years) {
        for (const recall of year.recalls ?? []) {
          if (!recall.campaignNumber) continue;
          out.push({
            key: `${make.slug}/${model.slug}/${year.year}/${recall.campaignNumber}`,
            date: recall.date,
            component: recall.component,
            summary: recall.summary,
          });
        }
      }
    }
  }
  out.sort((a, b) => a.key.localeCompare(b.key));
  return out;
}

export function diffCampaigns(
  before: CampaignEntry[],
  after: CampaignEntry[],
): DiffResult {
  const beforeMap = new Map(before.map((c) => [c.key, campaignFingerprint(c)]));
  const afterMap = new Map(after.map((c) => [c.key, campaignFingerprint(c)]));

  const added: string[] = [];
  const removed: string[] = [];
  const updated: string[] = [];

  for (const key of afterMap.keys()) {
    if (!beforeMap.has(key)) added.push(key);
    else if (beforeMap.get(key) !== afterMap.get(key)) updated.push(key);
  }
  for (const key of beforeMap.keys()) {
    if (!afterMap.has(key)) removed.push(key);
  }

  added.sort();
  removed.sort();
  updated.sort();

  return {
    changed: added.length + removed.length + updated.length > 0,
    addedCount: added.length,
    removedCount: removed.length,
    updatedCount: updated.length,
    added,
    removed,
    updated,
  };
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function snapshot() {
  const outPath =
    argValue("--out") ?? path.join(ROOT, "scripts/.cache/recalls-before.json");
  const campaigns = collectCampaigns(loadCatalog());
  const snap: Snapshot = {
    generatedAt: new Date().toISOString(),
    campaigns,
  };
  writeJson(outPath, snap);
  console.log(`Wrote snapshot ${outPath} (${campaigns.length} campaigns)`);
}

function compare() {
  const beforePath = argValue("--before");
  if (!beforePath) {
    throw new Error("compare requires --before <snapshot.json>");
  }
  const outPath = argValue("--out") ?? path.join(ROOT, "recall-diff.json");
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Snapshot;
  const after = collectCampaigns(loadCatalog());
  const result = diffCampaigns(before.campaigns ?? [], after);
  writeJson(outPath, {
    ...result,
    comparedAt: new Date().toISOString(),
    beforeCount: before.campaigns?.length ?? 0,
    afterCount: after.length,
  });
  console.log(
    [
      `changed=${result.changed}`,
      `added=${result.addedCount}`,
      `removed=${result.removedCount}`,
      `updated=${result.updatedCount}`,
      `before=${before.campaigns?.length ?? 0}`,
      `after=${after.length}`,
      `out=${outPath}`,
    ].join(" | "),
  );
  if (result.addedCount) {
    console.log(`  + ${result.added.slice(0, 20).join("\n  + ")}`);
  }
  if (result.removedCount) {
    console.log(`  - ${result.removed.slice(0, 20).join("\n  - ")}`);
  }
  if (result.updatedCount) {
    console.log(`  ~ ${result.updated.slice(0, 20).join("\n  ~ ")}`);
  }
}

function main() {
  const cmd = command();
  if (cmd === "snapshot") snapshot();
  else if (cmd === "compare") compare();
  else {
    console.error(
      "Usage:\n  recall-diff.ts snapshot --out <path>\n  recall-diff.ts compare --before <path> --out <path>",
    );
    process.exit(2);
  }
}

const isDirectRun =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main();
}
