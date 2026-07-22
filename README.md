# motomediax

Car photo catalog inspired by NetCarShow’s make → model → year browse model, with a cleaner UI and SEO-friendly page structure.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Static generation for catalog routes
- Catalog built from Wikipedia/Wikimedia + NHTSA (top 15 U.S.-popular brands, years 2024–2026)
- Search via `/api/search` (catalog stays server-side)

## Develop

```bash
pnpm install
cp .env.example .env.local
pnpm build:catalog   # first time, or after changing brands.json — also fills public/catalog/
pnpm dev:clean       # clears .next then starts (use if routes 404 after catalog rebuild)
```

If model pages 404 after regenerating the catalog, stop the dev server and run `pnpm dev:clean` so Next/Turbopack picks up the new data.

Set `NEXT_PUBLIC_SITE_URL` to your local or preview origin so canonicals, sitemap, and JSON-LD stay correct.

## Catalog data

- Seed list: [`src/data/brands.json`](src/data/brands.json)
- Generated catalog: [`src/data/catalog.generated.json`](src/data/catalog.generated.json) (loaded by [`src/data/catalog.server.ts`](src/data/catalog.server.ts))
- Photos: `public/catalog/` (committed local JPEGs so Next can optimize them; regenerate with `pnpm localize:images`)
- Rebuild: `pnpm build:catalog` (caches API responses under `scripts/.cache/`)
- Refresh MPG only: `pnpm enrich:epa`
- Image pipeline if sources change: `pnpm backfill:images` (remote URLs) → `pnpm localize:images` (download into `public/catalog/`)

## Build

```bash
pnpm build:catalog
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

`pnpm validate:catalog` checks brand coverage, year range, image hosts, and whether local `/catalog/` files exist on disk (warns by default; set `REQUIRE_LOCAL_IMAGES=1` to fail). `pnpm audit:images` probes remote image URLs (may rate-limit against Wikimedia). CI runs Gitleaks, lint, unit tests, catalog validation, and a production build on push/PR.

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
- Set `NEXT_PUBLIC_SITE_URL` to the production domain (for example `https://motomediax.com`).
- Preview deployments should use the preview URL so metadata does not point at production.
- Commit `src/data/catalog.generated.json`, `src/data/videos/`, and `public/catalog/` so production has catalog data, year videos, and hero/trim photos (no live Wikimedia fetch). Auto.dev / YouTube keys are **not** required at runtime (offline enrichment only).
- If you regenerate the catalog without photos, run `pnpm localize:images` (or `pnpm fetch:trim-images`) before deploying.

## Security note

If this repository ever contained secrets in git history (for example old `readme.md` commits), revoke those credentials in GitHub immediately even if they no longer appear on `HEAD`. CI includes Gitleaks to catch future leaks.
