/**
 * Audit catalog image URLs and coverage. Writes catalog-image-audit.json.
 */
import fs from "node:fs";
import path from "node:path";
import {
  ROOT,
  catalogStats,
  loadBrands,
  loadCatalog,
  localPublicAssetIssue,
  normalizeModelKey,
} from "./lib/catalog-report";

const USER_AGENT = "motomediax/0.1 (image audit)";
const FETCH_TIMEOUT_MS = 15_000;
const failOnWeak = process.env.FAIL_ON_WEAK_IMAGES === "1";

const catalog = loadCatalog();
const brands = loadBrands();

async function checkUrl(
  url: string,
  attempt = 0,
): Promise<{
  ok: boolean;
  status: number | string;
  rateLimited?: boolean;
  contentType?: string;
}> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": USER_AGENT,
        Range: "bytes=0-1023",
      },
    });
    // Drain/cancel body so sockets are released promptly.
    try {
      await res.body?.cancel();
    } catch {
      /* ignore */
    }
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      return checkUrl(url, attempt + 1);
    }
    if (res.status === 429) {
      return { ok: false, status: 429, rateLimited: true };
    }
    const contentType = res.headers.get("content-type") ?? undefined;
    const statusOk = res.ok || res.status === 206;
    const typeOk =
      !contentType ||
      contentType.startsWith("image/") ||
      contentType.startsWith("application/octet-stream");
    return {
      ok: statusOk && typeOk,
      status: statusOk && !typeOk ? `non-image:${contentType}` : res.status,
      contentType,
    };
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
  const missingLocal: string[] = [];

  for (const seed of brands) {
    const make = catalog.find((m) => m.name === seed.brand);
    if (!make) {
      missingModels.push(`${seed.brand}: (entire make missing)`);
      continue;
    }
    const have = new Set(
      make.models.map((m) => normalizeModelKey(m.name)),
    );
    for (const model of seed.models) {
      const cleaned = normalizeModelKey(model);
      if (!have.has(cleaned)) {
        missingModels.push(`${seed.brand}: ${model}`);
      }
    }
  }

  for (const make of catalog) {
    const cover = make.coverImage?.src;
    if (cover) {
      const refs = uniqueUrls.get(cover) ?? [];
      refs.push(`${make.name} cover`);
      uniqueUrls.set(cover, refs);
      if (
        isWeakImage(cover, make.coverImage.alt) &&
        !cover.startsWith("/brands/")
      ) {
        weak.push(`${make.name} cover: ${cover.slice(0, 100)}`);
      }
      if (cover.startsWith("/") && localPublicAssetIssue(cover)) {
        missingLocal.push(cover);
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
          if (img.src.startsWith("/") && localPublicAssetIssue(img.src)) {
            missingLocal.push(img.src);
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

  const stats = catalogStats(catalog);
  const report = {
    ...stats,
    uniqueRemoteImages: urls.length,
    brokenCount: broken.length,
    rateLimitedCount: rateLimited.length,
    weakCount: weak.length,
    missingLocalCount: missingLocal.length,
    missingModels,
    broken: broken.slice(0, 100),
    rateLimited: rateLimited.slice(0, 100),
    weak: weak.slice(0, 100),
    missingLocal: [...new Set(missingLocal)].slice(0, 100),
  };

  const out = path.join(ROOT, "catalog-image-audit.json");
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Broken: ${broken.length}, rate-limited: ${rateLimited.length}, weak: ${weak.length}, missing models: ${missingModels.length}, missing local: ${missingLocal.length}`,
  );
  console.log(`Wrote ${out}`);

  const shouldFail =
    broken.length > 0 ||
    missingModels.length > 0 ||
    rateLimited.length > 0 ||
    missingLocal.length > 0 ||
    (failOnWeak && weak.length > 0);

  if (shouldFail) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
