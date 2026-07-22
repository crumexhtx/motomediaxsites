/**
 * Force re-download model hero images into public/catalog/.
 * Use after a bad in-place crop. Does not rewrite catalog structure —
 * only overwrites image bytes and refreshes width/height.
 *
 * Usage: pnpm exec tsx scripts/restore-catalog-images.ts [brand]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/catalog");
const CATALOG_PATH = path.join(ROOT, "src/data/catalog.generated.json");
const CACHE_DIR = path.join(__dirname, ".cache");
const USER_AGENT =
  "motomediax/0.1 (restore catalog images; https://github.com/motomediax)";

const brandArg = process.argv[2]?.toLowerCase();

type GalleryImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

type YearEntry = { year: number; images: GalleryImage[] };
type ModelEntry = { name: string; slug: string; years: YearEntry[] };
type MakeEntry = { name: string; slug: string; models: ModelEntry[] };

/** Pinned heroes that must not go back to a random Commons hit. */
const PINNED: Record<string, string> = {
  "toyota--land-cruiser":
    "File:Toyota Land Cruiser (J250) Washington DC Metro Area, USA.jpg",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function fetchJson<T>(url: string): Promise<T | null> {
  await sleep(200);
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    console.warn(`  HTTP ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

function isWeak(title: string): boolean {
  const s = title.toLowerCase();
  return (
    s.includes("logo") ||
    s.includes("wordmark") ||
    s.includes("diagram") ||
    s.includes("map_of") ||
    s.endsWith(".svg")
  );
}

async function resolveByTitle(
  title: string,
): Promise<{ url: string; width: number; height: number; mime: string } | null> {
  const info = await fetchJson<{
    query?: {
      pages?: Record<
        string,
        {
          imageinfo?: Array<{
            url?: string;
            thumburl?: string;
            width?: number;
            height?: number;
            mime?: string;
          }>;
        }
      >;
    };
  }>(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      title,
    )}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1280&format=json&origin=*`,
  );
  const page = Object.values(info?.query?.pages ?? {})[0];
  const ii = page?.imageinfo?.[0];
  if (!ii?.url || !ii.mime?.startsWith("image/")) return null;
  return {
    url: ii.thumburl || ii.url,
    width: ii.width ?? 1280,
    height: ii.height ?? 853,
    mime: ii.mime,
  };
}

async function resolveBySearch(
  brand: string,
  model: string,
): Promise<{ url: string; width: number; height: number; mime: string } | null> {
  const query = `${brand} ${model}`;
  const search = await fetchJson<{
    query?: { search?: Array<{ title: string }> };
  }>(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      `${query} filetype:bitmap`,
    )}&srnamespace=6&srlimit=12&format=json&origin=*`,
  );

  for (const hit of search?.query?.search ?? []) {
    if (isWeak(hit.title)) continue;
    const lower = hit.title.toLowerCase();
    if (!lower.includes(brand.toLowerCase().split("-")[0]!)) continue;
    const resolved = await resolveByTitle(hit.title);
    if (resolved) return resolved;
  }
  return null;
}

async function download(url: string, dest: string): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await sleep(250 + attempt * 500);
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.status === 429) {
        console.warn(`  429 retry ${attempt + 1}`);
        continue;
      }
      if (!res.ok) {
        console.warn(`  download HTTP ${res.status}`);
        return false;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 2000) {
        console.warn(`  too small (${buf.length}), retry`);
        continue;
      }
      fs.writeFileSync(dest, buf);
      return true;
    } catch (e) {
      console.warn(`  download error`, e);
    }
  }
  return false;
}

async function main() {
  ensureDir(OUT_DIR);
  ensureDir(CACHE_DIR);
  const catalog = JSON.parse(
    fs.readFileSync(CATALOG_PATH, "utf8"),
  ) as MakeEntry[];

  type Job = {
    key: string;
    brandName: string;
    modelName: string;
    paths: Set<string>;
  };
  const jobs = new Map<string, Job>();

  for (const make of catalog) {
    if (brandArg && make.slug !== brandArg) continue;
    for (const model of make.models) {
      const key = `${make.slug}--${model.slug}`;
      for (const year of model.years) {
        for (const img of year.images) {
          if (!img.src.startsWith("/catalog/")) continue;
          const base = path.basename(img.src);
          // Model heroes only (one -- pair). Trim files: brand--model--trim
          const parts = base.replace(/\.[^.]+$/, "").split("--");
          if (parts.length !== 2) continue;
          let job = jobs.get(key);
          if (!job) {
            job = {
              key,
              brandName: make.name,
              modelName: model.name,
              paths: new Set(),
            };
            jobs.set(key, job);
          }
          job.paths.add(img.src);
        }
      }
    }
  }

  console.log(`Restoring ${jobs.size} model hero images…`);
  let ok = 0;
  let fail = 0;
  const sizeBySrc = new Map<string, { width: number; height: number }>();

  for (const job of jobs.values()) {
    const pinned = PINNED[job.key];
    process.stdout.write(`  ${job.key} `);
    const resolved = pinned
      ? await resolveByTitle(pinned)
      : await resolveBySearch(job.brandName, job.modelName);
    if (!resolved) {
      console.log("FAIL (no commons)");
      fail += 1;
      continue;
    }
    const ext = resolved.mime.includes("png")
      ? "png"
      : resolved.mime.includes("webp")
        ? "webp"
        : "jpg";
    const fileName = `${job.key}.${ext}`;
    const abs = path.join(OUT_DIR, fileName);
    const pub = `/catalog/${fileName}`;
    const downloaded = await download(resolved.url, abs);
    if (!downloaded) {
      console.log("FAIL (download)");
      fail += 1;
      continue;
    }
    // Drop stale alternate-extension heroes for the same key.
    for (const other of [".png", ".jpg", ".jpeg", ".webp"]) {
      const alt = path.join(OUT_DIR, `${job.key}${other}`);
      if (alt !== abs && fs.existsSync(alt)) fs.unlinkSync(alt);
    }
    for (const src of job.paths) {
      sizeBySrc.set(src, {
        width: Math.min(resolved.width, 1280),
        height: Math.round(
          (Math.min(resolved.width, 1280) / resolved.width) * resolved.height,
        ),
      });
      // Remap if extension changed
      if (src !== pub) sizeBySrc.set(pub, sizeBySrc.get(src)!);
    }
    console.log(`OK (${resolved.width}x${resolved.height})`);
    ok += 1;
  }

  // Patch catalog image src/dims for restored heroes.
  let patched = 0;
  for (const make of catalog) {
    if (brandArg && make.slug !== brandArg) continue;
    for (const model of make.models) {
      const key = `${make.slug}--${model.slug}`;
      if (!jobs.has(key)) continue;
      for (const year of model.years) {
        year.images = year.images.map((img) => {
          if (!img.src.startsWith("/catalog/")) return img;
          const parts = path
            .basename(img.src)
            .replace(/\.[^.]+$/, "")
            .split("--");
          if (parts.length !== 2) return img;
          // Prefer whatever file now exists for this key.
          for (const ext of ["jpg", "png", "webp"]) {
            const candidate = `/catalog/${key}.${ext}`;
            if (fs.existsSync(path.join(ROOT, "public", candidate.slice(1)))) {
              const dims = sizeBySrc.get(img.src) ?? sizeBySrc.get(candidate);
              patched += 1;
              return {
                ...img,
                src: candidate,
                width: dims?.width ?? img.width,
                height: dims?.height ?? img.height,
              };
            }
          }
          return img;
        });
      }
    }
  }
  fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Done: ${ok} restored, ${fail} failed, ${patched} catalog entries patched`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
