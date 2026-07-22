"""
Refresh brand model hero images from Wikimedia Commons.

Prefers titles/queries with front / front left / three-quarter facing views.
Updates public/catalog/{make}--{model}.jpg and catalog.generated.json src/dims.

Usage:
  python scripts/refresh-brand-heroes.py chevrolet
  python scripts/refresh-brand-heroes.py honda --force
  python scripts/refresh-brand-heroes.py all
"""

from __future__ import annotations

import argparse
import json
import re
import time
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "data" / "catalog.generated.json"
OUT_DIR = ROOT / "public" / "catalog"
UA = {"User-Agent": "motomediax/0.1 (catalog heroes; https://github.com/motomediax)"}

DONE = {"toyota", "ford"}
CACHE_DIR = Path(__file__).resolve().parent / ".cache"


def load_curated() -> dict[str, str]:
    merged: dict[str, str] = {}
    for path in sorted(CACHE_DIR.glob("curated-heroes*.json")):
        try:
            merged.update(json.loads(path.read_text(encoding="utf-8")))
        except Exception:
            continue
    return merged


def commons_search(query: str) -> list[str]:
    r = requests.get(
        "https://commons.wikimedia.org/w/api.php",
        params={
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srnamespace": 6,
            "srlimit": 12,
            "format": "json",
        },
        headers=UA,
        timeout=60,
    )
    r.raise_for_status()
    return [h["title"] for h in r.json().get("query", {}).get("search", [])]


def commons_thumb(title: str, width: int = 1600) -> tuple[bytes, int, int] | None:
    r = requests.get(
        "https://commons.wikimedia.org/w/api.php",
        params={
            "action": "query",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url|size|mime",
            "iiurlwidth": width,
            "format": "json",
        },
        headers=UA,
        timeout=60,
    )
    r.raise_for_status()
    page = next(iter(r.json()["query"]["pages"].values()))
    ii = (page.get("imageinfo") or [None])[0]
    if not ii:
        return None
    mime = (ii.get("mime") or "").lower()
    if "jpeg" not in mime and "jpg" not in mime and "png" not in mime:
        return None
    url = ii.get("thumburl") or ii.get("url")
    if not url:
        return None
    data = requests.get(url, headers=UA, timeout=90).content
    if len(data) < 8000:
        return None
    im = Image.open(BytesIO(data))
    if im.mode not in ("RGB", "L"):
        im = im.convert("RGB")
    buf = BytesIO()
    im.save(buf, format="JPEG", quality=88, optimize=True)
    return buf.getvalue(), im.size[0], im.size[1]


def title_score(title: str, brand: str, model: str) -> int:
    t = title.lower()
    brand_l = brand.lower()
    model_l = model.lower()
    score = 0

    # Hard requirement: brand must appear
    if brand_l not in t:
        return -100
    # Model tokens (ignore very short noise)
    model_tokens = [
        tok
        for tok in re.split(r"[\s/-]+", model_l)
        if len(tok) >= 2 and tok not in {"ev", "the", "and"}
    ]
    if model_tokens and not all(tok in t for tok in model_tokens):
        # Allow hyphen/space variants for things like "bolt ev" / "bolt-ev"
        compact_model = re.sub(r"[^a-z0-9]+", "", model_l)
        compact_title = re.sub(r"[^a-z0-9]+", "", t)
        if compact_model not in compact_title:
            return -100

    if "front" in t:
        score += 5
    if "front left" in t or "front-left" in t or "three-quarter" in t:
        score += 3
    if "rear" in t or "back" in t:
        score -= 8
    if "logo" in t or "badge" in t or "emblem" in t:
        score -= 10
    if "interior" in t or "dashboard" in t:
        score -= 10
    years = [int(y) for y in re.findall(r"\b(19\d{2}|20\d{2})\b", t)]
    if years:
        newest = max(years)
        if newest >= 2020:
            score += 10
        elif newest >= 2016:
            score += 5
        elif newest >= 2010:
            score += 1
        else:
            score -= 20
    return score


