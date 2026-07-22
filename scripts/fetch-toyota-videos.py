"""Backward-compatible wrapper → scripts/fetch-brand-videos.py toyota """
from __future__ import annotations

import runpy
import sys
from pathlib import Path

script = Path(__file__).resolve().parent / "fetch-brand-videos.py"
sys.argv = [str(script), "toyota", *sys.argv[1:]]
runpy.run_path(str(script), run_name="__main__")
