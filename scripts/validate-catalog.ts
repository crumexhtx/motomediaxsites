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

type DiscontinuedInfo = {
  lastYear: number;
  message: string;
  banner?: boolean;
  ghostYears?: number[];
};

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
const discontinued = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/discontinued.json"), "utf8"),
) as Record<string, DiscontinuedInfo>;

const brandNames = new Set(brands.map((b) => b.brand));
const makeNames = new Set(catalog.map((m) => m.name));

for (const brand of brandNames) {
  if (!makeNames.has(brand)) {
    fail(`Missing make in catalog: ${brand}`);
  }
}

function looksTruncatedMidSentence(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/[.!?]["']?$/.test(t) || /…$/.test(t)) return false;
  return /[a-zA-Z,;:]$/.test(t);
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
  if (looksTruncatedMidSentence(make.blurb ?? "")) {
    fail(
      `${make.name}: blurb truncated mid-sentence — run pnpm repair:copy`,
    );
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
    const key = `${make.slug}/${model.slug}`;
    const disc = discontinued[key];
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
      if (/—\s*offered in the U\.S\. market\.?$/i.test(year.summary ?? "")) {
        fail(
          `${make.name} ${model.name} ${year.year}: thin summary stub — run pnpm repair:copy`,
        );
      }

      if (year.recalls) {
        for (const recall of year.recalls) {
          if (
            !recall.campaignNumber?.trim() ||
            !recall.date?.trim() ||
            !recall.component?.trim() ||
            !recall.summary?.trim()
          ) {
            fail(
              `${make.name} ${model.name} ${year.year}: incomplete recall entry — require date, component, summary, campaignNumber`,
            );
          }
        }
      }
      if (year.safetyStatus?.recalls === "error") {
        warn(
          `${make.name} ${model.name} ${year.year}: recall fetch failed (${year.safetyStatus.recallsError ?? "unknown"}) — re-run pnpm enrich:nhtsa-recalls`,
        );
      }
      if (year.safetyStatus?.complaints === "error") {
        warn(
          `${make.name} ${model.name} ${year.year}: complaint fetch failed (${year.safetyStatus.complaintsError ?? "unknown"}) — re-run pnpm enrich:nhtsa-complaints`,
        );
      }
      if (year.complaints?.byComponent) {
        for (const row of year.complaints.byComponent) {
          if (!row.component?.trim() || !(row.count > 0)) {
            fail(
              `${make.name} ${model.name} ${year.year}: invalid complaint category row`,
            );
          }
        }
      }
    }

    if (disc && disc.banner !== false) {
      const last = model.years.find((y) => y.year === disc.lastYear);
      if (!last) {
        fail(
          `${key}: discontinued lastYear ${disc.lastYear} missing from catalog — run pnpm prune:ghost-years`,
        );
      } else {
        if (!/final u\.?s\.? catalog year/i.test(last.summary ?? "")) {
          fail(
            `${key} ${disc.lastYear}: summary should mark final U.S. catalog year`,
          );
        }
        if (disc.message && !(last.description ?? "").includes(disc.message)) {
          fail(
            `${key} ${disc.lastYear}: description missing discontinued message`,
          );
        }
        if (/\bcontinues\b/i.test(last.description ?? "")) {
          fail(
            `${key} ${disc.lastYear}: discontinued description still says "continues" — run pnpm refresh:discontinued`,
          );
        }
        if (/\bfrom 20(\d{2}) until 20\1\b/i.test(last.description ?? "")) {
          fail(
            `${key} ${disc.lastYear}: corrupted same-year range — run pnpm refresh:discontinued`,
          );
        }
        if (/may refer to/i.test((last.description ?? "").slice(0, 280))) {
          fail(
            `${key} ${disc.lastYear}: Wikipedia disambiguation leaked into description`,
          );
        }
        if (last.specs && last.specs.available !== false) {
          fail(`${key} ${disc.lastYear}: specs.available should be false`);
        }
      }
      for (const ghost of disc.ghostYears ?? []) {
        if (model.years.some((y) => y.year === ghost)) {
          fail(
            `${key}: ghost year ${ghost} still present in catalog — run pnpm prune:ghost-years`,
          );
        }
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
