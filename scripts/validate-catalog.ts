import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MakeEntry } from "../src/data/catalog";
import brands from "../src/data/brands.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const YEARS = new Set([2024, 2025, 2026]);

type Issue = { level: "error" | "warn"; message: string };

const issues: Issue[] = [];
const catalog = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../src/data/catalog.generated.json"),
    "utf8",
  ),
) as MakeEntry[];

function fail(message: string) {
  issues.push({ level: "error", message });
}

function warn(message: string) {
  issues.push({ level: "warn", message });
}

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
    for (const year of model.years) {
      if (!YEARS.has(year.year)) {
        fail(
          `${make.name} ${model.name} ${year.year}: year outside 2024–2026`,
        );
      }
      if (!year.images?.length) {
        warn(`${make.name} ${model.name} ${year.year}: no images`);
      }
      if (!year.summary || !year.description) {
        fail(`${make.name} ${model.name} ${year.year}: missing copy`);
      }
    }
  }
}

const imageHosts = new Map<string, number>();
const missingLocal = new Set<string>();
const requireLocalImages = process.env.REQUIRE_LOCAL_IMAGES === "1";

for (const make of catalog) {
  for (const model of make.models) {
    for (const year of model.years) {
      for (const img of year.images) {
        if (img.src.startsWith("/")) {
          const kind = img.src.startsWith("/catalog/")
            ? "local-catalog"
            : img.src.startsWith("/brands/")
              ? "local-brands"
              : "local-other";
          imageHosts.set(kind, (imageHosts.get(kind) ?? 0) + 1);

          const abs = path.join(
            __dirname,
            "..",
            "public",
            img.src.replace(/^\//, ""),
          );
          if (!fs.existsSync(abs) || fs.statSync(abs).size < 500) {
            missingLocal.add(img.src);
          }
          continue;
        }
        try {
          const host = new URL(img.src).hostname;
          imageHosts.set(host, (imageHosts.get(host) ?? 0) + 1);
        } catch {
          fail(`Invalid image URL: ${img.src}`);
        }
      }
    }
  }
}

if (missingLocal.size > 0) {
  const sample = [...missingLocal].slice(0, 8).join(", ");
  const message = `${missingLocal.size} local image file(s) missing under public/ (e.g. ${sample}). Run \`pnpm build:catalog\` (or \`pnpm fetch:trim-images\`) before deploy.`;
  if (requireLocalImages) {
    fail(message);
  } else {
    warn(message);
  }
}

const report = {
  makes: catalog.length,
  models: catalog.reduce((n, m) => n + m.models.length, 0),
  years: catalog.reduce(
    (n, m) => n + m.models.reduce((y, model) => y + model.years.length, 0),
    0,
  ),
  imageHosts: Object.fromEntries(imageHosts),
  issues,
};

const out = path.join(__dirname, "..", "catalog-validation.json");
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
  process.exit(1);
}
