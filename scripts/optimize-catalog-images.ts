/**
 * Re-encode existing public/catalog/* into web-sized JPEGs and rewrite
 * catalog.generated.json paths that still point at .png/.webp variants.
 *
 * Usage: pnpm tsx scripts/optimize-catalog-images.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { MakeEntry } from "../src/data/catalog";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MEDIA_DIR = path.join(ROOT, "public", "catalog");
const OUT_PATH = path.join(ROOT, "src/data/catalog.generated.json");
const MAX_EDGE = 1600;
const JPEG_QUALITY = 78;

async function main() {
  const files = fs.readdirSync(MEDIA_DIR);
  let rewritten = 0;
  for (const file of files) {
    const abs = path.join(MEDIA_DIR, file);
    if (!fs.statSync(abs).isFile()) continue;
    const base = file.replace(/\.[^.]+$/, "");
    const outAbs = path.join(MEDIA_DIR, `${base}.jpg`);
    try {
      const input = fs.readFileSync(abs);
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
      fs.writeFileSync(outAbs, buf);
      if (outAbs !== abs) fs.unlinkSync(abs);
      rewritten += 1;
      process.stdout.write(".");
    } catch (e) {
      console.warn(`\n  skip ${file}: ${e}`);
    }
  }

  // Normalize JSON srcs to .jpg
  const catalog = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as MakeEntry[];
  for (const make of catalog) {
    for (const model of make.models) {
      for (const year of model.years) {
        year.images = year.images.map((img) => {
          if (!img.src.startsWith("/catalog/")) return img;
          const next = img.src.replace(/\.(png|webp|gif|jpeg)$/i, ".jpg");
          const abs = path.join(ROOT, "public", next.replace(/^\//, ""));
          if (!fs.existsSync(abs)) return { ...img, src: next };
          // refresh dimensions from file
          return { ...img, src: next };
        });
      }
    }
  }
  // Fill width/height from disk
  for (const make of catalog) {
    for (const model of make.models) {
      for (const year of model.years) {
        for (let i = 0; i < year.images.length; i += 1) {
          const img = year.images[i];
          if (!img.src.startsWith("/catalog/")) continue;
          const abs = path.join(ROOT, "public", img.src.replace(/^\//, ""));
          if (!fs.existsSync(abs)) continue;
          const meta = await sharp(abs).metadata();
          year.images[i] = {
            ...img,
            width: meta.width ?? img.width,
            height: meta.height ?? img.height,
          };
        }
      }
    }
  }

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`\nOptimized ${rewritten} files → ${MEDIA_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
