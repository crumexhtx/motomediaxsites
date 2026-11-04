/**
 * Pre-deploy SEO gate — crawl EVERY URL in /sitemap.xml on a running
 * production server (`pnpm start`) and fail on any regression.
 *
 * Per URL:
 *   - HTTP 200 (redirects are failures)
 *   - exactly one <h1>
 *   - canonical === https://www.motomediax.com + path
 *   - og:url === canonical
 *   - every JSON-LD block parses (and at least one is present)
 *   - meta description 110–160 chars
 *   - no TODO / TBD / [TODO / "Parking Spot" / "lockbox on the driver" /
 *     "lockbox on the driver" in visible text
 *   - no <img> with an empty/missing alt unless aria-hidden="true"
 *
 * Usage:
 *   node scripts/verify-sitemap-pages.mjs [baseUrl] [--concurrency=8]
 *        [--sample-years=N]   (keep every non-year URL; sample N year pages)
 *
 * Env: VERIFY_BASE_URL, VERIFY_CONCURRENCY, VERIFY_SAMPLE_YEARS.
 * Exit code is non-zero when any check fails.
 */

const SITE = "https://www.motomediax.com";
const DESC_MIN = 110;
const DESC_MAX = 160;

const args = process.argv.slice(2);
function flag(name, fallback) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const base = (
  args.find((a) => !a.startsWith("--")) ||
  process.env.VERIFY_BASE_URL ||
  "http://127.0.0.1:3000"
).replace(/\/$/, "");
const concurrency = Math.max(
  1,
  Number(flag("concurrency", process.env.VERIFY_CONCURRENCY || 8)) || 8,
);
const sampleYears = Number(
  flag("sample-years", process.env.VERIFY_SAMPLE_YEARS || 0),
);

/** Visible-text phrases that must never ship. */
const FORBIDDEN = [
  { label: "TODO", re: /\bTODO\b/ },
  { label: "TBD", re: /\bTBD\b/ },
  { label: "[TODO", re: /\[TODO/i },
  { label: "Parking Spot", re: /Parking Spot/ },
  { label: "lockbox on the driver", re: /lockbox on the driver/i },
  { label: "windshield tag", re: /windshield tag/i },
];

const CHECKS = [
  "status 200",
  "one h1",
  "canonical",
  "og:url",
  "json-ld",
  "meta description",
  "forbidden text",
  "img alt",
];

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Read an attribute value out of a single tag string. */
function attr(tag, name) {
  const m = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"),
  );
  return m ? decode(m[1] ?? m[2] ?? "") : null;
}

function hasAttr(tag, name) {
  return new RegExp(`\\s${name}(?=[\\s=/>])`, "i").test(tag);
}

function metaContent(html, key, value) {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    if ((attr(tag, key) || "").toLowerCase() === value) {
      return attr(tag, "content");
    }
  }
  return null;
}

function canonicalHref(html) {
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if ((attr(tag, "rel") || "").toLowerCase() === "canonical") {
      return attr(tag, "href");
    }
  }
  return null;
}

function visibleText(html) {
  return decode(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<head\b[\s\S]*?<\/head>/i, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");
}

function groupOf(path) {
  if (path === "/") return "home";
  const seg = path.split("/").filter(Boolean);
  if (seg[0] === "makes") {
    if (seg.length === 1) return "makes index";
    if (seg.length === 2) return "brand";
    if (seg.length === 3) return "model hub";
    if (seg.length === 4 && seg[3] === "reliability") return "reliability guide";
    return "year";
  }
  if (seg[0] === "compare") return seg.length > 1 ? "comparison" : "static";
  return "static";
}

async function checkUrl(path) {
  const failures = [];
  const fail = (check, detail) => failures.push({ check, detail });
  let res;
  let html = "";
  try {
    res = await fetch(`${base}${path}`, { redirect: "manual" });
    html = await res.text();
  } catch (err) {
    fail("status 200", `fetch failed: ${err.message}`);
    return failures;
  }

  if (res.status !== 200) {
    fail(
      "status 200",
      `HTTP ${res.status}${res.headers.get("location") ? ` → ${res.headers.get("location")}` : ""}`,
    );
    return failures;
  }

  const h1 = (html.match(/<h1\b/gi) || []).length;
  if (h1 !== 1) fail("one h1", `found ${h1}`);

  const expected = path === "/" ? SITE : `${SITE}${path}`;
  const canonical = canonicalHref(html);
  const canonOk =
    canonical === expected || (path === "/" && canonical === `${SITE}/`);
  if (!canonOk) fail("canonical", `${canonical ?? "(missing)"} ≠ ${expected}`);

  const ogUrl = metaContent(html, "property", "og:url");
  if (!ogUrl || ogUrl !== canonical) {
    fail("og:url", `${ogUrl ?? "(missing)"} ≠ canonical ${canonical ?? "(missing)"}`);
  }

  const blocks = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((m) => m[1]);
  if (blocks.length === 0) {
    fail("json-ld", "no JSON-LD block");
  }
  blocks.forEach((block, i) => {
    try {
      JSON.parse(block);
    } catch (err) {
      fail("json-ld", `block ${i + 1} does not parse: ${err.message}`);
    }
  });

  const desc = metaContent(html, "name", "description");
  if (desc == null) {
    fail("meta description", "missing");
  } else if (desc.length < DESC_MIN || desc.length > DESC_MAX) {
    fail("meta description", `${desc.length} chars (need ${DESC_MIN}–${DESC_MAX})`);
  }

  const text = visibleText(html);
  for (const { label, re } of FORBIDDEN) {
    const m = text.match(re);
    if (m) {
      const at = m.index ?? 0;
      const ctx = text.slice(Math.max(0, at - 30), at + 50);
      fail("forbidden text", `"${label}" near “…${ctx}…”`);
    }
  }

  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    if ((attr(tag, "aria-hidden") || "").toLowerCase() === "true") continue;
    const alt = attr(tag, "alt");
    if (alt == null || alt.trim() === "") {
      const src = attr(tag, "src") || attr(tag, "data-src") || "(no src)";
      fail("img alt", `${alt == null ? "missing" : "empty"} alt on ${src.slice(0, 80)}`);
    }
  }

  return failures;
}

