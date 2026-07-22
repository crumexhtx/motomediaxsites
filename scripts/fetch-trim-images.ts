/**
 * Download trim-specific Wikimedia images and write local
 * /catalog/{brand}--{model}--{trim}.ext paths into {brand}-images.json.
 *
 * Usage: pnpm fetch:trim-images [brand] [--force]
 * Example: pnpm fetch:trim-images ford
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/catalog");
const CACHE_DIR = path.join(__dirname, ".cache");
const USER_AGENT =
  "motomediax/0.1 (trim images; https://github.com/motomediax)";

const FORCE = process.argv.includes("--force");
const brandArg = process.argv
  .slice(2)
  .find((a) => a !== "--force" && !a.startsWith("-"));
const BRAND = (brandArg || "toyota").toLowerCase();
const MAP_PATH = path.join(ROOT, `src/data/trims/${BRAND}-images.json`);
const BRAND_LABEL = BRAND.charAt(0).toUpperCase() + BRAND.slice(1);

type TrimImageSpec = {
  query?: string;
  commonsTitle?: string;
  src?: string;
  alt?: string;
  /** Preserve human marks across re-fetches. Default new downloads to unverified. */
  confidence?: "verified" | "unverified" | "yearOnly";
};

type ImageMap = Record<string, Record<string, TrimImageSpec>>;

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  await sleep(150);
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    console.warn(`  HTTP ${res.status} ${url}`);
    return null;
  }
  return (await res.json()) as T;
}

function cachePath(key: string) {
  const safe = key.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
  return path.join(CACHE_DIR, `trimimg_${safe}.json`);
}

async function cachedJson<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  ensureDir(CACHE_DIR);
  const file = cachePath(key);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  }
  const data = await fetcher();
  fs.writeFileSync(file, JSON.stringify(data));
  return data;
}

type CommonsInfo = {
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
};

type CommonsSearch = {
  query?: { search?: Array<{ title: string }> };
};

async function resolveCommonsUrl(titleOrQuery: {
  commonsTitle?: string;
  query?: string;
}): Promise<{ url: string; mime: string; width: number; height: number } | null> {
  let title = titleOrQuery.commonsTitle;
  if (title && !title.startsWith("File:")) title = `File:${title}`;

  if (!title && titleOrQuery.query) {
    const search = await cachedJson(
      `search:${titleOrQuery.query}`,
      async () =>
        fetchJson<CommonsSearch>(
          `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
            `${titleOrQuery.query} filetype:bitmap`,
          )}&srnamespace=6&srlimit=8&format=json&origin=*`,
        ),
    );
    title = search?.query?.search?.[0]?.title;
    // Don't keep empty search caches forever — delete so a later fallback can retry.
    if (!title) {
      const file = cachePath(`search:${titleOrQuery.query}`);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }

  if (!title) return null;

  const info = await cachedJson(`info:${title}`, async () =>
    fetchJson<CommonsInfo>(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        title!,
      )}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1280&format=json&origin=*`,
    ),
  );
  const page = Object.values(info?.query?.pages ?? {})[0];
  const ii = page?.imageinfo?.[0];
  if (!ii?.url || !ii.mime?.startsWith("image/")) return null;
  if (ii.mime.includes("svg")) return null;
  return {
    url: ii.thumburl || ii.url,
    mime: ii.mime,
    width: ii.width ?? 1280,
    height: ii.height ?? 853,
  };
}

async function download(url: string, dest: string): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await sleep(200 + attempt * 400);
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (res.status === 429) {
        console.warn(`  429, retry ${attempt + 1}`);
        continue;
      }
      if (!res.ok) {
        console.warn(`  download HTTP ${res.status}`);
        return false;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      return true;
    } catch (err) {
      console.warn(`  download error`, err);
    }
  }
  return false;
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

async function main() {
  if (!fs.existsSync(MAP_PATH)) {
    throw new Error(`Missing image map: ${MAP_PATH}`);
  }

  ensureDir(OUT_DIR);
  console.log(`== ${BRAND_LABEL} trim images ==`);
  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8")) as ImageMap;
  let ok = 0;
  let fail = 0;
  let skipped = 0;

  for (const [model, trims] of Object.entries(map)) {
    for (const [trimId, spec] of Object.entries(trims)) {
      const localRel = spec.src?.replace(/^\//, "");
      const existingLocal =
        !FORCE &&
        localRel &&
        fs.existsSync(path.join(ROOT, "public", localRel));
      if (existingLocal) {
        skipped += 1;
        console.log(`  skip (exists): ${model}/${trimId}`);
        continue;
      }

      if (FORCE && localRel) {
        const stale = path.join(ROOT, "public", localRel);
        if (fs.existsSync(stale)) fs.unlinkSync(stale);
        delete spec.src;
        delete spec.alt;
      }

      console.log(`  resolve ${model}/${trimId} …`);
      let resolved = await resolveCommonsUrl(spec);
      if (!resolved) {
        const fallbacks = [
          spec.query,
          `${BRAND_LABEL} ${model.replace(/-/g, " ")} ${trimId.replace(/-/g, " ")}`,
          `${BRAND_LABEL} ${model.replace(/-/g, " ")}`,
          BRAND_LABEL === "Mercedes-benz" ? `Mercedes-Benz ${model.replace(/-/g, " ")}` : "",
          BRAND_LABEL === "Bmw" ? `BMW ${model.replace(/-/g, " ")}` : "",
        ].filter(Boolean) as string[];

        for (const q of fallbacks) {
          resolved = await resolveCommonsUrl({ query: q });
          if (resolved) break;
        }
      }
      if (!resolved) {
        console.warn(`  ✗ no commons hit for ${model}/${trimId}`);
        fail += 1;
        continue;
      }

      const ext = extFromMime(resolved.mime);
      const fileName = `${BRAND}--${model}--${trimId}.${ext}`;
      const dest = path.join(OUT_DIR, fileName);
      const publicSrc = `/catalog/${fileName}`;

      const downloaded = await download(resolved.url, dest);
      if (!downloaded) {
        fail += 1;
        continue;
      }

      spec.src = publicSrc;
      spec.alt = `${BRAND_LABEL} ${model} ${trimId}`.replace(/-/g, " ");
      if (!spec.confidence) spec.confidence = "unverified";
      ok += 1;
      console.log(`  ✓ ${publicSrc}`);
    }
  }

  fs.writeFileSync(MAP_PATH, `${JSON.stringify(map, null, 2)}\n`);
  console.log(
    `\nTrim images: ${ok} downloaded, ${skipped} cached, ${fail} failed`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