def pick_image(
    brand: str,
    model: str,
    *,
    curated_title: str | None = None,
) -> tuple[str, bytes, int, int] | None:
    if curated_title:
        time.sleep(0.25)
        try:
            got = commons_thumb(curated_title)
            if got:
                data, w, h = got
                return curated_title, data, w, h
            print(f"    curated miss: {curated_title}", flush=True)
        except Exception as exc:
            print(f"    curated fail: {exc}", flush=True)

    queries = [
        f'"{brand}" "{model}" 2024 OR 2025 OR 2026 front',
        f'"{brand}" "{model}" 2023 OR 2022 OR 2021 front',
        f'"{brand}" "{model}" front left',
        f'"{brand}" "{model}" front',
    ]
    seen: set[str] = set()
    candidates: list[tuple[int, str]] = []
    for q in queries:
        time.sleep(0.35)
        try:
            titles = commons_search(q)
        except Exception as exc:
            print(f"    search fail: {exc}", flush=True)
            continue
        for title in titles:
            if title in seen:
                continue
            seen.add(title)
            candidates.append((title_score(title, brand, model), title))
    candidates.sort(key=lambda x: x[0], reverse=True)
    for score, title in candidates[:12]:
        if score < 5:
            continue
        time.sleep(0.35)
        try:
            got = commons_thumb(title)
        except Exception:
            continue
        if not got:
            continue
        data, w, h = got
        # Prefer landscape
        if w < h * 0.9:
            continue
        return title, data, w, h
    return None


def refresh_brand(brand_slug: str, *, force: bool, curated: dict[str, str]) -> int:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    make = next((m for m in catalog if m.get("slug") == brand_slug), None)
    if not make:
        raise SystemExit(f"Unknown brand {brand_slug}")
    updated = 0
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for model in make.get("models", []):
        model_slug = model["slug"]
        dest = OUT_DIR / f"{brand_slug}--{model_slug}.jpg"
        key = f"{brand_slug}/{model_slug}"
        curated_title = curated.get(key)
        if (
            dest.exists()
            and not force
            and not curated_title
            and dest.stat().st_size > 20000
        ):
            src = f"/catalog/{brand_slug}--{model_slug}.jpg"
            for year in model.get("years", []):
                for img in year.get("images", []):
                    if img.get("src", "").startswith(
                        f"/catalog/{brand_slug}--{model_slug}"
                    ):
                        img["src"] = src
            print(f"  keep {model_slug}", flush=True)
            continue
        print(f"  fetch {model_slug}...", flush=True)
        picked = pick_image(
            make["name"], model["name"], curated_title=curated_title
        )
        if not picked:
            print(f"  ! no photo for {model_slug}", flush=True)
            continue
        title, data, w, h = picked
        dest.write_bytes(data)
        src = f"/catalog/{brand_slug}--{model_slug}.jpg"
        for year in model.get("years", []):
            imgs = year.get("images") or []
            if not imgs:
                year["images"] = [
                    {
                        "src": src,
                        "alt": f"{year.get('year')} {make['name']} {model['name']}",
                        "width": w,
                        "height": h,
                    }
                ]
            else:
                for img in imgs:
                    img["src"] = src
                    img["width"] = w
                    img["height"] = h
                    img["alt"] = f"{year.get('year')} {make['name']} {model['name']}"
        updated += 1
        print(f"  + {model_slug} <- {title} ({w}x{h})", flush=True)
    CATALOG.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    return updated


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("brand", help="brand slug or 'all'")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    curated = load_curated()
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    if args.brand == "all":
        brands = [m["slug"] for m in catalog if m["slug"] not in DONE]
    else:
        brands = [args.brand.lower()]
    total = 0
    for b in brands:
        print(f"\n== {b} ==", flush=True)
        total += refresh_brand(b, force=args.force, curated=curated)
    print(f"\nDone. Updated {total} heroes.", flush=True)


if __name__ == "__main__":
    main()