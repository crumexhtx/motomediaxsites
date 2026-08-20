/**
 * Patch NHTSA Canadian Vehicle Specs dimensions into catalog.generated.json
 * without a full Wikipedia/NHTSA rebuild. Fill years that are missing L/W/H/WB/CW.
 *
 * Usage: pnpm enrich:nhtsa-dims [--force] [--brand jeep] [--limit 20]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchCvsDims,
  mergeCvsDimsIntoSpecs,
  yearNeedsCvsDims,
} from "./nhtsa-dims";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(ROOT, "src/data/catalog.generated.json");

type YearEntry = {
  year: number;
  specs?: Record<string, unknown>;
  sources?: { nhtsaCvs?: string; [k: string]: unknown };
  highlights?: string[];
  [k: string]: unknown;
};
type ModelEntry = { name: string; years: YearEntry[]; [k: string]: unknown };
type MakeEntry = {
  name: string;
  slug?: string;
  models: ModelEntry[];
  [k: string]: unknown;
};

function parseArgs(argv: string[]) {
  let force = false;
  let brand: string | undefined;
  let limit: number | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--force") force = true;
    else if (a === "--brand") brand = argv[++i]?.toLowerCase();
    else if (a === "--limit") limit = Number(argv[++i]);
  }
  return { force, brand, limit };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { force, brand, limit } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(OUT_PATH)) {
    throw new Error(`Missing ${OUT_PATH} — run pnpm build:catalog first`);
  }

  const catalog = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as MakeEntry[];
  let attempted = 0;
  let patched = 0;
  let skipped = 0;
  let failed = 0;

  for (const make of catalog) {
    if (brand && make.slug !== brand && make.name.toLowerCase() !== brand) {
      continue;
    }
    for (const model of make.models) {
      for (const year of model.years) {
        if (!force && !yearNeedsCvsDims(year.specs)) {
          skipped += 1;
          continue;
        }
        if (limit != null && attempted >= limit) break;
        attempted += 1;
        try {
          const dims = await fetchCvsDims(make.name, model.name, year.year);
          await sleep(80);
          if (!dims) {
            skipped += 1;
            continue;
          }
          year.specs = mergeCvsDimsIntoSpecs(year.specs, dims, {
            overwrite: force,
          });
          year.sources = {
            ...year.sources,
            nhtsaCvs:
              "https://vpic.nhtsa.dot.gov/api/vehicles/GetCanadianVehicleSpecifications",
          };
          if (dims.overallLengthIn && dims.overallWidthIn) {
            const label = `About ${dims.overallLengthIn} × ${dims.overallWidthIn} in (L×W)`;
            const rest = (year.highlights ?? []).filter(
              (h) => !/× .+ in \(L×W\)$/i.test(h) && !/x .+ in \(L×W\)$/i.test(h),
            );
            year.highlights = [...rest, label].slice(0, 8);
          }
          patched += 1;
          console.log(
            `  + ${year.year} ${make.name} ${model.name}: L=${dims.overallLengthIn ?? "—"} WB=${dims.wheelbaseIn ?? "—"}`,
          );
        } catch (err) {
          failed += 1;
          console.warn(
            `  ! ${year.year} ${make.name} ${model.name}: ${
              err instanceof Error ? err.message : err
            }`,
          );
        }
      }
      if (limit != null && attempted >= limit) break;
    }
    if (limit != null && attempted >= limit) break;
  }

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(
    `Patched NHTSA CVS dims into ${OUT_PATH} (patched ${patched}, skipped ${skipped}, failed ${failed}, attempted ${attempted})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
