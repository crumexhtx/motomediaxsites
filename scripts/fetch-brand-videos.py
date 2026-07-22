"""
Fetch year-page YouTube review candidates via YouTube Data API v3.

Writes/merges into: src/data/videos/{brand}.json
Caches raw search responses under: scripts/.cache/youtube/

Usage:
  # YOUTUBE_API_KEY or YOUTUBEKEY in .env.local
  python scripts/fetch-brand-videos.py ford
  python scripts/fetch-brand-videos.py toyota --force
  python scripts/fetch-brand-videos.py ford --overwrite
  python scripts/fetch-brand-videos.py ford --limit 3

Requires: pip install requests
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import ssl
import sys
import time
import unicodedata
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError:
    print("Missing dependency. Run: pip install requests", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
BRANDS_PATH = ROOT / "src" / "data" / "brands.json"
CATALOG_PATH = ROOT / "src" / "data" / "catalog.generated.json"
VIDEOS_DIR = ROOT / "src" / "data" / "videos"
CACHE_DIR = Path(__file__).resolve().parent / ".cache" / "youtube"
SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

YEARS = (2024, 2025, 2026)
OVERRIDES_PATH = ROOT / "src" / "data" / "model-years.json"

PREFERRED_CHANNELS = [
    "toyota usa",
    "ford",
    "ford performance",
    "throttle house",
    "redline reviews",
    "savagegeese",
    "thetopher",
    "auto buyers guide",
    "alex on autos",
    "car confections",
    "raiti's rides",
    "raitis rides",
    "kelley blue book",
    "edmunds",
]

MIN_DELAY_S = 0.25


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFKD", value.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.replace("'", "").replace("'", "")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def clean_model_name(model: str) -> str:
    return re.sub(
        r"\s+",
        " ",
        re.sub(r"\s*/\s*", " ", re.sub(r"\s*\([^)]*\)\s*", " ", model)),
    ).strip()


def load_env_local() -> None:
    env_path = ROOT / ".env.local"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("#") or "=" not in trimmed:
            continue
        key, _, value = trimmed.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def require_api_key() -> str:
    load_env_local()
    key = (
        os.environ.get("YOUTUBE_API_KEY")
        or os.environ.get("YOUTUBEKEY")
        or ""
    ).strip()
    if not key:
        raise SystemExit(
            "Missing YOUTUBE_API_KEY (or YOUTUBEKEY). Add it to .env.local (see .env.example)."
        )
    return key


def resolve_brand(brand_arg: str) -> tuple[str, str, list[tuple[str, str, list[int]]]]:
    """Return (brand_label, brand_slug, [(display_name, model_slug, years), ...])."""
    brand_slug = slugify(brand_arg)
    overrides: dict[str, list[int]] = {}
    if OVERRIDES_PATH.exists():
        overrides = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    for make in catalog:
        if make.get("slug") == brand_slug:
            models: list[tuple[str, str, list[int]]] = []
            for m in make.get("models", []):
                name = m.get("name")
                slug = m.get("slug")
                if not name or not slug:
                    continue
                key = f"{brand_slug}/{slug}"
                if key in overrides:
                    years = list(overrides[key])
                else:
                    years = [
                        int(y["year"])
                        for y in m.get("years", [])
                        if isinstance(y, dict) and y.get("year") is not None
                    ] or list(YEARS)
                models.append((name, slug, years))
            if not models:
                raise SystemExit(f"No models found for brand slug '{brand_slug}' in catalog.")
            return make["name"], brand_slug, models

    # Fallback: brands.json + local slugify
    brands = json.loads(BRANDS_PATH.read_text(encoding="utf-8"))
    for entry in brands:
        label = entry.get("brand") or ""
        if slugify(label) == brand_slug:
            models = [
                (
                    clean_model_name(m),
                    slugify(clean_model_name(m)),
                    list(overrides.get(f"{brand_slug}/{slugify(clean_model_name(m))}", YEARS)),
                )
                for m in entry.get("models", [])
            ]
            return label, brand_slug, models

    raise SystemExit(
        f"Unknown brand '{brand_arg}'. Use a catalog make slug (e.g. ford, toyota)."
    )


def slugify_channel(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()


def channel_rank(channel_title: str) -> int:
    norm = slugify_channel(channel_title)
    for i, pref in enumerate(PREFERRED_CHANNELS):
        if pref in norm or norm in pref:
            return i
    return 99


def title_looks_relevant(title: str, brand: str, model: str) -> bool:
    t = title.lower()
    brand_l = brand.lower()
    model_l = model.lower()
    if brand_l not in t and model_l not in t:
        return False
    # Drop parenthetical noise / punctuation for token match
    model_tokens = [
        tok
        for tok in re.split(r"[\s/-]+", model_l)
        if tok and tok not in {"the", "and"}
    ]
    if not model_tokens:
        return brand_l in t
    return all(tok in t for tok in model_tokens)


def score_item(
    item: dict[str, Any], brand: str, model: str, year: int
) -> tuple[int, int, int]:
    snippet = item.get("snippet") or {}
    title = snippet.get("title") or ""
    channel = snippet.get("channelTitle") or ""
    rank = channel_rank(channel)
    relevant = 0 if title_looks_relevant(title, brand, model) else 1
    year_hit = 0 if str(year) in title else 1
    return (relevant, rank, year_hit)


def cache_path(brand_slug: str, model_slug: str, year: int) -> Path:
    return CACHE_DIR / f"{brand_slug}--{model_slug}--{year}.json"


def search_videos(
    api_key: str,
    brand: str,
    model: str,
    year: int,
    *,
    force: bool,
    brand_slug: str,
    model_slug: str,
) -> list[dict[str, Any]]:
    path = cache_path(brand_slug, model_slug, year)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if path.exists() and not force:
        return json.loads(path.read_text(encoding="utf-8")).get("items", [])

    params = {
        "part": "snippet",
        "q": f"{year} {brand} {model} review",
        "type": "video",
        "maxResults": 5,
        "order": "relevance",
        "key": api_key,
        "safeSearch": "none",
    }

    last_err: Exception | None = None
    for attempt in range(1, 5):
        try:
            time.sleep(MIN_DELAY_S * attempt)
            r = requests.get(SEARCH_URL, params=params, timeout=45)
            if r.status_code in (403, 429) and "quota" in r.text.lower():
                raise RuntimeError(
                    f"YouTube API quota exceeded: {r.text[:300]}"
                )
            if r.status_code == 429:
                raise RuntimeError(
                    f"YouTube API quota exceeded: {r.text[:300]}"
                )
            if r.status_code != 200:
                raise RuntimeError(
                    f"YouTube API HTTP {r.status_code}: {r.text[:300]}"
                )
            data = r.json()
            path.write_text(json.dumps(data, indent=2), encoding="utf-8")
            return data.get("items", [])
        except (requests.RequestException, ssl.SSLError, OSError) as err:
            last_err = err
            print(f"  ! attempt {attempt}/4 failed: {err}")
            time.sleep(1.5 * attempt)

    raise RuntimeError(f"YouTube search failed after retries: {last_err}")


def pick_best(
    items: list[dict[str, Any]], brand: str, model: str, year: int
) -> dict[str, str] | None:
    if not items:
        return None
    ranked = sorted(items, key=lambda it: score_item(it, brand, model, year))
    best = ranked[0]
    snippet = best.get("snippet") or {}
    video_id = (best.get("id") or {}).get("videoId")
    if not video_id:
        return None
    title = html.unescape(snippet.get("title") or f"{year} {brand} {model}")
    owner = html.unescape(snippet.get("channelTitle") or "YouTube")
    channel_id = snippet.get("channelId")
    entry: dict[str, str] = {
        "youtubeId": video_id,
        "title": title,
        "owner": owner,
    }
    if channel_id:
        entry["ownerUrl"] = f"https://www.youtube.com/channel/{channel_id}"
    rel, rank, year_hit = score_item(best, brand, model, year)
    notes: list[str] = []
    if rel:
        notes.append("Title may not clearly match this model.")
    if year_hit:
        notes.append(f"YouTube title may not include {year}.")
    if rank >= 99:
        notes.append("Channel is outside the preferred review list.")
    if notes:
        entry["note"] = " ".join(notes)
    return entry


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "brand",
        nargs="?",
        default="toyota",
        help="Brand slug or name (default: toyota)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Ignore disk cache and call the YouTube API again",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace existing video entries (default: keep existing)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Only process the first N model-year slots (quota-safe smoke)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Search/cache but do not write the videos JSON",
    )
    args = parser.parse_args()

    brand_label, brand_slug, models = resolve_brand(args.brand)
    out_path = VIDEOS_DIR / f"{brand_slug}.json"

    api_key = require_api_key()
    existing: dict[str, Any] = {}
    if out_path.exists():
        existing = json.loads(out_path.read_text(encoding="utf-8-sig"))
    out: dict[str, Any] = json.loads(json.dumps(existing))

    def save_out(data: dict[str, Any]) -> None:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    api_calls = 0
    cache_hits = 0
    written = 0
    skipped = 0
    empty = 0
    processed = 0

    print(
        f"== {brand_label} videos ({len(models)} models; years from catalog/overrides) =="
    )

    for model, model_slug, years in models:
        for year in years:
            if args.limit and processed >= args.limit:
                break
            processed += 1

            if not args.overwrite and out.get(model_slug, {}).get(str(year)):
                print(f"  keep {year} {model} (existing)")
                skipped += 1
                continue

            cache_file = cache_path(brand_slug, model_slug, year)
            had_cache = cache_file.exists() and not args.force
            print(f"  search {year} {model}{' (cache)' if had_cache else ''}...", flush=True)
            try:
                items = search_videos(
                    api_key,
                    brand_label,
                    model,
                    year,
                    force=args.force,
                    brand_slug=brand_slug,
                    model_slug=model_slug,
                )
            except RuntimeError as err:
                if "quota" in str(err).lower():
                    if not args.dry_run:
                        save_out(out)
                    print(
                        f"QUOTA exceeded after written={written} kept={skipped}. "
                        "Re-run later to resume (existing entries are kept).",
                        flush=True,
                    )
                    return 2
                raise
            if had_cache:
                cache_hits += 1
            else:
                api_calls += 1

            picked = pick_best(items, brand_label, model, year)
            if not picked:
                print(f"  ! no hit for {year} {model}", flush=True)
                empty += 1
                continue

            out.setdefault(model_slug, {})[str(year)] = picked
            written += 1
            print(f"  + {picked['owner']}: {picked['title'][:70]}", flush=True)
            if not args.dry_run:
                save_out(out)

        if args.limit and processed >= args.limit:
            break

    if not args.dry_run:
        save_out(out)

    print(
        " | ".join(
            [
                f"{'Dry run - not written' if args.dry_run else f'Wrote {out_path}'}",
                f"written={written}",
                f"kept={skipped}",
                f"empty={empty}",
                f"apiCalls={api_calls}",
                f"cacheHits={cache_hits}",
            ]
        )
    )
    print(
        "Quota tip: each apiCall uses ~100 units (daily free ~10,000 -> ~100 searches)."
    )


if __name__ == "__main__":
    main()
