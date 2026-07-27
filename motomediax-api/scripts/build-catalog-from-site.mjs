/**
 * Build data/catalog.json (makes → models → years, with specs sourced from
 * NHTSA/EPA/Wikipedia) from the sibling motomediax.com site's generated
 * catalog at ../src/data/catalog.generated.json.
 *
 * The site's catalog also carries `recalls` / `complaints` / `safetyStatus`
 * per year (from its own NHTSA enrichment), but this API keeps that data in
 * a separate data/recalls-complaints.json — the whole point of this API
 * project is to own that pipeline independently — so those fields are
 * stripped here. Photos are stripped too: they're local paths meant for
 * Next's image optimizer and aren't meaningful outside that app.
 *
 * Usage: node scripts/build-catalog-from-site.mjs
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
const OUT_PATH = path.join(ROOT, "data", "catalog.json");

function main() {
  if (!fs.existsSync(SITE_CATALOG_PATH)) {
    throw new Error(
      `Missing ${SITE_CATALOG_PATH} — this script expects to run from ` +
        `inside the motomediax-api/ folder of the motomediaxsites repo.`,
    );
  }

  const site = JSON.parse(fs.readFileSync(SITE_CATALOG_PATH, "utf8"));

  const catalog = site.map((make) => ({
    slug: make.slug,
    name: make.name,
    country: make.country,
    blurb: make.blurb,
    models: make.models.map((model) => ({
      slug: model.slug,
      name: model.name,
      tagline: model.tagline,
      years: model.years.map((year) => ({
        year: year.year,
        slug: year.slug,
        summary: year.summary,
        description: year.description,
        highlights: year.highlights ?? [],
        specs: year.specs ?? null,
        performance: year.performance ?? null,
        sources: {
          wikipedia: year.sources?.wikipedia,
          nhtsa: year.sources?.nhtsa,
          epa: year.sources?.epa,
          autodev: year.sources?.autodev,
        },
      })),
    })),
  }));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);

  const modelCount = catalog.reduce((n, m) => n + m.models.length, 0);
  const yearCount = catalog.reduce(
    (n, m) => n + m.models.reduce((mn, mo) => mn + mo.years.length, 0),
    0,
  );
  console.log(
    `Wrote ${OUT_PATH}: ${catalog.length} makes, ${modelCount} models, ${yearCount} years`,
  );
}

main();
