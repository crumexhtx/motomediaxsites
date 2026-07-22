/**
 * When public/catalog/ files are missing, replace local /catalog/… srcs with
 * Wikipedia/Wikimedia summary images so fresh clones still render photos.
 *
 * Usage: pnpm tsx scripts/backfill-remote-images.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { GalleryImage, MakeEntry } from "../src/data/catalog";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(ROOT, "src/data/catalog.generated.json");
const USER_AGENT =
  "motomediax/0.1 (catalog builder; https://github.com/motomediax)";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function localExists(src: string): boolean {
  if (!src.startsWith("/catalog/")) return true;
  const abs = path.join(ROOT, "public", src.replace(/^\//, ""));
  return fs.existsSync(abs) && fs.statSync(abs).size > 500;
}

/** Wikipedia titles that differ from catalog make/model names. */
const TITLE_OVERRIDES: Record<string, string[]> = {
  "ford/fusion": ["Ford Fusion (Americas)", "Ford Fusion (2006)"],
  "hyundai/elantra-n": ["Hyundai Elantra", "Elantra N"],
  "mercedes-benz/slk-slc": ["Mercedes-Benz SLK-Class", "Mercedes-Benz SLC-Class"],
  "tesla/roadster": ["Tesla Roadster (2008)", "Tesla Roadster (2020)"],
  "volkswagen/gti": ["Volkswagen Golf GTI", "Volkswagen Golf"],
};

async function wikiImage(
  brand: string,
  model: string,
  makeSlug: string,
  modelSlug: string,
): Promise<GalleryImage | null> {
  const overrideKey = `${makeSlug}/${modelSlug}`;
  const titles = [
    ...(TITLE_OVERRIDES[overrideKey] ?? []),
    `${brand} ${model}`,
    `${model} (${brand})`,
    model,
  ].filter((t, i, arr) => t && arr.indexOf(t) === i);

  for (const title of titles) {
    await sleep(120);
    const encoded = encodeURIComponent(title.replace(/ /g, "_"));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) continue;
    const data = (await res.json()) as {
      type?: string;
      extract?: string;
      originalimage?: { source: string; width: number; height: number };
      thumbnail?: { source: string; width: number; height: number };
    };
    if (data.type === "disambiguation" || !data.extract) continue;
    const raw = data.originalimage ?? data.thumbnail;
    if (!raw?.source) continue;
    if (/svg|logo|badge|emblem/i.test(raw.source)) continue;
    return {
      src: raw.source,
      alt: `${brand} ${model}`,
      width: raw.width || 1280,
      height: raw.height || 853,
    };
  }
  return null;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as MakeEntry[];
  let replaced = 0;
  let kept = 0;
  let failed = 0;

  for (const make of catalog) {
    for (const model of make.models) {
      const first = model.years[0]?.images[0];
      if (!first) continue;

      const needsRemote = model.years.some((y) =>
        y.images.some((img) => !localExists(img.src) && img.src.startsWith("/catalog/")),
      );
      if (!needsRemote) {
        kept += 1;
        continue;
      }

      const remote = await wikiImage(
        make.name,
        model.name,
        make.slug,
        model.slug,
      );
      if (!remote) {
        failed += 1;
        console.warn(`  no wiki image for ${make.name} ${model.name}`);
        continue;
      }

      for (const year of model.years) {
        year.images = year.images.map((img) => {
          if (!img.src.startsWith("/catalog/") || localExists(img.src)) {
            return img;
          }
          replaced += 1;
          return {
            ...remote,
            alt: img.alt || `${year.year} ${make.name} ${model.name}`,
          };
        });
        if (!year.images.length) {
          year.images = [
            {
              ...remote,
              alt: `${year.year} ${make.name} ${model.name}`,
            },
          ];
          replaced += 1;
        }
      }
      console.log(`  ${make.slug}/${model.slug} → remote`);
    }
  }

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(
    `Backfill done: ${replaced} image slots → remote, ${kept} models ok local, ${failed} unresolved`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
