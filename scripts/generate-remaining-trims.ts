/**
 * Generate curated trim + image map JSON for remaining top-15 brands.
 * Run: pnpm exec tsx scripts/generate-remaining-trims.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../src/data/trims");

type Trim = {
  id: string;
  name: string;
  engine?: string;
  aspiration?: string;
  horsepower?: number;
  torqueLbFt?: number;
  zeroToSixtySec?: number;
  transmission?: string;
  drivetrain?: string;
  mpgCity?: number;
  mpgHighway?: number;
  mpgCombined?: number;
  batteryKwh?: number;
  rangeMiles?: number;
  cargoCuFt?: number;
  towingLb?: number;
  groundClearanceIn?: number;
  seatingCapacity?: number;
  notes?: string;
};

type ModelDef = {
  slug: string;
  defaultTrimId: string;
  trims: Trim[];
  years?: number[];
  legacy?: boolean;
};

type BrandDef = {
  slug: string;
  models: ModelDef[];
};

function yearsFor(m: ModelDef): number[] {
  return m.years ?? [2024, 2025, 2026];
}

function expandBrand(brand: BrandDef) {
  const trimsOut: Record<string, Record<string, unknown>> = {};
  const imagesOut: Record<string, Record<string, { query: string }>> = {};

  for (const model of brand.models) {
    const byYear: Record<string, unknown> = {};
    for (const y of yearsFor(model)) {
      byYear[String(y)] = {
        defaultTrimId: model.defaultTrimId,
        trims: model.trims.map((t) =>
          model.legacy
            ? {
                ...t,
                notes:
                  t.notes ??
                  "Limited or discontinued in the U.S. for recent model years.",
              }
            : t,
        ),
      };
    }
    trimsOut[model.slug] = byYear;

    const img: Record<string, { query: string }> = {};
    for (const t of model.trims) {
      img[t.id] = {
        query: `${brand.slug.replace(/-/g, " ")} ${model.slug.replace(/-/g, " ")} ${t.name}`,
      };
    }
    imagesOut[model.slug] = img;
  }

  return { trimsOut, imagesOut };
}

function writeBrand(brand: BrandDef) {
  const { trimsOut, imagesOut } = expandBrand(brand);
  fs.writeFileSync(
    path.join(OUT, `${brand.slug}.json`),
    `${JSON.stringify(trimsOut, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT, `${brand.slug}-images.json`),
    `${JSON.stringify(imagesOut, null, 2)}\n`,
  );
  console.log(`wrote ${brand.slug} (${brand.models.length} models)`);
}

const brands: BrandDef[] = [
  {
    slug: "chevrolet",
    models: [
      {
        slug: "corvette",
        defaultTrimId: "stingray",
        trims: [
          { id: "stingray", name: "Stingray", engine: "6.2L V8", horsepower: 490, torqueLbFt: 465, zeroToSixtySec: 2.9, drivetrain: "RWD", mpgCombined: 19, seatingCapacity: 2 },
          { id: "z06", name: "Z06", engine: "5.5L Flat-Plane V8", horsepower: 670, torqueLbFt: 460, zeroToSixtySec: 2.6, drivetrain: "RWD", seatingCapacity: 2 },
        ],
      },
      {
        slug: "camaro",
        defaultTrimId: "ss",
        legacy: true,
        trims: [
          { id: "ss", name: "SS (final years)", engine: "6.2L V8", horsepower: 455, drivetrain: "RWD", notes: "Camaro production ended after 2024." },
          { id: "zl1", name: "ZL1", engine: "6.2L Supercharged V8", horsepower: 650, drivetrain: "RWD" },
        ],
      },
      {
        slug: "silverado",
        defaultTrimId: "lt",
        trims: [
          { id: "lt", name: "LT 5.3 V8", engine: "5.3L V8", horsepower: 355, torqueLbFt: 383, drivetrain: "4WD", mpgCombined: 18, towingLb: 11000, seatingCapacity: 5 },
          { id: "trail-boss", name: "LT Trail Boss", engine: "5.3L V8", horsepower: 355, drivetrain: "4WD", groundClearanceIn: 11.2, seatingCapacity: 5 },
          { id: "zr2", name: "ZR2", engine: "6.2L V8", horsepower: 420, drivetrain: "4WD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "tahoe",
        defaultTrimId: "lt",
        trims: [
          { id: "lt", name: "LT", engine: "5.3L V8", horsepower: 355, drivetrain: "4WD", mpgCombined: 17, seatingCapacity: 8, towingLb: 8400 },
          { id: "z71", name: "Z71", engine: "5.3L V8", horsepower: 355, drivetrain: "4WD", seatingCapacity: 8 },
        ],
      },
      {
        slug: "suburban",
        defaultTrimId: "lt",
        trims: [
          { id: "lt", name: "LT", engine: "5.3L V8", horsepower: 355, drivetrain: "4WD", mpgCombined: 16, seatingCapacity: 8, towingLb: 8300 },
        ],
      },
      {
        slug: "equinox",
        defaultTrimId: "lt",
        trims: [
          { id: "lt", name: "LT", engine: "1.5L Turbo I4", horsepower: 175, drivetrain: "FWD / AWD", mpgCombined: 28, seatingCapacity: 5 },
          { id: "ev", name: "EV", engine: "Electric", aspiration: "Electric", horsepower: 210, rangeMiles: 319, drivetrain: "FWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "malibu",
        defaultTrimId: "lt",
        legacy: true,
        trims: [{ id: "lt", name: "LT (ending)", engine: "1.5L Turbo I4", horsepower: 163, mpgCombined: 31, notes: "Malibu ends after 2025 in the U.S." }],
      },
      {
        slug: "colorado",
        defaultTrimId: "lt",
        trims: [
          { id: "lt", name: "LT", engine: "2.7L Turbo I4", horsepower: 310, torqueLbFt: 430, drivetrain: "4WD", mpgCombined: 20, towingLb: 7700, seatingCapacity: 5 },
          { id: "zr2", name: "ZR2", engine: "2.7L Turbo I4", horsepower: 310, drivetrain: "4WD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "bolt-ev",
        defaultTrimId: "1lt",
        legacy: true,
        trims: [{ id: "1lt", name: "1LT", engine: "Electric", horsepower: 200, rangeMiles: 259, notes: "Bolt EV production ended; page kept for catalog." }],
      },
      {
        slug: "volt",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Volt (discontinued)", notes: "Discontinued after 2019." }],
      },
      {
        slug: "cruze",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Cruze (discontinued)", notes: "Discontinued after 2019." }],
      },
    ],
  },
  {
    slug: "honda",
    models: [
      {
        slug: "civic",
        defaultTrimId: "sport",
        trims: [
          { id: "sport", name: "Sport", engine: "2.0L I4", horsepower: 158, mpgCombined: 33, drivetrain: "FWD", seatingCapacity: 5 },
          { id: "sport-touring", name: "Sport Touring Hybrid", engine: "2.0L Hybrid", aspiration: "Hybrid", horsepower: 200, mpgCombined: 48, drivetrain: "FWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "civic-type-r",
        defaultTrimId: "type-r",
        trims: [
          { id: "type-r", name: "Type R", engine: "2.0L Turbo I4", horsepower: 315, torqueLbFt: 310, zeroToSixtySec: 4.9, drivetrain: "FWD", mpgCombined: 25, seatingCapacity: 4 },
        ],
      },
      {
        slug: "accord",
        defaultTrimId: "sport-hybrid",
        trims: [
          { id: "sport-hybrid", name: "Sport Hybrid", engine: "2.0L Hybrid", aspiration: "Hybrid", horsepower: 204, mpgCombined: 44, drivetrain: "FWD", seatingCapacity: 5 },
          { id: "touring-hybrid", name: "Touring Hybrid", engine: "2.0L Hybrid", aspiration: "Hybrid", horsepower: 204, mpgCombined: 44, drivetrain: "FWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "cr-v",
        defaultTrimId: "sport",
        trims: [
          { id: "sport", name: "Sport Hybrid", engine: "2.0L Hybrid", aspiration: "Hybrid", horsepower: 204, mpgCombined: 40, drivetrain: "AWD", seatingCapacity: 5, cargoCuFt: 39.3 },
          { id: "sport-l", name: "Sport-L Hybrid", engine: "2.0L Hybrid", aspiration: "Hybrid", horsepower: 204, mpgCombined: 40, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "pilot",
        defaultTrimId: "sport",
        trims: [
          { id: "sport", name: "Sport", engine: "3.5L V6", horsepower: 285, drivetrain: "AWD", mpgCombined: 22, seatingCapacity: 8, towingLb: 5000 },
          { id: "trailSport", name: "TrailSport", engine: "3.5L V6", horsepower: 285, drivetrain: "AWD", seatingCapacity: 8 },
        ],
      },
      {
        slug: "odyssey",
        defaultTrimId: "ex-l",
        trims: [
          { id: "ex-l", name: "EX-L", engine: "3.5L V6", horsepower: 280, mpgCombined: 22, seatingCapacity: 8, cargoCuFt: 32.8 },
        ],
      },
      {
        slug: "ridgeline",
        defaultTrimId: "sport",
        trims: [
          { id: "sport", name: "Sport", engine: "3.5L V6", horsepower: 280, drivetrain: "AWD", mpgCombined: 21, towingLb: 5000, seatingCapacity: 5 },
          { id: "trailsport", name: "TrailSport", engine: "3.5L V6", horsepower: 280, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "insight",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Insight (discontinued)", notes: "U.S. Insight ended after 2022." }],
      },
      {
        slug: "fit",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Fit (discontinued)", notes: "U.S. Fit ended after 2020." }],
      },
      {
        slug: "element",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Element (discontinued)", notes: "Discontinued after 2011." }],
      },
      {
        slug: "s2000",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "S2000 (discontinued)", engine: "2.2L I4", horsepower: 237, notes: "Ended after 2009." }],
      },
    ],
  },
  {
    slug: "nissan",
    models: [
      {
        slug: "z",
        defaultTrimId: "sport",
        trims: [
          { id: "sport", name: "Sport", engine: "3.0L Twin-Turbo V6", horsepower: 400, torqueLbFt: 350, zeroToSixtySec: 4.5, drivetrain: "RWD", mpgCombined: 22, seatingCapacity: 2 },
          { id: "nismo", name: "NISMO", engine: "3.0L Twin-Turbo V6", horsepower: 420, torqueLbFt: 384, zeroToSixtySec: 4.3, drivetrain: "RWD", seatingCapacity: 2 },
        ],
      },
      {
        slug: "altima",
        defaultTrimId: "sv",
        trims: [
          { id: "sv", name: "SV", engine: "2.5L I4", horsepower: 188, mpgCombined: 31, drivetrain: "FWD", seatingCapacity: 5 },
          { id: "sr", name: "SR VC-Turbo", engine: "2.0L Turbo I4", horsepower: 248, mpgCombined: 28, drivetrain: "FWD / AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "sentra",
        defaultTrimId: "sv",
        trims: [
          { id: "sv", name: "SV", engine: "2.0L I4", horsepower: 149, mpgCombined: 33, drivetrain: "FWD", seatingCapacity: 5 },
          { id: "sr", name: "SR", engine: "2.0L I4", horsepower: 149, mpgCombined: 32, drivetrain: "FWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "rogue",
        defaultTrimId: "sv",
        trims: [
          { id: "sv", name: "SV", engine: "1.5L Turbo I3", horsepower: 201, mpgCombined: 33, drivetrain: "FWD / AWD", seatingCapacity: 5, cargoCuFt: 31.6 },
          { id: "platinum", name: "Platinum", engine: "1.5L Turbo I3", horsepower: 201, mpgCombined: 32, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "pathfinder",
        defaultTrimId: "sv",
        trims: [
          { id: "sv", name: "SV", engine: "3.5L V6", horsepower: 284, mpgCombined: 23, drivetrain: "4WD", seatingCapacity: 8, towingLb: 6000 },
          { id: "rock-creek", name: "Rock Creek", engine: "3.5L V6", horsepower: 284, drivetrain: "4WD", seatingCapacity: 7 },
        ],
      },
      {
        slug: "frontier",
        defaultTrimId: "sv",
        trims: [
          { id: "sv", name: "SV", engine: "3.8L V6", horsepower: 310, torqueLbFt: 281, drivetrain: "4WD", mpgCombined: 20, towingLb: 6720, seatingCapacity: 5 },
          { id: "pro-4x", name: "PRO-4X", engine: "3.8L V6", horsepower: 310, drivetrain: "4WD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "ariya",
        defaultTrimId: "engage",
        trims: [
          { id: "engage", name: "Engage", engine: "Electric", aspiration: "Electric", horsepower: 214, rangeMiles: 216, drivetrain: "FWD", seatingCapacity: 5 },
          { id: "platinum", name: "Platinum+", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 389, rangeMiles: 267, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "leaf",
        defaultTrimId: "sv-plus",
        trims: [
          { id: "sv-plus", name: "SV Plus", engine: "Electric", aspiration: "Electric", horsepower: 214, rangeMiles: 212, drivetrain: "FWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "maxima",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Maxima (ending)", engine: "3.5L V6", horsepower: 300, notes: "U.S. Maxima ended after 2023." }],
      },
      {
        slug: "gt-r",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "GT-R (ended)", engine: "3.8L Twin-Turbo V6", horsepower: 565, notes: "U.S. GT-R ended after 2024." }],
      },
      {
        slug: "370z",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "370Z (discontinued)", notes: "Replaced by Nissan Z." }],
      },
      {
        slug: "350z",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "350Z (discontinued)", notes: "Ended after 2009." }],
      },
      {
        slug: "xterra",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Xterra (discontinued)", notes: "Ended after 2015." }],
      },
    ],
  },
  {
    slug: "hyundai",
    models: [
      {
        slug: "elantra",
        defaultTrimId: "sel",
        trims: [
          { id: "sel", name: "SEL", engine: "2.0L I4", horsepower: 147, mpgCombined: 35, drivetrain: "FWD", seatingCapacity: 5 },
          { id: "hybrid", name: "Hybrid Blue", engine: "1.6L Hybrid", aspiration: "Hybrid", horsepower: 139, mpgCombined: 54, drivetrain: "FWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "elantra-n",
        defaultTrimId: "n",
        trims: [
          { id: "n", name: "N", engine: "2.0L Turbo I4", horsepower: 276, torqueLbFt: 289, zeroToSixtySec: 5.0, drivetrain: "FWD", mpgCombined: 25, seatingCapacity: 5 },
        ],
      },
      {
        slug: "sonata",
        defaultTrimId: "sel",
        trims: [
          { id: "sel", name: "SEL", engine: "2.5L I4", horsepower: 191, mpgCombined: 31, drivetrain: "FWD", seatingCapacity: 5 },
          { id: "hybrid", name: "Hybrid", engine: "2.0L Hybrid", aspiration: "Hybrid", horsepower: 192, mpgCombined: 47, drivetrain: "FWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "tucson",
        defaultTrimId: "sel",
        trims: [
          { id: "sel", name: "SEL", engine: "2.5L I4", horsepower: 187, mpgCombined: 28, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "hybrid", name: "Hybrid", engine: "1.6L Turbo Hybrid", aspiration: "Hybrid", horsepower: 226, mpgCombined: 37, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "santa-fe",
        defaultTrimId: "sel",
        trims: [
          { id: "sel", name: "SEL", engine: "2.5L I4", horsepower: 277, torqueLbFt: 311, drivetrain: "AWD", mpgCombined: 23, seatingCapacity: 5 },
          { id: "hybrid", name: "Hybrid", engine: "1.6L Turbo Hybrid", aspiration: "Hybrid", horsepower: 231, mpgCombined: 36, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "palisade",
        defaultTrimId: "sel",
        trims: [
          { id: "sel", name: "SEL", engine: "3.8L V6", horsepower: 291, mpgCombined: 22, drivetrain: "AWD", seatingCapacity: 8, towingLb: 5000 },
          { id: "calligraphy", name: "Calligraphy", engine: "3.8L V6", horsepower: 291, drivetrain: "AWD", seatingCapacity: 7 },
        ],
      },
      {
        slug: "ioniq-5",
        defaultTrimId: "sel",
        trims: [
          { id: "sel", name: "SEL AWD", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 320, rangeMiles: 260, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "n", name: "N", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 641, zeroToSixtySec: 3.4, rangeMiles: 221, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "ioniq-6",
        defaultTrimId: "sel",
        trims: [
          { id: "sel", name: "SEL", engine: "Electric", aspiration: "Electric", horsepower: 225, rangeMiles: 361, drivetrain: "RWD", seatingCapacity: 5 },
          { id: "limited", name: "Limited AWD", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 320, rangeMiles: 316, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "veloster",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Veloster (discontinued)", notes: "Ended after 2022." }],
      },
      {
        slug: "genesis",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Genesis sedan (moved)", notes: "Genesis is now a separate brand; page kept for catalog." }],
      },
    ],
  },
  {
    slug: "kia",
    models: [
      {
        slug: "k5",
        defaultTrimId: "gt-line",
        trims: [
          { id: "gt-line", name: "GT-Line", engine: "1.6L Turbo I4", horsepower: 180, mpgCombined: 31, drivetrain: "FWD", seatingCapacity: 5 },
          { id: "gt", name: "GT", engine: "2.5L Turbo I4", horsepower: 290, zeroToSixtySec: 5.1, mpgCombined: 27, drivetrain: "FWD / AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "forte",
        defaultTrimId: "gt-line",
        trims: [
          { id: "gt-line", name: "GT-Line", engine: "2.0L I4", horsepower: 147, mpgCombined: 35, drivetrain: "FWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "sportage",
        defaultTrimId: "x-line",
        trims: [
          { id: "x-line", name: "X-Line", engine: "2.5L I4", horsepower: 187, mpgCombined: 26, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "hybrid", name: "Hybrid", engine: "1.6L Turbo Hybrid", aspiration: "Hybrid", horsepower: 227, mpgCombined: 38, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "sorento",
        defaultTrimId: "x-line",
        trims: [
          { id: "x-line", name: "X-Line", engine: "2.5L Turbo I4", horsepower: 281, mpgCombined: 23, drivetrain: "AWD", seatingCapacity: 7 },
          { id: "hybrid", name: "Hybrid", engine: "1.6L Turbo Hybrid", aspiration: "Hybrid", horsepower: 227, mpgCombined: 36, drivetrain: "AWD", seatingCapacity: 6 },
        ],
      },
      {
        slug: "telluride",
        defaultTrimId: "sx",
        trims: [
          { id: "sx", name: "SX", engine: "3.8L V6", horsepower: 291, mpgCombined: 22, drivetrain: "AWD", seatingCapacity: 8, towingLb: 5000 },
          { id: "x-pro", name: "X-Pro", engine: "3.8L V6", horsepower: 291, drivetrain: "AWD", seatingCapacity: 7 },
        ],
      },
      {
        slug: "soul",
        defaultTrimId: "gt-line",
        trims: [
          { id: "gt-line", name: "GT-Line", engine: "2.0L I4", horsepower: 147, mpgCombined: 29, drivetrain: "FWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "ev6",
        defaultTrimId: "wind",
        trims: [
          { id: "wind", name: "Wind AWD", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 320, rangeMiles: 282, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "gt", name: "GT", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 576, zeroToSixtySec: 3.4, rangeMiles: 218, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "ev9",
        defaultTrimId: "land",
        trims: [
          { id: "land", name: "Land AWD", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 379, rangeMiles: 280, drivetrain: "AWD", seatingCapacity: 7 },
          { id: "gt-line", name: "GT-Line", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 379, rangeMiles: 270, drivetrain: "AWD", seatingCapacity: 6 },
        ],
      },
      {
        slug: "stinger",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Stinger (ended)", engine: "3.3L Twin-Turbo V6", horsepower: 368, notes: "Ended after 2023." }],
      },
      {
        slug: "optima",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Optima (renamed K5)", notes: "Succeeded by K5." }],
      },
      {
        slug: "rio",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Rio (ending)", notes: "U.S. Rio discontinued." }],
      },
    ],
  },
  {
    slug: "subaru",
    models: [
      {
        slug: "impreza",
        defaultTrimId: "sport",
        trims: [
          { id: "sport", name: "Sport", engine: "2.0L Flat-4", horsepower: 152, mpgCombined: 30, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "rs", name: "RS", engine: "2.5L Flat-4", horsepower: 182, mpgCombined: 29, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "wrx-sti",
        defaultTrimId: "wrx",
        trims: [
          { id: "wrx", name: "WRX", engine: "2.4L Turbo Flat-4", horsepower: 271, torqueLbFt: 258, zeroToSixtySec: 5.5, drivetrain: "AWD", mpgCombined: 22, seatingCapacity: 5 },
          { id: "tr", name: "WRX TR", engine: "2.4L Turbo Flat-4", horsepower: 271, drivetrain: "AWD", seatingCapacity: 5, notes: "STI nameplate paused; WRX TR is the current performance trim." },
        ],
      },
      {
        slug: "outback",
        defaultTrimId: "limited",
        trims: [
          { id: "limited", name: "Limited", engine: "2.5L Flat-4", horsepower: 182, mpgCombined: 26, drivetrain: "AWD", seatingCapacity: 5, groundClearanceIn: 8.7 },
          { id: "wilderness", name: "Wilderness", engine: "2.4L Turbo Flat-4", horsepower: 260, drivetrain: "AWD", seatingCapacity: 5, groundClearanceIn: 9.5 },
        ],
      },
      {
        slug: "forester",
        defaultTrimId: "sport",
        trims: [
          { id: "sport", name: "Sport", engine: "2.5L Flat-4", horsepower: 180, mpgCombined: 29, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "wilderness", name: "Wilderness", engine: "2.5L Flat-4", horsepower: 180, drivetrain: "AWD", seatingCapacity: 5, groundClearanceIn: 9.2 },
        ],
      },
      {
        slug: "crosstrek",
        defaultTrimId: "sport",
        trims: [
          { id: "sport", name: "Sport", engine: "2.5L Flat-4", horsepower: 182, mpgCombined: 29, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "wilderness", name: "Wilderness", engine: "2.5L Flat-4", horsepower: 182, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "ascent",
        defaultTrimId: "limited",
        trims: [
          { id: "limited", name: "Limited", engine: "2.4L Turbo Flat-4", horsepower: 260, mpgCombined: 23, drivetrain: "AWD", seatingCapacity: 8, towingLb: 5000 },
          { id: "touring", name: "Touring", engine: "2.4L Turbo Flat-4", horsepower: 260, drivetrain: "AWD", seatingCapacity: 7 },
        ],
      },
      {
        slug: "legacy",
        defaultTrimId: "sport",
        trims: [
          { id: "sport", name: "Sport", engine: "2.5L Flat-4", horsepower: 182, mpgCombined: 30, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "xt", name: "XT", engine: "2.4L Turbo Flat-4", horsepower: 260, mpgCombined: 26, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "brz",
        defaultTrimId: "premium",
        trims: [
          { id: "premium", name: "Premium", engine: "2.4L Flat-4", horsepower: 228, torqueLbFt: 184, zeroToSixtySec: 6.1, drivetrain: "RWD", mpgCombined: 22, seatingCapacity: 4 },
          { id: "ts", name: "tS", engine: "2.4L Flat-4", horsepower: 228, drivetrain: "RWD", seatingCapacity: 4 },
        ],
      },
    ],
  },
  {
    slug: "jeep",
    models: [
      {
        slug: "wrangler",
        defaultTrimId: "sport-s",
        trims: [
          { id: "sport-s", name: "Sport S", engine: "3.6L V6", horsepower: 285, drivetrain: "4WD", mpgCombined: 20, seatingCapacity: 5, groundClearanceIn: 9.7 },
          { id: "rubicon", name: "Rubicon", engine: "3.6L V6", horsepower: 285, drivetrain: "4WD", seatingCapacity: 5, groundClearanceIn: 10.8 },
          { id: "4xe", name: "Rubicon 4xe", engine: "2.0L Turbo PHEV", aspiration: "Plug-in hybrid", horsepower: 375, rangeMiles: 22, drivetrain: "4WD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "grand-cherokee",
        defaultTrimId: "limited",
        trims: [
          { id: "limited", name: "Limited", engine: "3.6L V6", horsepower: 293, mpgCombined: 22, drivetrain: "4WD", seatingCapacity: 5 },
          { id: "4xe", name: "4xe", engine: "2.0L Turbo PHEV", aspiration: "Plug-in hybrid", horsepower: 375, rangeMiles: 26, drivetrain: "4WD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "gladiator",
        defaultTrimId: "sport-s",
        trims: [
          { id: "sport-s", name: "Sport S", engine: "3.6L V6", horsepower: 285, drivetrain: "4WD", mpgCombined: 19, towingLb: 7650, seatingCapacity: 5 },
          { id: "rubicon", name: "Rubicon", engine: "3.6L V6", horsepower: 285, drivetrain: "4WD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "compass",
        defaultTrimId: "latitude",
        trims: [
          { id: "latitude", name: "Latitude", engine: "2.0L Turbo I4", horsepower: 200, mpgCombined: 25, drivetrain: "4WD", seatingCapacity: 5 },
          { id: "trailhawk", name: "Trailhawk", engine: "2.0L Turbo I4", horsepower: 200, drivetrain: "4WD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "cherokee",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Cherokee (ended)", notes: "U.S. Cherokee ended after 2023." }],
      },
      {
        slug: "renegade",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Renegade (ended)", notes: "U.S. Renegade ended after 2023." }],
      },
    ],
  },
  {
    slug: "gmc",
    models: [
      {
        slug: "sierra",
        defaultTrimId: "elevation",
        trims: [
          { id: "elevation", name: "Elevation", engine: "5.3L V8", horsepower: 355, drivetrain: "4WD", mpgCombined: 17, towingLb: 11000, seatingCapacity: 5 },
          { id: "at4", name: "AT4", engine: "6.2L V8", horsepower: 420, drivetrain: "4WD", seatingCapacity: 5 },
          { id: "denali", name: "Denali", engine: "6.2L V8", horsepower: 420, drivetrain: "4WD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "yukon",
        defaultTrimId: "slt",
        trims: [
          { id: "slt", name: "SLT", engine: "5.3L V8", horsepower: 355, mpgCombined: 17, drivetrain: "4WD", seatingCapacity: 8, towingLb: 8500 },
          { id: "at4", name: "AT4", engine: "6.2L V8", horsepower: 420, drivetrain: "4WD", seatingCapacity: 7 },
        ],
      },
      {
        slug: "acadia",
        defaultTrimId: "elevation",
        trims: [
          { id: "elevation", name: "Elevation", engine: "2.5L Turbo I4", horsepower: 328, mpgCombined: 24, drivetrain: "AWD", seatingCapacity: 7 },
          { id: "denali", name: "Denali", engine: "2.5L Turbo I4", horsepower: 328, drivetrain: "AWD", seatingCapacity: 6 },
        ],
      },
      {
        slug: "terrain",
        defaultTrimId: "elevation",
        trims: [
          { id: "elevation", name: "Elevation", engine: "1.5L Turbo I4", horsepower: 175, mpgCombined: 27, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "denali", name: "Denali", engine: "1.5L Turbo I4", horsepower: 175, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "canyon",
        defaultTrimId: "elevation",
        trims: [
          { id: "elevation", name: "Elevation", engine: "2.7L Turbo I4", horsepower: 310, torqueLbFt: 430, drivetrain: "4WD", mpgCombined: 20, towingLb: 7700, seatingCapacity: 5 },
          { id: "at4", name: "AT4", engine: "2.7L Turbo I4", horsepower: 310, drivetrain: "4WD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "hummer-ev",
        defaultTrimId: "edition-1",
        trims: [
          { id: "edition-1", name: "Pickup Edition 1", engine: "Tri-motor electric", aspiration: "Electric", horsepower: 1000, zeroToSixtySec: 3.0, rangeMiles: 329, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "suv", name: "SUV", engine: "Tri-motor electric", aspiration: "Electric", horsepower: 830, rangeMiles: 300, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
    ],
  },
  {
    slug: "bmw",
    models: [
      {
        slug: "3-series",
        defaultTrimId: "330i",
        trims: [
          { id: "330i", name: "330i", engine: "2.0L Turbo I4", horsepower: 255, mpgCombined: 29, drivetrain: "RWD / AWD", seatingCapacity: 5 },
          { id: "m340i", name: "M340i", engine: "3.0L Turbo I6", horsepower: 382, zeroToSixtySec: 4.1, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "5-series",
        defaultTrimId: "530i",
        trims: [
          { id: "530i", name: "530i", engine: "2.0L Turbo I4", horsepower: 255, mpgCombined: 29, drivetrain: "RWD / AWD", seatingCapacity: 5 },
          { id: "550e", name: "550e xDrive", engine: "3.0L Turbo PHEV", aspiration: "Plug-in hybrid", horsepower: 483, rangeMiles: 24, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "7-series",
        defaultTrimId: "740i",
        trims: [
          { id: "740i", name: "740i", engine: "3.0L Turbo I6", horsepower: 375, drivetrain: "RWD / AWD", seatingCapacity: 5 },
          { id: "i7", name: "i7 xDrive60", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 536, rangeMiles: 296, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "m3",
        defaultTrimId: "competition",
        trims: [
          { id: "competition", name: "Competition", engine: "3.0L Twin-Turbo I6", horsepower: 503, torqueLbFt: 479, zeroToSixtySec: 3.4, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "m4",
        defaultTrimId: "competition",
        trims: [
          { id: "competition", name: "Competition", engine: "3.0L Twin-Turbo I6", horsepower: 503, zeroToSixtySec: 3.4, drivetrain: "AWD", seatingCapacity: 4 },
        ],
      },
      {
        slug: "m2",
        defaultTrimId: "m2",
        trims: [
          { id: "m2", name: "M2", engine: "3.0L Twin-Turbo I6", horsepower: 453, zeroToSixtySec: 3.9, drivetrain: "RWD", seatingCapacity: 4 },
        ],
      },
      {
        slug: "m5",
        defaultTrimId: "competition",
        trims: [
          { id: "competition", name: "M5", engine: "4.4L Twin-Turbo V8 Hybrid", aspiration: "Hybrid", horsepower: 717, zeroToSixtySec: 3.4, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "x3",
        defaultTrimId: "30",
        trims: [
          { id: "30", name: "xDrive30", engine: "2.0L Turbo I4", horsepower: 255, mpgCombined: 26, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "m", name: "X3 M", engine: "3.0L Twin-Turbo I6", horsepower: 503, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "x5",
        defaultTrimId: "40i",
        trims: [
          { id: "40i", name: "xDrive40i", engine: "3.0L Turbo I6", horsepower: 375, mpgCombined: 23, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "m60i", name: "M60i", engine: "4.4L Twin-Turbo V8", horsepower: 523, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "x7",
        defaultTrimId: "40i",
        trims: [
          { id: "40i", name: "xDrive40i", engine: "3.0L Turbo I6", horsepower: 375, drivetrain: "AWD", seatingCapacity: 7 },
          { id: "m60i", name: "M60i", engine: "4.4L Twin-Turbo V8", horsepower: 523, drivetrain: "AWD", seatingCapacity: 6 },
        ],
      },
      {
        slug: "z4",
        defaultTrimId: "m40i",
        trims: [
          { id: "m40i", name: "M40i", engine: "3.0L Turbo I6", horsepower: 382, zeroToSixtySec: 3.9, drivetrain: "RWD", seatingCapacity: 2 },
        ],
      },
      {
        slug: "i4",
        defaultTrimId: "eDrive40",
        trims: [
          { id: "eDrive40", name: "eDrive40", engine: "Electric", aspiration: "Electric", horsepower: 335, rangeMiles: 301, drivetrain: "RWD", seatingCapacity: 5 },
          { id: "m50", name: "M50", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 536, rangeMiles: 269, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "ix",
        defaultTrimId: "xdrive50",
        trims: [
          { id: "xdrive50", name: "xDrive50", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 516, rangeMiles: 324, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "m60", name: "M60", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 610, rangeMiles: 288, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "i3",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "i3 (ended)", notes: "Ended after 2021." }],
      },
      {
        slug: "i8",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "i8 (ended)", notes: "Ended after 2020." }],
      },
    ],
  },
  {
    slug: "mercedes-benz",
    models: [
      {
        slug: "c-class",
        defaultTrimId: "c300",
        trims: [
          { id: "c300", name: "C 300", engine: "2.0L Turbo I4", horsepower: 255, mpgCombined: 28, drivetrain: "RWD / AWD", seatingCapacity: 5 },
          { id: "amg-c43", name: "AMG C 43", engine: "2.0L Turbo I4 Hybrid", horsepower: 416, zeroToSixtySec: 4.4, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "e-class",
        defaultTrimId: "e350",
        trims: [
          { id: "e350", name: "E 350", engine: "2.0L Turbo I4", horsepower: 255, mpgCombined: 28, drivetrain: "RWD / AWD", seatingCapacity: 5 },
          { id: "amg-e53", name: "AMG E 53", engine: "3.0L Turbo I6 Hybrid", horsepower: 443, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "s-class",
        defaultTrimId: "s500",
        trims: [
          { id: "s500", name: "S 500", engine: "3.0L Turbo I6", horsepower: 442, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "amg-s63", name: "AMG S 63 E Performance", engine: "4.0L Twin-Turbo V8 PHEV", horsepower: 791, zeroToSixtySec: 3.2, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "g-class",
        defaultTrimId: "g550",
        trims: [
          { id: "g550", name: "G 550", engine: "4.0L Twin-Turbo V8", horsepower: 443, drivetrain: "4WD", mpgCombined: 14, seatingCapacity: 5 },
          { id: "amg-g63", name: "AMG G 63", engine: "4.0L Twin-Turbo V8", horsepower: 577, zeroToSixtySec: 4.2, drivetrain: "4WD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "glc",
        defaultTrimId: "glc300",
        trims: [
          { id: "glc300", name: "GLC 300", engine: "2.0L Turbo I4", horsepower: 255, mpgCombined: 25, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "amg-glc43", name: "AMG GLC 43", engine: "2.0L Turbo Hybrid", horsepower: 416, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "gle",
        defaultTrimId: "gle350",
        trims: [
          { id: "gle350", name: "GLE 350", engine: "2.0L Turbo I4", horsepower: 255, mpgCombined: 23, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "amg-gle53", name: "AMG GLE 53", engine: "3.0L Turbo I6", horsepower: 429, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "gls",
        defaultTrimId: "gls450",
        trims: [
          { id: "gls450", name: "GLS 450", engine: "3.0L Turbo I6", horsepower: 375, drivetrain: "AWD", seatingCapacity: 7 },
          { id: "maybach", name: "Maybach GLS 600", engine: "4.0L Twin-Turbo V8", horsepower: 550, drivetrain: "AWD", seatingCapacity: 4 },
        ],
      },
      {
        slug: "cla",
        defaultTrimId: "cla250",
        trims: [
          { id: "cla250", name: "CLA 250", engine: "2.0L Turbo I4", horsepower: 221, mpgCombined: 29, drivetrain: "FWD / AWD", seatingCapacity: 5 },
          { id: "amg-cla35", name: "AMG CLA 35", engine: "2.0L Turbo I4", horsepower: 302, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "eqs",
        defaultTrimId: "eqs450",
        trims: [
          { id: "eqs450", name: "EQS 450+", engine: "Electric", aspiration: "Electric", horsepower: 329, rangeMiles: 350, drivetrain: "RWD", seatingCapacity: 5 },
          { id: "eqs580", name: "EQS 580", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 536, rangeMiles: 340, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "amg-gt",
        defaultTrimId: "gt",
        trims: [
          { id: "gt", name: "AMG GT", engine: "4.0L Twin-Turbo V8", horsepower: 469, zeroToSixtySec: 3.9, drivetrain: "RWD / AWD", seatingCapacity: 2 },
        ],
      },
      {
        slug: "sl-class",
        defaultTrimId: "sl43",
        trims: [
          { id: "sl43", name: "AMG SL 43", engine: "2.0L Turbo I4", horsepower: 375, drivetrain: "RWD", seatingCapacity: 4 },
          { id: "sl63", name: "AMG SL 63", engine: "4.0L Twin-Turbo V8", horsepower: 577, zeroToSixtySec: 3.5, drivetrain: "AWD", seatingCapacity: 4 },
        ],
      },
      {
        slug: "slk-slc",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "SLK/SLC (ended)", notes: "Succeeded by the new SL." }],
      },
    ],
  },
  {
    slug: "tesla",
    models: [
      {
        slug: "model-3",
        defaultTrimId: "long-range",
        trims: [
          { id: "rwd", name: "Rear-Wheel Drive", engine: "Electric", aspiration: "Electric", horsepower: 272, rangeMiles: 272, drivetrain: "RWD", seatingCapacity: 5 },
          { id: "long-range", name: "Long Range AWD", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 346, rangeMiles: 341, zeroToSixtySec: 4.2, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "performance", name: "Performance", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 510, rangeMiles: 303, zeroToSixtySec: 2.9, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "model-y",
        defaultTrimId: "long-range",
        trims: [
          { id: "rwd", name: "Rear-Wheel Drive", engine: "Electric", aspiration: "Electric", rangeMiles: 260, drivetrain: "RWD", seatingCapacity: 5 },
          { id: "long-range", name: "Long Range AWD", engine: "Dual-motor electric", aspiration: "Electric", rangeMiles: 320, zeroToSixtySec: 4.8, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "performance", name: "Performance", engine: "Dual-motor electric", aspiration: "Electric", rangeMiles: 285, zeroToSixtySec: 3.5, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "model-s",
        defaultTrimId: "long-range",
        trims: [
          { id: "long-range", name: "Long Range", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 670, rangeMiles: 405, zeroToSixtySec: 3.1, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "plaid", name: "Plaid", engine: "Tri-motor electric", aspiration: "Electric", horsepower: 1020, rangeMiles: 359, zeroToSixtySec: 2.0, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "model-x",
        defaultTrimId: "long-range",
        trims: [
          { id: "long-range", name: "Long Range", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 670, rangeMiles: 335, zeroToSixtySec: 3.8, drivetrain: "AWD", seatingCapacity: 6 },
          { id: "plaid", name: "Plaid", engine: "Tri-motor electric", aspiration: "Electric", horsepower: 1020, rangeMiles: 333, zeroToSixtySec: 2.5, drivetrain: "AWD", seatingCapacity: 6 },
        ],
      },
      {
        slug: "cybertruck",
        defaultTrimId: "awd",
        trims: [
          { id: "awd", name: "All-Wheel Drive", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 600, rangeMiles: 325, zeroToSixtySec: 4.1, drivetrain: "AWD", seatingCapacity: 5, towingLb: 11000 },
          { id: "cyberbeast", name: "Cyberbeast", engine: "Tri-motor electric", aspiration: "Electric", horsepower: 845, rangeMiles: 320, zeroToSixtySec: 2.6, drivetrain: "AWD", seatingCapacity: 5, towingLb: 11000 },
        ],
      },
      {
        slug: "roadster",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Roadster (next-gen TBA)", notes: "Next-gen Roadster not yet in volume production." }],
      },
    ],
  },
  {
    slug: "volkswagen",
    models: [
      {
        slug: "jetta",
        defaultTrimId: "se",
        trims: [
          { id: "se", name: "SE", engine: "1.5L Turbo I4", horsepower: 158, mpgCombined: 34, drivetrain: "FWD", seatingCapacity: 5 },
          { id: "gli", name: "GLI", engine: "2.0L Turbo I4", horsepower: 228, zeroToSixtySec: 6.0, mpgCombined: 28, drivetrain: "FWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "gti",
        defaultTrimId: "s",
        trims: [
          { id: "s", name: "S", engine: "2.0L Turbo I4", horsepower: 241, torqueLbFt: 273, zeroToSixtySec: 5.6, drivetrain: "FWD", mpgCombined: 28, seatingCapacity: 5 },
          { id: "autobahn", name: "Autobahn", engine: "2.0L Turbo I4", horsepower: 241, drivetrain: "FWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "golf-r",
        defaultTrimId: "r",
        trims: [
          { id: "r", name: "Golf R", engine: "2.0L Turbo I4", horsepower: 315, torqueLbFt: 295, zeroToSixtySec: 4.6, drivetrain: "AWD", mpgCombined: 25, seatingCapacity: 5 },
        ],
      },
      {
        slug: "golf",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Golf (base ended U.S.)", notes: "U.S. lineup focuses on GTI / Golf R." }],
      },
      {
        slug: "tiguan",
        defaultTrimId: "se",
        trims: [
          { id: "se", name: "SE", engine: "2.0L Turbo I4", horsepower: 201, mpgCombined: 26, drivetrain: "FWD / AWD", seatingCapacity: 7 },
          { id: "sel-r-line", name: "SEL R-Line", engine: "2.0L Turbo I4", horsepower: 201, drivetrain: "AWD", seatingCapacity: 7 },
        ],
      },
      {
        slug: "atlas",
        defaultTrimId: "se",
        trims: [
          { id: "se", name: "SE", engine: "2.0L Turbo I4", horsepower: 269, mpgCombined: 22, drivetrain: "AWD", seatingCapacity: 7, towingLb: 5000 },
          { id: "cross-sport", name: "Cross Sport", engine: "2.0L Turbo I4", horsepower: 269, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "id-4",
        defaultTrimId: "pro",
        trims: [
          { id: "pro", name: "Pro", engine: "Electric", aspiration: "Electric", horsepower: 201, rangeMiles: 275, drivetrain: "RWD", seatingCapacity: 5 },
          { id: "pro-s-awd", name: "Pro S AWD", engine: "Dual-motor electric", aspiration: "Electric", horsepower: 295, rangeMiles: 255, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "passat",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Passat (ended U.S.)", notes: "U.S. Passat ended after 2022." }],
      },
      {
        slug: "touareg",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Touareg (ended U.S.)", notes: "Not sold in the U.S. currently." }],
      },
      {
        slug: "beetle",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Beetle (ended)", notes: "Ended after 2019." }],
      },
    ],
  },
  {
    slug: "mazda",
    models: [
      {
        slug: "mazda3",
        defaultTrimId: "preferred",
        trims: [
          { id: "preferred", name: "Preferred", engine: "2.5L I4", horsepower: 191, mpgCombined: 31, drivetrain: "FWD / AWD", seatingCapacity: 5 },
          { id: "turbo", name: "Turbo Premium Plus", engine: "2.5L Turbo I4", horsepower: 250, mpgCombined: 26, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "miata",
        defaultTrimId: "club",
        trims: [
          { id: "sport", name: "Sport", engine: "2.0L I4", horsepower: 181, drivetrain: "RWD", mpgCombined: 29, seatingCapacity: 2 },
          { id: "club", name: "Club", engine: "2.0L I4", horsepower: 181, zeroToSixtySec: 5.7, drivetrain: "RWD", seatingCapacity: 2 },
        ],
      },
      {
        slug: "cx-5",
        defaultTrimId: "preferred",
        trims: [
          { id: "preferred", name: "Preferred", engine: "2.5L I4", horsepower: 187, mpgCombined: 28, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "turbo", name: "Turbo", engine: "2.5L Turbo I4", horsepower: 256, mpgCombined: 25, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "cx-30",
        defaultTrimId: "preferred",
        trims: [
          { id: "preferred", name: "Preferred", engine: "2.5L I4", horsepower: 191, mpgCombined: 28, drivetrain: "AWD", seatingCapacity: 5 },
          { id: "turbo", name: "Turbo", engine: "2.5L Turbo I4", horsepower: 250, mpgCombined: 25, drivetrain: "AWD", seatingCapacity: 5 },
        ],
      },
      {
        slug: "cx-90",
        defaultTrimId: "preferred",
        trims: [
          { id: "preferred", name: "Preferred", engine: "3.3L Turbo I6", horsepower: 280, mpgCombined: 25, drivetrain: "AWD", seatingCapacity: 8 },
          { id: "phev", name: "PHEV", engine: "2.5L PHEV", aspiration: "Plug-in hybrid", horsepower: 323, rangeMiles: 26, drivetrain: "AWD", seatingCapacity: 7 },
        ],
      },
      {
        slug: "cx-9",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "CX-9 (succeeded by CX-90)", notes: "Replaced by CX-90." }],
      },
      {
        slug: "mazda6",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Mazda6 (ended)", notes: "U.S. Mazda6 ended after 2021." }],
      },
      {
        slug: "rx-8",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "RX-8 (ended)", notes: "Ended after 2012." }],
      },
      {
        slug: "mazdaspeed3",
        defaultTrimId: "legacy",
        legacy: true,
        trims: [{ id: "legacy", name: "Mazdaspeed3 (ended)", notes: "Ended after 2013." }],
      },
    ],
  },
];

for (const brand of brands) {
  writeBrand(brand);
}

console.log(`\nDone: ${brands.length} brands`);
