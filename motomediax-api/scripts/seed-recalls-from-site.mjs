/**
 * One-time seed for data/recalls-complaints.json from real NHTSA data the
 * motomediax.com site already fetched (src/data/catalog.generated.json,
 * `year.recalls` / `year.complaints` / `year.safetyStatus`, populated by
 * that repo's `pnpm enrich:nhtsa-recalls`).
 *
 * Why this exists: `scripts/enrich-recalls-complaints.js` in this folder is
 * the real, ongoing fetcher (see its header) and should be run whenever you
 * need fresh data from a machine with network access to api.nhtsa.gov. This
 * script exists only to bootstrap this API with already-fetched, real
 * records so the endpoints have live-shaped data on day one.
 *
 * It also repairs a date-parsing bug found in the source data: the site's
 * fetcher assumed NHTSA returns DD/MM/YYYY and stored dates as YYYY-DD-MM,
 * which produces invalid dates whenever the day is > 12 (e.g. "2026-30-06").
 * NHTSA's recalls/complaints APIs actually return US-style MM/DD/YYYY, so
 * this swaps the fields back to real YYYY-MM-DD wherever the "month"
 * position holds a value > 12.
 *
 * Usage: node scripts/seed-recalls-from-site.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITE_CATALOG_PATH = path.resolve(
  ROOT,
  "..",
  "src/data/catalog.generated.json",
);
const OUT_PATH = path.join(ROOT, "data", "recalls-complaints.json");

/** Repair a YYYY-DD-MM value (day/month swapped) back to YYYY-MM-DD. */
function fixDate(raw) {
  if (typeof raw !== "string") return raw;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw;
  const [, y, a, b] = m;
  const ai = Number(a);
  const bi = Number(b);
  if (ai > 12 && bi >= 1 && bi <= 12) {
    return `${y}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }
  return raw;
}

function main() {
  if (!fs.existsSync(SITE_CATALOG_PATH)) {
    throw new Error(`Missing ${SITE_CATALOG_PATH}`);
  }

  const site = JSON.parse(fs.readFileSync(SITE_CATALOG_PATH, "utf8"));
  const out = {};
  let seeded = 0;
  let noSafetyData = 0;

  for (const make of site) {
    for (const model of make.models) {
      for (const year of model.years) {
        const key = `${make.slug}/${model.slug}/${year.year}`;
        const status = year.safetyStatus;
        if (!status) {
          noSafetyData += 1;
          continue;
        }

        const recalls = (year.recalls ?? []).map((r) => ({
          campaignNumber: r.campaignNumber,
          date: fixDate(r.date),
          component: r.component,
          summary: r.summary,
        }));

        out[key] = {
          recalls,
          recallDataAvailable: status.recalls !== "error",
          recallsError: status.recalls === "error" ? status.recallsError : null,
          complaints: year.complaints ?? null,
          complaintDataAvailable: status.complaints !== "error",
          complaintsError:
            status.complaints === "error" ? status.complaintsError : null,
          fetchedAt: status.fetchedAt,
          source:
            "seeded from src/data/catalog.generated.json (site's pnpm enrich:nhtsa-recalls run)",
        };
        seeded += 1;
      }
    }
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`);

  console.log(
    `Wrote ${OUT_PATH}: ${seeded} vehicle records seeded, ${noSafetyData} had no prior safety fetch.`,
  );
}

main();
