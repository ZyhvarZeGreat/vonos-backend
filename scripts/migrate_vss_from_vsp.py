#!/usr/bin/env python3
"""DEPRECATED: use migrate_visp_from_vsp.py or migrate_all.py --entities VISP."""

from __future__ import annotations

import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from migrate_visp_from_vsp import main

if __name__ == "__main__":
    print(
        "WARNING: migrate_vss_from_vsp.py is deprecated. VSS → tenant_vss_001 mapping retired; use VISP.",
        file=sys.stderr,
    )
    raise SystemExit(main())
