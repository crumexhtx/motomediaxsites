/**
 * Build / refresh discontinued.json from model-years.json pins.
 * Active gap-year entries (banner:false) are preserved.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODEL_YEARS_PATH = path.join(ROOT, "src/data/model-years.json");
const DISCONTINUED_PATH = path.join(ROOT, "src/data/discontinued.json");

const DEFAULT_YEARS = [2024, 2025, 2026];

/** Human labels for auto-generated messages. */
const LABELS = {
  "ford/fusion": "U.S. Fusion",
  "ford/fiesta-st": "U.S. Fiesta ST",
  "ford/focus": "U.S. Focus",
  "ford/focus-rs": "U.S. Focus RS",
  "ford/gt": "Ford GT limited production",
  "chevrolet/camaro": "U.S. Camaro",
  "chevrolet/volt": "Chevrolet Volt",
  "chevrolet/cruze": "U.S. Cruze",
  "chevrolet/bolt-ev": "Bolt EV",
  "chevrolet/malibu": "U.S. Malibu",
  "honda/s2000": "Honda S2000",
  "honda/element": "Honda Element",
  "honda/fit": "U.S. Fit",
  "honda/insight": "U.S. Insight",
  "nissan/350z": "Nissan 350Z",
  "nissan/370z": "Nissan 370Z",
  "nissan/xterra": "Nissan Xterra",
  "nissan/maxima": "U.S. Maxima",
  "nissan/gt-r": "U.S. GT-R",
  "hyundai/veloster": "Hyundai Veloster",
  "hyundai/genesis": "Hyundai Genesis sedan",
  "kia/optima": "Kia Optima",
  "kia/stinger": "Kia Stinger",
  "kia/rio": "U.S. Rio",
  "kia/forte": "U.S. Forte",
  "bmw/i3": "BMW i3",
  "bmw/i8": "BMW i8",
  "jeep/renegade": "U.S. Renegade",
  "jeep/cherokee": "U.S. Cherokee",
  "mercedes-benz/slk-slc": "Mercedes-Benz SLK/SLC",
  "volkswagen/beetle": "Volkswagen Beetle",
  "volkswagen/passat": "U.S. Passat",
  "volkswagen/touareg": "Volkswagen Touareg",
  "volkswagen/golf": "U.S. Golf",
  "mazda/rx-8": "Mazda RX-8",
  "mazda/mazda6": "Mazda6",
  "mazda/cx-9": "Mazda CX-9",
  "mazda/mazdaspeed3": "Mazdaspeed3",
  "tesla/roadster": "Tesla Roadster",
};

const modelYears = JSON.parse(fs.readFileSync(MODEL_YEARS_PATH, "utf8"));
const existing = JSON.parse(fs.readFileSync(DISCONTINUED_PATH, "utf8"));

const next = { ...existing };

for (const [key, years] of Object.entries(modelYears)) {
  if (!Array.isArray(years) || years.length === 0) continue;
  const lastYear = Math.max(...years);
  const ghostYears = DEFAULT_YEARS.filter((y) => !years.includes(y));

  // Preserve hand-tuned gap-year entries (e.g. M5 2024).
  if (existing[key]?.banner === false) {
    next[key] = existing[key];
    continue;
  }

  // Still fully in the default window with no ghosts → not discontinued.
  if (ghostYears.length === 0 && years.some((y) => y >= 2025)) {
    // e.g. only pins that still cover current years without ghosts
    if (!existing[key]) continue;
  }

  if (ghostYears.length === 0 && !existing[key]) continue;

  const label = LABELS[key] ?? key.split("/")[1];
  const message =
    existing[key]?.message ??
    (key === "chevrolet/bolt-ev"
      ? "The Bolt EV ended after 2023. Chevrolet has signaled a return as a 2027 model."
      : `The ${label} ended after ${lastYear}. This page covers the final model year.`);

  next[key] = {
    lastYear,
    ghostYears: ghostYears.length ? ghostYears : existing[key]?.ghostYears ?? [],
    message,
    ...(existing[key]?.banner === false ? { banner: false } : {}),
  };
}

// Keep M5 gap entry explicit.
next["bmw/m5"] = {
  lastYear: 2025,
  ghostYears: [2024],
  message:
    "There was no 2024 M5 model year; the new generation begins in 2025.",
  banner: false,
};

const sorted = Object.fromEntries(
  Object.keys(next)
    .sort()
    .map((k) => [k, next[k]]),
);

fs.writeFileSync(DISCONTINUED_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`Wrote ${Object.keys(sorted).length} discontinued entries`);
