"""
Apply MODEL_YEARS overrides from src/data/model-years.json onto catalog.generated.json.

For each make/model with an override:
- Keep/adapt a single template year entry from the model
- Emit only the override years (clone template, rewrite year/slug/alt/summary bits)

Usage:
  python scripts/apply-model-years.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "data" / "catalog.generated.json"
OVERRIDES = ROOT / "src" / "data" / "model-years.json"


def rewrite_year_entry(template: dict, year: int, make: str, model: str) -> dict:
    entry = json.loads(json.dumps(template))
    entry["year"] = year
    entry["slug"] = str(year)
    # Rewrite year numbers in copy fields
    for key in ("summary", "description"):
        if isinstance(entry.get(key), str):
            entry[key] = re.sub(r"\b20\d{2}\b", str(year), entry[key], count=3)
            if not entry[key].startswith(str(year)):
                # Prefer a clean summary lead
                if key == "summary":
                    entry[key] = f"{year} {make} {model}."
    highlights = entry.get("highlights")
    if isinstance(highlights, list):
        entry["highlights"] = [
            re.sub(r"\b20\d{2}\b", str(year), h) if isinstance(h, str) else h
            for h in highlights
        ]
    for img in entry.get("images") or []:
        if isinstance(img, dict) and isinstance(img.get("alt"), str):
            img["alt"] = re.sub(r"\b20\d{2}\b", str(year), img["alt"])
            if str(year) not in img["alt"]:
                img["alt"] = f"{year} {make} {model}"
    specs = entry.get("specs")
    if isinstance(specs, dict):
        specs["modelYear"] = year
        if isinstance(specs.get("vehicleDescription"), str):
            specs["vehicleDescription"] = re.sub(
                r"\b20\d{2}\b", str(year), specs["vehicleDescription"], count=1
            )
    return entry


def main() -> None:
    overrides: dict[str, list[int]] = json.loads(
        OVERRIDES.read_text(encoding="utf-8")
    )
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    touched = 0

    for make in catalog:
        make_slug = make.get("slug") or ""
        make_name = make.get("name") or make_slug
        for model in make.get("models") or []:
            model_slug = model.get("slug") or ""
            key = f"{make_slug}/{model_slug}"
            years = overrides.get(key)
            if not years:
                continue
            existing = model.get("years") or []
            if not existing:
                print(f"  skip {key} (no years)")
                continue
            # Prefer matching year template, else first
            by_year = {y.get("year"): y for y in existing if isinstance(y, dict)}
            template = by_year.get(years[0]) or existing[0]
            model_name = model.get("name") or model_slug
            model["years"] = [
                rewrite_year_entry(template, year, make_name, model_name)
                for year in years
            ]
            touched += 1
            print(f"  {key} -> {years}")

    CATALOG.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print(f"Done. Updated {touched} models.")


if __name__ == "__main__":
    main()
