/**
 * Phase 4 SEO verification — hit key routes on a running server and print a table.
 * Usage: node scripts/verify-seo-pages.mjs [baseUrl]
 */
const base = (process.argv[2] || "http://127.0.0.1:3000").replace(/\/$/, "");
const SITE = "https://www.motomediax.com";

const paths = [
  "/",
  "/makes",
  "/makes/bmw",
  "/recalls",
  "/about",
  "/rentals",
  "/rentals/houston",
  "/rentals/houston/hobby-airport",
  "/makes/toyota/tacoma/2024",
];

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

function all(html, re) {
  return [...html.matchAll(re)].map((m) => m[1]);
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

async function check(path) {
  const res = await fetch(`${base}${path}`);
  const html = await res.text();
  const title = decode(pick(html, /<title>([^<]*)<\/title>/i));
  const description = decode(
    pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
      pick(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i),
  );
  const canonical = decode(
    pick(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) ||
      pick(html, /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i),
  );
  const ogUrl = decode(
    pick(html, /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']*)["']/i) ||
      pick(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:url["']/i),
  );
  const ogTitle = decode(
    pick(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) ||
      pick(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i),
  );
  const ogImage = decode(
    pick(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i) ||
      pick(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i),
  );
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const jsonLdBlocks = all(
    html,
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  const types = [];
  let jsonLdOk = true;
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block);
      const t = data["@type"];
      if (Array.isArray(t)) types.push(...t);
      else if (t) types.push(t);
      if (Array.isArray(data["@graph"])) {
        for (const node of data["@graph"]) {
          if (node["@type"]) types.push(node["@type"]);
        }
      }
    } catch {
      jsonLdOk = false;
    }
  }

  const expectedCanon = path === "/" ? SITE : `${SITE}${path}`;
  const hostOk =
    canonical.startsWith(SITE) &&
    ogUrl.startsWith(SITE) &&
    (canonical === expectedCanon || canonical === `${expectedCanon}/`) &&
    (ogUrl === expectedCanon || ogUrl === `${expectedCanon}/`);

  return {
    path,
    status: res.status,
    title,
    descLen: description.length,
    canonical,
    ogUrl,
    ogTitle,
    ogImage,
    h1Count,
    jsonLdTypes: [...new Set(types)].join(", "),
    jsonLdOk,
    hostOk,
  };
}

const rows = [];
for (const p of paths) {
  rows.push(await check(p));
}

console.log("\nPhase 4 SEO check against", base);
console.log("=".repeat(100));
for (const r of rows) {
  console.log(`\n${r.path}  [HTTP ${r.status}]`);
  console.log(`  title:       ${r.title}`);
  console.log(`  desc len:    ${r.descLen}`);
  console.log(`  canonical:   ${r.canonical}`);
  console.log(`  og:url:      ${r.ogUrl}`);
  console.log(`  og:title:    ${r.ogTitle}`);
  console.log(`  og:image:    ${r.ogImage}`);
  console.log(`  H1 count:    ${r.h1Count}`);
  console.log(`  JSON-LD:     ${r.jsonLdTypes || "(none)"} parseOk=${r.jsonLdOk}`);
  console.log(`  host/path:   ${r.hostOk ? "OK" : "MISMATCH"}`);
}

const sitemap = await fetch(`${base}/sitemap.xml`).then((r) => r.text());
const hasHobby = sitemap.includes(`${SITE}/rentals/houston/hobby-airport`);
const sitemapHostOk = !sitemap.includes("https://motomediax.com/") || sitemap.includes("https://www.motomediax.com/");
console.log("\nSitemap hobby-airport:", hasHobby ? "present" : "MISSING");
console.log("Sitemap preferred host:", sitemap.includes("https://www.motomediax.com/") ? "www OK" : "check");

const bad = rows.filter(
  (r) => r.status !== 200 || r.h1Count !== 1 || !r.hostOk || !r.jsonLdOk,
);
if (bad.length || !hasHobby) {
  console.error("\nFAIL:", bad.map((r) => r.path).join(", ") || "sitemap");
  process.exit(1);
}
console.log("\nAll checked pages OK.");