async function loadSitemapPaths() {
  const res = await fetch(`${base}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml → HTTP ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1].trim()));
  const paths = [];
  const bad = [];
  for (const loc of locs) {
    const url = new URL(loc);
    if (url.origin !== SITE) {
      bad.push(loc);
      continue;
    }
    paths.push(url.pathname === "" ? "/" : url.pathname);
  }
  return { paths: [...new Set(paths)], bad };
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function table(headers, rows) {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i]).length)),
  );
  const line = (cells) =>
    "| " + cells.map((c, i) => pad(c, widths[i])).join(" | ") + " |";
  console.log(line(headers));
  console.log("|-" + widths.map((w) => "-".repeat(w)).join("-|-") + "-|");
  for (const r of rows) console.log(line(r));
}

async function main() {
  console.log(`Sitemap verification against ${base} (concurrency ${concurrency})`);
  let { paths, bad } = await loadSitemapPaths();
  if (paths.length === 0) throw new Error("sitemap.xml contained no URLs");

  const total = paths.length;
  if (sampleYears > 0) {
    const years = paths.filter((p) => groupOf(p) === "year");
    const keep = new Set(
      years.filter((_, i) => i % Math.max(1, Math.ceil(years.length / sampleYears)) === 0),
    );
    paths = paths.filter((p) => groupOf(p) !== "year" || keep.has(p));
    console.log(
      `Sampling year pages: ${keep.size}/${years.length} (all ${paths.length - keep.size} other URLs checked)`,
    );
  }
  console.log(`Checking ${paths.length} of ${total} sitemap URLs…\n`);

  const results = new Array(paths.length);
  let next = 0;
  let done = 0;
  const started = Date.now();
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= paths.length) return;
      results[i] = { path: paths[i], failures: await checkUrl(paths[i]) };
      done++;
      if (done % 100 === 0 || done === paths.length) {
        process.stderr.write(`  ${done}/${paths.length} checked\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  // Per-group summary
  const groups = new Map();
  for (const r of results) {
    const g = groupOf(r.path);
    const row = groups.get(g) || { urls: 0, failed: 0 };
    row.urls++;
    if (r.failures.length) row.failed++;
    groups.set(g, row);
  }
  console.log("\nBy route group");
  table(
    ["Group", "URLs", "Failing", "Status"],
    [...groups.entries()].map(([g, v]) => [g, v.urls, v.failed, v.failed ? "FAIL" : "ok"]),
  );

  // Per-check summary
  const byCheck = Object.fromEntries(CHECKS.map((c) => [c, 0]));
  for (const r of results) {
    for (const c of new Set(r.failures.map((f) => f.check))) byCheck[c]++;
  }
  console.log("\nBy check (URLs failing)");
  table(
    ["Check", "Failing URLs", "Status"],
    CHECKS.map((c) => [c, byCheck[c], byCheck[c] ? "FAIL" : "ok"]),
  );

  const failing = results.filter((r) => r.failures.length);
  if (bad.length) {
    console.log(`\nSitemap URLs not on ${SITE}: ${bad.length}`);
    bad.slice(0, 10).forEach((u) => console.log(`  ${u}`));
  }
  if (failing.length) {
    console.log(`\nFailures (${failing.length} URL${failing.length === 1 ? "" : "s"}):`);
    const MAX_DETAIL = Number(flag("max-detail", 60)) || 60;
    for (const r of failing.slice(0, MAX_DETAIL)) {
      console.log(`  ${r.path}`);
      for (const f of r.failures.slice(0, 6)) {
        console.log(`    - [${f.check}] ${f.detail}`);
      }
      if (r.failures.length > 6) {
        console.log(`    - …and ${r.failures.length - 6} more`);
      }
    }
    if (failing.length > MAX_DETAIL) {
      console.log(`  …and ${failing.length - MAX_DETAIL} more URLs`);
    }
  }

  const failCount = failing.length + bad.length;
  console.log(
    `\n${failCount ? "FAIL" : "PASS"}: ${paths.length - failing.length}/${paths.length} URLs clean in ${seconds}s`,
  );
  process.exit(failCount ? 1 : 0);
}

main().catch((err) => {
  console.error("verify-sitemap-pages crashed:", err);
  process.exit(2);
});
