#!/usr/bin/env python3
"""Dedupe VISP/VSP tenant after repeated migration imports (legacy name: dedupe_vss)."""

from __future__ import annotations

import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from migration.dedupe_tenant import main

if __name__ == "__main__":
    raise SystemExit(main())
