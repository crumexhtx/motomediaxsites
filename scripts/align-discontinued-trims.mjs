/**
 * Align trim JSON year keys with model-years.json for discontinued models.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modelYears = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/model-years.json"), "utf8"),
);
const discontinued = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/discontinued.json"), "utf8"),
);

const TRIM_DIR = path.join(ROOT, "src/data/trims");

for (const [key, years] of Object.entries(modelYears)) {
  if (!discontinued[key] && !["chevrolet/malibu", "kia/forte", "nissan/gt-r", "bmw/m5"].includes(key)) {
    // only touch discontinued + newly overridden models from this pass
  }
}

const targets = Object.keys(discontinued);

for (const key of targets) {
  const [make, model] = key.split("/");
  const file = path.join(TRIM_DIR, `${make}.json`);
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!data[model]) continue;

  const allowed = new Set((modelYears[key] || [discontinued[key].lastYear]).map(String));
  const existing = data[model];
  const templateYear =
    Object.keys(existing)
      .map(Number)
      .sort((a, b) => b - a)
      .map(String)
      .find((y) => existing[y]) || Object.keys(existing)[0];

  const next = {};
  for (const year of [...allowed].sort()) {
    if (existing[year]) {
      next[year] = existing[year];
      continue;
    }
    // Prefer copying from lastYear-ish content: use newest existing as template
    const src = existing[String(discontinued[key].lastYear)] || existing[templateYear];
    if (!src) continue;
    next[year] = structuredClone(src);
    // Soften "discontinued" stub names on the real last year
    if (next[year].trims?.length === 1 && next[year].trims[0].id === "discontinued") {
      const t = next[year].trims[0];
      t.id = "final";
      t.name = t.name?.replace(/\s*\(.*?\)\s*$/, "") || `Final year`;
      if (!t.notes) t.notes = discontinued[key].message;
      next[year].defaultTrimId = "final";
    }
    console.log(`trim clone ${key} → ${year}`);
  }

  // Drop years not allowed
  for (const y of Object.keys(existing)) {
    if (!allowed.has(y)) console.log(`trim drop ${key}/${y}`);
  }

  data[model] = next;
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

console.log("trim align done");
