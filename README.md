# motomediax

Car photo catalog inspired by NetCarShow’s make → model → year browse model, with a cleaner UI and SEO-friendly page structure.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Static generation for catalog routes (`generateStaticParams`)
- Catalog built from Wikipedia/Wikimedia + NHTSA (top 15 U.S.-popular brands, years 2024–2026, plus historical overrides in `model-years.json`)
- Search via `/api/search` (catalog stays server-side); shareable `/search?q=` is SSR-hydrated

## Develop

```bash
pnpm install
cp .env.example .env.local
pnpm build:catalog   # first time, or after changing brands.json — also fills public/catalog/
pnpm maintain:discontinued  # after model-years / catalog rebuilds
pnpm dev:clean       # clears .next then starts (use if routes 404 after catalog rebuild)
```

If model pages 404 after regenerating the catalog, stop the dev server and run `pnpm dev:clean` so Next/Turbopack picks up the new data.

Set `NEXT_PUBLIC_SITE_URL` to your local or preview origin so canonicals, sitemap, and JSON-LD stay correct.

## Catalog data

- Seed list: [`src/data/brands.json`](src/data/brands.json)
- Generated catalog: [`src/data/catalog.generated.json`](src/data/catalog.generated.json) (loaded by [`src/data/catalog.server.ts`](src/data/catalog.server.ts))
- Year pins: [`src/data/model-years.json`](src/data/model-years.json) (historical / discontinued last years)
- Discontinued banners: [`src/data/discontinued.json`](src/data/discontinued.json) (synced from year pins)
- Photos: `public/catalog/` (committed local JPEGs so Next can optimize them; regenerate with `pnpm localize:images`)
- Rebuild: `pnpm build:catalog` (caches API responses under `scripts/.cache/`)
- After changing `model-years.json` or rebuilding the catalog, run `pnpm maintain:discontinued` (sync → prune ghosts → refresh final-year copy → sanitize)
- Used-buyer safety data: `pnpm enrich:nhtsa-safety` (NHTSA recalls + complaint category counts; or run `enrich:nhtsa-recalls` / `enrich:nhtsa-complaints` separately)
- **Daily recalls:** GitHub Actions [`.github/workflows/daily-recalls.yml`](.github/workflows/daily-recalls.yml) force-refreshes NHTSA recalls into `catalog.generated.json`, seeds `motomediax-api/data/recalls-complaints.json` from that result, and commits to `main` only when campaign data actually changed (ignores `fetchedAt`-only churn). Runs on a daily cron (~08:30 CT) and via **Actions → Daily recalls → Run workflow**. Manual local equivalent: `pnpm enrich:nhtsa-recalls -- --force` then `node motomediax-api/scripts/seed-recalls-from-site.mjs`.
- Refresh MPG only: `pnpm enrich:epa`
- Image pipeline if sources change: `pnpm backfill:images` (remote URLs) → `pnpm localize:images` (download into `public/catalog/`)

## Build

```bash
pnpm build:catalog
pnpm maintain:discontinued   # keep discontinued years / copy consistent
pnpm build
pnpm start
```

## Test & lint

```bash
pnpm test
pnpm lint
pnpm validate:catalog
pnpm audit:images
```

`pnpm validate:catalog` checks brand coverage, allowed years (default 2024–2026 plus `model-years.json` overrides), discontinued last-year consistency, image hosts, cover/trim local files, and whether local `/catalog/` files exist on disk (warns by default; set `REQUIRE_LOCAL_IMAGES=1` to fail). `pnpm validate:videos` checks curated YouTube embeds for coverage, title relevance, and live oEmbed availability. `pnpm audit:images` probes remote image URLs (may rate-limit against Wikimedia; unresolved 429s fail the run) and uses exact model-name matching after normalizing seed names. Set `FAIL_ON_WEAK_IMAGES=1` to fail on empty/weak galleries. CI runs Gitleaks, lint, unit tests, script typecheck, catalog validation (including discontinued checks), and a production build on push/PR.

Year videos: `pnpm fetch:videos <brand>` (YouTube API if `YOUTUBE_API_KEY` is set, otherwise yt-dlp). Prefer filling gaps without `--overwrite`; run `pnpm validate:videos` afterward.

## Routes

- `/` — brand home
- `/makes` — A–Z makes
- `/makes/[make]` — models
- `/makes/[make]/[model]` — years
- `/makes/[make]/[model]/[year]` — gallery, overview, NHTSA specs
- `/search` — catalog search (`?q=` is shareable)
- `/about` — about

## Content & imagery

Overviews and photos are sourced from Wikipedia/Wikimedia Commons; vehicle specs and safety ratings come from NHTSA where available. Attribution appears on year pages and in the footer. Not affiliated with Wikipedia, NHTSA, NetCarShow, or vehicle manufacturers.

## Deploy

- Deploy on Vercel (or any Node host that supports Next.js).
- Set `NEXT_PUBLIC_SITE_URL` to the production domain (for example `https://www.motomediax.com`).
- Preview deployments should use the preview URL so metadata does not point at production.
- Commit `src/data/catalog.generated.json`, `src/data/videos/`, and `public/catalog/` so production has catalog data, year videos, and hero/trim photos (no live Wikimedia fetch). Auto.dev / YouTube keys are **not** required at runtime (offline enrichment only).
- If you regenerate the catalog without photos, run `pnpm localize:images` (or `pnpm fetch:trim-images`) before deploying.
