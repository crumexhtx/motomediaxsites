import fs from "node:fs";
import path from "node:path";
import type {
  ImageConfidence,
  TrimSpec,
  VehicleSpecs,
  YearEntry,
  YearPerformance,
} from "@/data/catalog";
import { suggestTrimImageConfidence } from "@/lib/imageConfidence";
import { getCuratedYearVideo } from "@/lib/videos";
import toyotaTrims from "@/data/trims/toyota.json";
import toyotaImages from "@/data/trims/toyota-images.json";
import fordTrims from "@/data/trims/ford.json";
import fordImages from "@/data/trims/ford-images.json";
import chevroletTrims from "@/data/trims/chevrolet.json";
import chevroletImages from "@/data/trims/chevrolet-images.json";
import hondaTrims from "@/data/trims/honda.json";
import hondaImages from "@/data/trims/honda-images.json";
import nissanTrims from "@/data/trims/nissan.json";
import nissanImages from "@/data/trims/nissan-images.json";
import hyundaiTrims from "@/data/trims/hyundai.json";
import hyundaiImages from "@/data/trims/hyundai-images.json";
import kiaTrims from "@/data/trims/kia.json";
import kiaImages from "@/data/trims/kia-images.json";
import subaruTrims from "@/data/trims/subaru.json";
import subaruImages from "@/data/trims/subaru-images.json";
import jeepTrims from "@/data/trims/jeep.json";
import jeepImages from "@/data/trims/jeep-images.json";
import gmcTrims from "@/data/trims/gmc.json";
import gmcImages from "@/data/trims/gmc-images.json";
import bmwTrims from "@/data/trims/bmw.json";
import bmwImages from "@/data/trims/bmw-images.json";
import mercedesTrims from "@/data/trims/mercedes-benz.json";
import mercedesImages from "@/data/trims/mercedes-benz-images.json";
import teslaTrims from "@/data/trims/tesla.json";
import teslaImages from "@/data/trims/tesla-images.json";
import volkswagenTrims from "@/data/trims/volkswagen.json";
import volkswagenImages from "@/data/trims/volkswagen-images.json";
import mazdaTrims from "@/data/trims/mazda.json";
import mazdaImages from "@/data/trims/mazda-images.json";

