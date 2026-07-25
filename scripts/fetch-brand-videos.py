"""
Fetch year-page YouTube review candidates.

Writes/merges into: src/data/videos/{brand}.json
Caches raw search responses under: scripts/.cache/youtube/

Backends:
  - youtube-api: YouTube Data API v3 (needs YOUTUBE_API_KEY / YOUTUBEKEY)
  - ytdlp: yt-dlp ytsearch (no API key; default when no key is set)

Usage:
  python scripts/fetch-brand-videos.py mazda
  python scripts/fetch-brand-videos.py tesla --backend ytdlp
  python scripts/fetch-brand-videos.py bmw --overwrite
  python scripts/fetch-brand-videos.py ford --limit 3

Requires: pip install requests
Optional: pip install yt-dlp  (for --backend ytdlp / no-key mode)
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import ssl
import subprocess
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
    "mazda usa",
    "bmw usa",
    "mercedes-benz usa",
    "volkswagen",
    "tesla",
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
    "cargurus",
]

# Extra positive / negative title tokens for ambiguous nameplates.
MODEL_ALIASES: dict[str, dict[str, list[str]]] = {
    "miata": {"any": ["miata", "mx-5", "mx5"], "all": []},
    "mazda3": {"any": ["mazda3", "mazda 3"], "all": []},
    "mazda6": {"any": ["mazda6", "mazda 6"], "all": []},
    "cx-5": {"any": ["cx-5", "cx5"], "none": ["cx-50", "cx50", "cx-70", "cx70"]},
    "cx-30": {"any": ["cx-30", "cx30"], "none": []},
    "cx-9": {"any": ["cx-9", "cx9"], "none": ["cx-90", "cx90"]},
    "cx-90": {"any": ["cx-90", "cx90"], "none": ["cx-9 "]},
    "mazdaspeed3": {"any": ["mazdaspeed3", "mazdaspeed 3", "speed3"], "all": []},
    "rx-8": {"any": ["rx-8", "rx8"], "all": []},
    "model-s": {"any": ["model s", "models"], "none": ["model 3", "model y", "model x", "cybertruck"]},
    "model-3": {"any": ["model 3", "model3"], "none": ["model y", "model s", "model x", "cybertruck"]},
    "model-x": {"any": ["model x", "modelx"], "none": ["model 3", "model y", "model s", "cybertruck"]},
    "model-y": {"any": ["model y", "modely"], "none": ["model 3", "model s", "model x", "cybertruck"]},
    "cybertruck": {"any": ["cybertruck"], "all": []},
    "roadster": {"any": ["roadster"], "all": []},
    "c-class": {"any": ["c-class", "c class", "c300", "c 300"], "none": ["e-class", "s-class", "cla"]},
    "e-class": {"any": ["e-class", "e class", "e350", "e 350"], "none": ["c-class", "s-class"]},
    "s-class": {"any": ["s-class", "s class", "s580", "s 580"], "none": ["c-class", "e-class"]},
    "g-class": {"any": ["g-class", "g class", "g-wagen", "gwagen", "g550", "g 550"], "all": []},
    "amg-gt": {"any": ["amg gt", "amg-gt"], "all": []},
    "sl-class": {"any": ["sl-class", "sl class", "sl55", "sl 55", "sl63"], "none": ["slk", "slc"]},
    "glc": {"any": ["glc"], "none": ["gle", "gls", "gla"]},
    "gle": {"any": ["gle"], "none": ["glc", "gls"]},
    "gls": {"any": ["gls"], "none": ["glc", "gle"]},
    "cla": {"any": ["cla"], "none": ["c-class", "cls"]},
    "eqs": {"any": ["eqs"], "none": ["eqe", "eqb"]},
    "slk-slc": {"any": ["slk", "slc"], "all": []},
    "jetta": {"any": ["jetta"], "all": []},
    "golf": {"any": ["golf"], "none": ["gti", "golf r", "r-line"]},
    "gti": {"any": ["gti"], "none": ["golf r"]},
    "golf-r": {"any": ["golf r", "golf-r"], "all": []},
    "passat": {"any": ["passat"], "all": []},
    "tiguan": {"any": ["tiguan"], "all": []},
    "touareg": {"any": ["touareg"], "all": []},
    "atlas": {"any": ["atlas"], "none": ["atlas cross"]},
    "beetle": {"any": ["beetle"], "all": []},
    "id-4": {"any": ["id.4", "id4", "id 4"], "all": []},
    "3-series": {"any": ["3 series", "3-series", "330i", "330e", "m340"], "none": ["m3 ", " m3"]},
    "5-series": {"any": ["5 series", "5-series", "530i", "540i", "i5"], "none": ["m5 "]},
    "7-series": {"any": ["7 series", "7-series", "740i", "760i", "i7"], "none": []},
    "m2": {"any": ["m2"], "none": ["m3", "m4", "m5"]},
    "m3": {"any": ["m3"], "none": ["m2", "m4", "m5", "3 series"]},
    "m4": {"any": ["m4"], "none": ["m2", "m3", "m5"]},
    "m5": {"any": ["m5"], "none": ["m2", "m3", "m4"]},
    "x3": {"any": ["x3"], "none": ["x5", "x7", "x1", "x4"]},
    "x5": {"any": ["x5"], "none": ["x3", "x7", "x6"]},
    "x7": {"any": ["x7"], "none": ["x3", "x5"]},
    "z4": {"any": ["z4"], "all": []},
    "i3": {"any": ["i3"], "none": ["i4", "i8", "i5", "i7"]},
    "i8": {"any": ["i8"], "none": ["i3", "i4"]},
    "i4": {"any": ["i4"], "none": ["i3", "i5", "i7", "i8"]},
    "ix": {"any": ["ix ", " ix", "bmw ix", "iX"], "none": ["i4", "i3"]},
}

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


def resolve_api_key() -> str | None:
    load_env_local()
    key = (
        os.environ.get("YOUTUBE_API_KEY")
        or os.environ.get("YOUTUBEKEY")
        or ""
    ).strip()
    return key or None


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


def title_looks_relevant(title: str, brand: str, model: str, model_slug: str) -> bool:
    t = title.lower()
    brand_l = brand.lower()
    aliases = MODEL_ALIASES.get(model_slug)

    if aliases:
        any_toks = [a.lower() for a in aliases.get("any", [])]
        none_toks = [a.lower() for a in aliases.get("none", [])]
        all_toks = [a.lower() for a in aliases.get("all", [])]
        if none_toks and any(tok in t for tok in none_toks):
            return False
        if all_toks and not all(tok in t for tok in all_toks):
            return False
        if any_toks and any(tok in t for tok in any_toks):
            return True
        # Fall through to generic matching if aliases miss.

    if brand_l not in t and clean_model_name(model).lower() not in t:
        # Allow brandless titles when model is distinctive (e.g. "Cybertruck")
        model_l = clean_model_name(model).lower()
        if model_l not in t and model_slug.replace("-", " ") not in t:
            return False

    model_tokens = [
        tok
        for tok in re.split(r"[\s/-]+", clean_model_name(model).lower())
        if tok and tok not in {"the", "and", "class", "series"}
    ]
    if not model_tokens:
        return brand_l in t
    return all(tok in t for tok in model_tokens)


def score_item(
    item: dict[str, Any], brand: str, model: str, year: int, model_slug: str
) -> tuple[int, int, int]:
    snippet = item.get("snippet") or {}
    title = snippet.get("title") or ""
    channel = snippet.get("channelTitle") or ""
    rank = channel_rank(channel)
    relevant = 0 if title_looks_relevant(title, brand, model, model_slug) else 1
    year_hit = 0 if str(year) in title else 1
    return (relevant, rank, year_hit)


def cache_path(brand_slug: str, model_slug: str, year: int, backend: str) -> Path:
    suffix = "" if backend == "youtube-api" else f"--{backend}"
    return CACHE_DIR / f"{brand_slug}--{model_slug}--{year}{suffix}.json"


def search_videos_api(
    api_key: str,
    brand: str,
    model: str,
    year: int,
    *,
    force: bool,
    brand_slug: str,
    model_slug: str,
) -> list[dict[str, Any]]:
    path = cache_path(brand_slug, model_slug, year, "youtube-api")
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if path.exists() and not force:
        return json.loads(path.read_text(encoding="utf-8")).get("items", [])

    params = {
        "part": "snippet",
        "q": f"{year} {brand} {model} review",
        "type": "video",
        "maxResults": 8,
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
                raise RuntimeError(f"YouTube API quota exceeded: {r.text[:300]}")
            if r.status_code == 429:
                raise RuntimeError(f"YouTube API quota exceeded: {r.text[:300]}")
            if r.status_code != 200:
                raise RuntimeError(f"YouTube API HTTP {r.status_code}: {r.text[:300]}")
            data = r.json()
            path.write_text(json.dumps(data, indent=2), encoding="utf-8")
            return data.get("items", [])
        except (requests.RequestException, ssl.SSLError, OSError) as err:
            last_err = err
            print(f"  ! attempt {attempt}/4 failed: {err}")
            time.sleep(1.5 * attempt)

    raise RuntimeError(f"YouTube search failed after retries: {last_err}")


def ytdlp_bin() -> str | None:
    return shutil.which("yt-dlp") or (
        str(Path.home() / ".local" / "bin" / "yt-dlp")
        if (Path.home() / ".local" / "bin" / "yt-dlp").exists()
        else None
    )


def search_videos_ytdlp(
    brand: str,
    model: str,
    year: int,
    *,
    force: bool,
    brand_slug: str,
    model_slug: str,
) -> list[dict[str, Any]]:
    path = cache_path(brand_slug, model_slug, year, "ytdlp")
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if path.exists() and not force:
        return json.loads(path.read_text(encoding="utf-8")).get("items", [])

    binary = ytdlp_bin()
    if not binary:
        raise RuntimeError(
            "yt-dlp not found. Install with: pip install yt-dlp"
        )

    query = f"ytsearch8:{year} {brand} {model} review"
    cmd = [
        binary,
        query,
        "--flat-playlist",
        "--dump-json",
        "--no-warnings",
        "--no-download",
    ]
    time.sleep(MIN_DELAY_S)
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    if proc.returncode != 0:
        raise RuntimeError(
            f"yt-dlp failed ({proc.returncode}): {proc.stderr[:400] or proc.stdout[:400]}"
        )

    items: list[dict[str, Any]] = []
    for line in proc.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            raw = json.loads(line)
        except json.JSONDecodeError:
            continue
        video_id = raw.get("id")
        title = raw.get("title") or ""
        channel = raw.get("channel") or raw.get("uploader") or ""
        channel_id = raw.get("channel_id") or raw.get("uploader_id") or ""
        if not video_id or not title:
            continue
        items.append(
            {
                "id": {"videoId": video_id},
                "snippet": {
                    "title": title,
                    "channelTitle": channel,
                    "channelId": channel_id if str(channel_id).startswith("UC") else None,
                },
            }
        )

    payload = {"items": items, "backend": "ytdlp", "query": query}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return items


def pick_best(
    items: list[dict[str, Any]],
    brand: str,
    model: str,
    year: int,
    model_slug: str,
) -> dict[str, str] | None:
    if not items:
        return None
    ranked = sorted(
        items, key=lambda it: score_item(it, brand, model, year, model_slug)
    )
    # Prefer a relevant hit if any exist.
    relevant = [
        it
        for it in ranked
        if score_item(it, brand, model, year, model_slug)[0] == 0
    ]
    best = relevant[0] if relevant else None
    if not best:
        return None
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
    else:
        # Stable watch link when channel id is unknown (yt-dlp flat).
        entry["ownerUrl"] = f"https://www.youtube.com/watch?v={video_id}"
    rel, rank, year_hit = score_item(best, brand, model, year, model_slug)
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


def main() -> int | None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "brand",
        nargs="?",
        default="toyota",
        help="Brand slug or name (default: toyota)",
    )
    parser.add_argument(
        "--backend",
        choices=("auto", "youtube-api", "ytdlp"),
        default="auto",
        help="Search backend (default: auto → API if key present else yt-dlp)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Ignore disk cache and search again",
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

    api_key = resolve_api_key()
    backend = args.backend
    if backend == "auto":
        backend = "youtube-api" if api_key else "ytdlp"
    if backend == "youtube-api" and not api_key:
        raise SystemExit(
            "Missing YOUTUBE_API_KEY (or YOUTUBEKEY). Add it to .env.local, or use --backend ytdlp."
        )
    if backend == "ytdlp" and not ytdlp_bin():
        raise SystemExit("yt-dlp not found. Install with: pip install yt-dlp")

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
        f"== {brand_label} videos ({len(models)} models; backend={backend}) =="
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

            cache_file = cache_path(brand_slug, model_slug, year, backend)
            had_cache = cache_file.exists() and not args.force
            print(
                f"  search {year} {model}{' (cache)' if had_cache else ''}...",
                flush=True,
            )
            try:
                if backend == "youtube-api":
                    assert api_key
                    items = search_videos_api(
                        api_key,
                        brand_label,
                        model,
                        year,
                        force=args.force,
                        brand_slug=brand_slug,
                        model_slug=model_slug,
                    )
                else:
                    items = search_videos_ytdlp(
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

            picked = pick_best(items, brand_label, model, year, model_slug)
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
                f"searches={api_calls}",
                f"cacheHits={cache_hits}",
                f"backend={backend}",
            ]
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main() or 0)
