/**
 * Download remote catalog images into public/catalog/ and rewrite
 * catalog.generated.json to local /catalog/… paths so Next can optimize them.
 *
 * Usage: pnpm localize:images
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { GalleryImage, MakeEntry } from "../src/data/catalog";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(ROOT, "src/data/catalog.generated.json");
const MEDIA_DIR = path.join(ROOT, "public", "catalog");
const USER_AGENT =
  "motomediax/0.1 (catalog images; https://github.com/motomediax)";
/** Max edge for committed catalog photos (Next still serves responsive sizes). */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 78;

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, attempts = 5): Promise<Buffer> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (res.status === 429) {
        await sleep(2500 * (i + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
      await sleep(1000 * (i + 1));
    }
  }
  throw lastErr ?? new Error("download failed");
}

/** Resize/compress to a web-friendly JPEG (always `.jpg` on disk). */
async function writeOptimizedJpeg(abs: string, input: Buffer): Promise<void> {
  const buf = await sharp(input)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  fs.writeFileSync(abs, buf);
}

async function main() {
  ensureDir(MEDIA_DIR);
  const catalog = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as MakeEntry[];
  const downloaded = new Map<string, string>();
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  async function localizeOne(
    img: GalleryImage,
    key: string,
  ): Promise<GalleryImage> {
    if (!img.src.startsWith("http")) {
      skipped += 1;
      return img;
    }
    if (downloaded.has(img.src)) {
      return { ...img, src: downloaded.get(img.src)! };
    }

    const fileName = `${key}.jpg`;
    const abs = path.join(MEDIA_DIR, fileName);
    const pub = `/catalog/${fileName}`;

    if (!fs.existsSync(abs) || fs.statSync(abs).size < 1000) {
      try {
        const raw = await fetchWithRetry(img.src);
        await writeOptimizedJpeg(abs, raw);
        ok += 1;
        process.stdout.write(".");
      } catch (e) {
        failed += 1;
        console.warn(`\n  fail ${key}: ${e}`);
        downloaded.set(img.src, img.src);
        return img;
      }
    } else {
      ok += 1;
    }

    const meta = await sharp(abs).metadata();
    downloaded.set(img.src, pub);
    return {
      ...img,
      src: pub,
      width: meta.width ?? img.width,
      height: meta.height ?? img.height,
    };
  }

  for (const make of catalog) {
    for (const model of make.models) {
      const key = `${make.slug}--${model.slug}`;
      // Prefer the first year image as the canonical file for the model.
      const seed = model.years.find((y) => y.images?.[0]?.src)?.images[0];
      if (!seed) continue;

      const localized = await localizeOne(seed, key);
      for (const year of model.years) {
        year.images = (year.images ?? []).map((img) => {
          if (img.src === seed.src || img.src === localized.src) {
            return { ...localized, alt: img.alt };
          }
          // Same remote URL reused across years
          if (downloaded.has(img.src)) {
            return { ...img, src: downloaded.get(img.src)! };
          }
          return img;
        });
      }
      await sleep(80);
    }
  }

  // Second pass: any remaining unique remotes (e.g. differing per year)
  let extra = 0;
  for (const make of catalog) {
    for (const model of make.models) {
      for (const year of model.years) {
        for (let i = 0; i < year.images.length; i += 1) {
          const img = year.images[i];
          if (!img.src.startsWith("http")) continue;
          const key = `${make.slug}--${model.slug}${i > 0 ? `--${i}` : ""}`;
          year.images[i] = await localizeOne(img, key);
          extra += 1;
          await sleep(80);
        }
      }
    }
  }

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(
    `\nLocalized catalog images: ${ok} saved, ${skipped} already local, ${failed} failed, ${extra} extra remotes → ${MEDIA_DIR}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