function localCatalogImageExists(src: string): boolean {
  if (!src.startsWith("/catalog/")) return /^https?:\/\//i.test(src);
  try {
    const abs = path.join(process.cwd(), "public", src.replace(/^\//, ""));
    return fs.existsSync(abs) && fs.statSync(abs).size > 500;
  } catch {
    return false;
  }
}

type CuratedByYear = Record<string, YearPerformance>;
type CuratedByModel = Record<string, CuratedByYear>;
type TrimImageEntry = {
  src?: string;
  alt?: string;
  query?: string;
  commonsTitle?: string;
  /** Human trust mark — only `verified` promotes into the year hero. */
  confidence?: ImageConfidence;
};
type TrimImageMap = Record<string, Record<string, TrimImageEntry>>;
const CURATED_BY_MAKE: Record<string, CuratedByModel> = {
  toyota: toyotaTrims as CuratedByModel,
  ford: fordTrims as CuratedByModel,
  chevrolet: chevroletTrims as CuratedByModel,
  honda: hondaTrims as CuratedByModel,
  nissan: nissanTrims as CuratedByModel,
  hyundai: hyundaiTrims as CuratedByModel,
  kia: kiaTrims as CuratedByModel,
  subaru: subaruTrims as CuratedByModel,
  jeep: jeepTrims as CuratedByModel,
  gmc: gmcTrims as CuratedByModel,
  bmw: bmwTrims as CuratedByModel,
  "mercedes-benz": mercedesTrims as CuratedByModel,
  tesla: teslaTrims as CuratedByModel,
  volkswagen: volkswagenTrims as CuratedByModel,
  mazda: mazdaTrims as CuratedByModel,
};

const IMAGE_BY_MAKE: Record<string, TrimImageMap> = {
  toyota: toyotaImages as TrimImageMap,
  ford: fordImages as TrimImageMap,
  chevrolet: chevroletImages as TrimImageMap,
  honda: hondaImages as TrimImageMap,
  nissan: nissanImages as TrimImageMap,
  hyundai: hyundaiImages as TrimImageMap,
  kia: kiaImages as TrimImageMap,
  subaru: subaruImages as TrimImageMap,
  jeep: jeepImages as TrimImageMap,
  gmc: gmcImages as TrimImageMap,
  bmw: bmwImages as TrimImageMap,
  "mercedes-benz": mercedesImages as TrimImageMap,
  tesla: teslaImages as TrimImageMap,
  volkswagen: volkswagenImages as TrimImageMap,
  mazda: mazdaImages as TrimImageMap,
};

export function getCuratedPerformance(
  makeSlug: string,
  modelSlug: string,
  year: number,
): YearPerformance | undefined {
  const byModel = CURATED_BY_MAKE[makeSlug.toLowerCase()];
  if (!byModel) return undefined;
  const byYear = byModel[modelSlug.toLowerCase()];
  if (!byYear) return undefined;
  const raw = byYear[String(year)];
  if (!raw) return undefined;
  return attachTrimImages(makeSlug, modelSlug, raw, year);
}

function modelCatalogPath(makeSlug: string, modelSlug: string): string {
  return `/catalog/${makeSlug.toLowerCase()}--${modelSlug.toLowerCase()}.jpg`;
}

function resolveTrimImageSrc(
  makeSlug: string,
  modelSlug: string,
  declared?: string,
): string | undefined {
  if (declared && localCatalogImageExists(declared)) return declared;
  const fallback = modelCatalogPath(makeSlug, modelSlug);
  if (localCatalogImageExists(fallback)) return fallback;
  return undefined;
}

function attachTrimImages(
  makeSlug: string,
  modelSlug: string,
  performance: YearPerformance,
  pageYear: number,
): YearPerformance {
  const byModel = IMAGE_BY_MAKE[makeSlug.toLowerCase()];
  const byTrim = byModel?.[modelSlug.toLowerCase()];
  return {
    ...performance,
    trims: performance.trims.map((trim) => {
      const img = byTrim?.[trim.id];
      const src = resolveTrimImageSrc(makeSlug, modelSlug, img?.src);
      if (!src) return trim;
      const imageConfidence = suggestTrimImageConfidence({
        trimId: trim.id,
        trimName: trim.name,
        pageYear,
        commonsTitle: img?.commonsTitle,
        explicit: img?.confidence,
      });
      return {
        ...trim,
        image: src,
        imageConfidence,
      };
    }),
  };
}

function pickDefaultTrim(performance: YearPerformance): TrimSpec | undefined {
  if (!performance.trims.length) return undefined;
  if (performance.defaultTrimId) {
    const match = performance.trims.find(
      (t) => t.id === performance.defaultTrimId,
    );
    if (match) return match;
  }
  return performance.trims[0];
}

/** Merge trim efficiency into NHTSA specs (trim MPG wins when present). */
function mergeTrimIntoSpecs(
  specs: VehicleSpecs | undefined,
  trim: TrimSpec | undefined,
): VehicleSpecs | undefined {
  if (!trim) return specs;
  const next: VehicleSpecs = { ...(specs ?? {}) };
  // Curated trim MPG is authoritative for the default trim (fixes EPA parent bleed).
  if (trim.mpgCity != null) next.mpgCity = trim.mpgCity;
  if (trim.mpgHighway != null) next.mpgHighway = trim.mpgHighway;
  if (trim.mpgCombined != null) next.mpgCombined = trim.mpgCombined;
  if (next.batteryKwh == null && trim.batteryKwh != null)
    next.batteryKwh = trim.batteryKwh;
  if (next.rangeMiles == null && trim.rangeMiles != null)
    next.rangeMiles = trim.rangeMiles;
  if (next.cargoCuFt == null && trim.cargoCuFt != null)
    next.cargoCuFt = trim.cargoCuFt;
  if (next.cargoSeatsFoldedCuFt == null && trim.cargoSeatsFoldedCuFt != null)
    next.cargoSeatsFoldedCuFt = trim.cargoSeatsFoldedCuFt;
  if (next.towingLb == null && trim.towingLb != null)
    next.towingLb = trim.towingLb;
  if (next.groundClearanceIn == null && trim.groundClearanceIn != null)
    next.groundClearanceIn = trim.groundClearanceIn;
  if (next.seatingCapacity == null && trim.seatingCapacity != null)
    next.seatingCapacity = trim.seatingCapacity;
  if (next.fuelTankGal == null && trim.fuelTankGal != null)
    next.fuelTankGal = trim.fuelTankGal;
  if (!next.driveType && trim.drivetrain) next.driveType = trim.drivetrain;
  if (!next.curbWeightLb && trim.curbWeightLb != null)
    next.curbWeightLb = String(trim.curbWeightLb);
  return next;
}

/** Attach curated trim/performance data onto a year entry. */
export function enrichYearEntry(
  makeSlug: string,
  modelSlug: string,
  year: YearEntry,
): YearEntry {
  const curated =
    year.performance ??
    getCuratedPerformance(makeSlug, modelSlug, year.year);
  if (!curated?.trims?.length) {
    return {
      ...year,
      video: year.video ?? getCuratedYearVideo(makeSlug, modelSlug, year.year),
      images: year.images.map((img) => ({
        ...img,
        confidence: img.confidence ?? "yearOnly",
      })),
    };
  }

  const defaultTrim = pickDefaultTrim(curated);
  const specs = mergeTrimIntoSpecs(year.specs, defaultTrim);
  const yearImages = year.images.map((img) => ({
    ...img,
    confidence: img.confidence ?? ("yearOnly" as const),
  }));

  // Only human-verified trim photos may replace the year hero.
  let images = yearImages;
  if (defaultTrim?.image && defaultTrim.imageConfidence === "verified") {
    const trimImg = {
      src: defaultTrim.image,
      alt: `${year.year} ${makeSlug} ${modelSlug} — ${defaultTrim.name}`,
      width: 1280,
      height: 853,
      confidence: "verified" as const,
    };
    images = [
      trimImg,
      ...yearImages.filter((img) => img.src !== trimImg.src),
    ];
  }

  return {
    ...year,
    performance: curated,
    specs,
    images,
    video: year.video ?? getCuratedYearVideo(makeSlug, modelSlug, year.year),
    sources: {
      ...year.sources,
      ...(year.sources?.epa
        ? {}
        : specs?.mpgCombined != null || specs?.rangeMiles != null
          ? { epa: "https://www.fueleconomy.gov/feg/download.shtml" }
          : {}),
    },
  };
}

/** Brands with curated trim overlays (for smoke tests). */
export function curatedMakeSlugs(): string[] {
  return Object.keys(CURATED_BY_MAKE).sort();
}
