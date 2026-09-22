/**
 * Build a single model via build-catalog logic and merge it into the existing
 * catalog.generated.json without wiping other makes' recalls/enrichments.
 *
 * Usage: npx tsx scripts/merge-model-into-catalog.ts --brand Chevrolet --model Trax
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BRANDS_PATH = path.join(ROOT, "src/data/brands.json");
const OUT_PATH = path.join(ROOT, "src/data/catalog.generated.json");

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type BrandSeed = { brand: string; models: string[] };
type ModelEntry = { name: string; slug: string; [k: string]: unknown };
type MakeEntry = {
  name: string;
  slug: string;
  models: ModelEntry[];
  [k: string]: unknown;
};

function main() {
  const brand = argValue("--brand");
  const model = argValue("--model");
  if (!brand || !model) {
    throw new Error("Usage: --brand Chevrolet --model Trax");
  }

  if (!fs.existsSync(OUT_PATH)) {
    throw new Error(`Missing ${OUT_PATH} — run a full build:catalog first`);
  }

  const brandsOriginal = fs.readFileSync(BRANDS_PATH, "utf8");
  const catalogOriginal = fs.readFileSync(OUT_PATH, "utf8");
  const seeds = JSON.parse(brandsOriginal) as BrandSeed[];
  const seed = seeds.find((s) => s.brand === brand);
  if (!seed) throw new Error(`Brand not in brands.json: ${brand}`);
  if (!seed.models.includes(model)) {
    throw new Error(`${model} missing from ${brand} in brands.json`);
  }

  const backupBrands = path.join(ROOT, "scripts/.cache/brands.merge-backup.json");
  const backupCatalog = path.join(
    ROOT,
    "scripts/.cache/catalog.merge-backup.json",
  );
  fs.mkdirSync(path.dirname(backupBrands), { recursive: true });
  fs.writeFileSync(backupBrands, brandsOriginal);
  fs.writeFileSync(backupCatalog, catalogOriginal);

  const tempSeeds: BrandSeed[] = [{ brand, models: [model] }];
  fs.writeFileSync(BRANDS_PATH, `${JSON.stringify(tempSeeds, null, 2)}\n`);

  console.log(`== Building only ${brand} ${model} ==`);
  const build = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsx", "scripts/build-catalog.ts"],
    { cwd: ROOT, stdio: "inherit", shell: true },
  );

  // Always restore brands.json first.
  fs.writeFileSync(BRANDS_PATH, brandsOriginal);

  if (build.status !== 0) {
    fs.writeFileSync(OUT_PATH, catalogOriginal);
    throw new Error("build:catalog failed; restored prior catalog + brands");
  }

  const built = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as MakeEntry[];
  const builtMake = built.find((m) => m.slug === slugify(brand));
  const builtModel = builtMake?.models.find((m) => m.slug === slugify(model));
  if (!builtModel) {
    fs.writeFileSync(OUT_PATH, catalogOriginal);
    throw new Error(
      `Build finished but ${brand} ${model} was not produced — catalog restored`,
    );
  }

  const catalog = JSON.parse(catalogOriginal) as MakeEntry[];
  let make = catalog.find((m) => m.slug === slugify(brand));
  if (!make) {
    if (!builtMake) throw new Error("Missing make in built catalog");
    catalog.push(builtMake);
    catalog.sort((a, b) => a.name.localeCompare(b.name));
    make = builtMake;
  } else {
    const idx = make.models.findIndex((m) => m.slug === builtModel.slug);
    if (idx >= 0) make.models[idx] = builtModel;
    else {
      make.models.push(builtModel);
      make.models.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(
    `Merged ${brand} ${model} into catalog (${make.models.length} ${make.name} models).`,
  );
  console.log(`Backups: ${backupBrands} , ${backupCatalog}`);
}

main();
