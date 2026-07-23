import fs from "node:fs";
import path from "node:path";
import {
  ROOT,
  allowedYearsForModel,
  catalogStats,
  isBlankCopy,
  loadBrands,
  loadCatalog,
  loadModelYearOverrides,
  localPublicAssetIssue,
  type Issue,
} from "./lib/catalog-report";

const issues: Issue[] = [];

function fail(message: string) {
  issues.push({ level: "error", message });
}

function warn(message: string) {
  issues.push({ level: "warn", message });
}

const catalog = (() => {
  try {
    return loadCatalog();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
})();
const brands = loadBrands();
const modelYearOverrides = loadModelYearOverrides();

const brandNames = new Set(brands.map((b) => b.brand));
const makeNames = new Set(catalog.map((m) => m.name));

for (const brand of brandNames) {
  if (!makeNames.has(brand)) {
    fail(`Missing make in catalog: ${brand}`);
  }
}

for (const make of catalog) {
  if (!brandNames.has(make.name)) {
    warn(`Catalog make not in brands.json: ${make.name}`);
  }
  if (!make.coverImage?.src) {
    fail(`${make.name}: missing cover image`);
  } else if (
    !make.coverImage.src.startsWith("/brands/") &&
    !make.coverImage.src.includes("wikimedia.org")
  ) {
    warn(`${make.name}: cover is not a brand badge or Wikimedia image`);
  }

  if (make.models.length === 0) {
    fail(`${make.name}: no models`);
  }

  for (const model of make.models) {
    if (model.years.length === 0) {
      fail(`${make.name} ${model.name}: no years`);
    }
    const allowed = allowedYearsForModel(
      make.slug,
      model.slug,
      modelYearOverrides,
    );
    for (const year of model.years) {
      if (!allowed.has(year.year)) {
        fail(
          `${make.name} ${model.name} ${year.year}: year not allowed for ${make.slug}/${model.slug}`,
        );
      }
      if (!year.images?.length) {
        warn(`${make.name} ${model.name} ${year.year}: no images`);
      }
      if (isBlankCopy(year.summary) || isBlankCopy(year.description)) {
        fail(`${make.name} ${model.name} ${year.year}: missing copy`);
      }
    }
  }
}

const imageHosts = new Map<string, number>();
const missingLocal = new Set<string>();
const requireLocalImages = process.env.REQUIRE_LOCAL_IMAGES === "1";

function trackLocalOrRemote(src: string) {
  if (src.startsWith("/")) {
    const kind = src.startsWith("/catalog/")
      ? "local-catalog"
      : src.startsWith("/brands/")
        ? "local-brands"
        : "local-other";
    imageHosts.set(kind, (imageHosts.get(kind) ?? 0) + 1);
    const issue = localPublicAssetIssue(src);
    if (issue) missingLocal.add(src);
    return;
  }
  try {
    const host = new URL(src).hostname;
    imageHosts.set(host, (imageHosts.get(host) ?? 0) + 1);
  } catch {
    fail(`Invalid image URL: ${src}`);
  }
}

for (const make of catalog) {
  if (make.coverImage?.src) {
    trackLocalOrRemote(make.coverImage.src);
  }
  for (const model of make.models) {
    for (const year of model.years) {
      for (const img of year.images) {
        trackLocalOrRemote(img.src);
      }
      for (const trim of year.performance?.trims ?? []) {
        if (trim.image) trackLocalOrRemote(trim.image);
      }
    }
  }
}

if (missingLocal.size > 0) {
  const sample = [...missingLocal].slice(0, 8).join(", ");
  const message = `${missingLocal.size} local image file(s) missing or too small under public/ (e.g. ${sample}). Run \`pnpm build:catalog\` (or \`pnpm fetch:trim-images\`) before deploy.`;
  if (requireLocalImages) {
    fail(message);
  } else {
    warn(message);
  }
}

const stats = catalogStats(catalog);
const report = {
  ...stats,
  imageHosts: Object.fromEntries(imageHosts),
  issues,
};

const out = path.join(ROOT, "catalog-validation.json");
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);

const errors = issues.filter((i) => i.level === "error");
const warnings = issues.filter((i) => i.level === "warn");

console.log(
  `Catalog: ${report.makes} makes, ${report.models} models, ${report.years} years`,
);
console.log(`Image hosts: ${JSON.stringify(report.imageHosts)}`);
console.log(`Errors: ${errors.length}, warnings: ${warnings.length}`);
for (const issue of issues) {
  console.log(`[${issue.level}] ${issue.message}`);
}

if (errors.length > 0) {
  process.exitCode = 1;
}
