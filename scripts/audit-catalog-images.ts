/**
 * Audit catalog image URLs and coverage. Writes catalog-image-audit.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MakeEntry } from "../src/data/catalog";
import brands from "../src/data/brands.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_AGENT = "motomediax/0.1 (image audit)";
const catalog = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../src/data/catalog.generated.json"),
    "utf8",
  ),
) as MakeEntry[];

function cleanModelName(model: string): string {
  return model
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*\/\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function checkUrl(
  url: string,
  attempt = 0,
): Promise<{ ok: boolean; status: number | string; rateLimited?: boolean }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Range: "bytes=0-1023",
      },
    });
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      return checkUrl(url, attempt + 1);
    }
    if (res.status === 429) {
      return { ok: false, status: 429, rateLimited: true };
    }
    // 206 Partial Content is success for Range requests
    return { ok: res.ok || res.status === 206, status: res.status };
  } catch (e) {
    return { ok: false, status: String(e) };
  }
}

function isWeakImage(src: string, alt: string): boolean {
  const s = `${src} ${alt}`.toLowerCase();
  return (
    s.includes("wikipedia-logo") ||
    s.includes("headquarter") ||
    s.includes("headquarters") ||
    s.includes("logo.svg") ||
    s.includes("wordmark") ||
    /\/commons\/[a-f0-9]\/[a-f0-9]{2}\/.*logo/i.test(src)
  );
}

async function main() {
  const uniqueUrls = new Map<string, string[]>();
  const weak: string[] = [];
  const missingModels: string[] = [];

  for (const seed of brands) {
    const make = catalog.find((m) => m.name === seed.brand);
    if (!make) {
      missingModels.push(`${seed.brand}: (entire make missing)`);
      continue;
    }
    const have = new Set(make.models.map((m) => m.name.toLowerCase()));
    for (const model of seed.models) {
      const cleaned = cleanModelName(model).toLowerCase();
      const hit = [...have].some(
        (h) =>
          h === cleaned ||
          cleaned.includes(h) ||
          h.includes(cleaned.replace(/\s+/g, " ")),
      );
      if (!hit) missingModels.push(`${seed.brand}: ${model}`);
    }
  }

  for (const make of catalog) {
    const cover = make.coverImage?.src;
    if (cover) {
      const refs = uniqueUrls.get(cover) ?? [];
      refs.push(`${make.name} cover`);
      uniqueUrls.set(cover, refs);
      if (isWeakImage(cover, make.coverImage.alt) && !cover.startsWith("/brands/")) {
        weak.push(`${make.name} cover: ${cover.slice(0, 100)}`);
      }
    }
    for (const model of make.models) {
      for (const year of model.years) {
        if (!year.images?.length) {
          weak.push(`${make.name} ${model.name} ${year.year}: no images`);
        }
        for (const img of year.images ?? []) {
          const refs = uniqueUrls.get(img.src) ?? [];
          refs.push(`${make.name}/${model.slug}/${year.slug}`);
          uniqueUrls.set(img.src, refs);
          if (isWeakImage(img.src, img.alt)) {
            weak.push(
              `${make.name} ${model.name} ${year.year}: weak image ${img.src.slice(0, 90)}`,
            );
          }
        }
      }
    }
  }

  const urls = [...uniqueUrls.keys()].filter((u) => u.startsWith("http"));
  console.log(`Checking ${urls.length} unique remote URLs…`);

  const broken: { url: string; status: number | string; usedBy: string[] }[] =
    [];
  const rateLimited: string[] = [];
  const concurrency = 3;
  let i = 0;
  async function worker() {
    while (i < urls.length) {
      const idx = i++;
      const url = urls[idx];
      const result = await checkUrl(url);
      await new Promise((r) => setTimeout(r, 200));
      if (result.rateLimited) {
        rateLimited.push(url);
        process.stdout.write("r");
      } else if (!result.ok) {
        broken.push({
          url,
          status: result.status,
          usedBy: uniqueUrls.get(url) ?? [],
        });
        process.stdout.write("x");
      } else {
        process.stdout.write(".");
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log("");

  const report = {
    makes: catalog.length,
    models: catalog.reduce((n, m) => n + m.models.length, 0),
    uniqueRemoteImages: urls.length,
    brokenCount: broken.length,
    rateLimitedCount: rateLimited.length,
    weakCount: weak.length,
    missingModels,
    broken: broken.slice(0, 100),
    weak: weak.slice(0, 100),
  };

  const out = path.join(__dirname, "..", "catalog-image-audit.json");
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Broken: ${broken.length}, rate-limited: ${rateLimited.length}, weak: ${weak.length}, missing models: ${missingModels.length}`,
  );
  console.log(`Wrote ${out}`);
  if (broken.length > 0 || missingModels.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
