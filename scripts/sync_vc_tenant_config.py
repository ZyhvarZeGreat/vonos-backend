#!/usr/bin/env python3
"""Sync Vonos Cafe tenant config on Postgres to match cutover target (no kitchen, Lagos presets)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from migration.tenant_db import _connect, load_database_url

TENANT_ID = "tenant_vc_001"

# Mirrors apps/web/lib/registries/tenantConfigs.ts cafeTenantConfig + catalogPresets VC
TARGET_CONFIG = {
    "tenantId": TENANT_ID,
    "code": "VC",
    "name": "Vonos Cafe",
    "archetype": "transaction",
    "navItems": [
        {"label": "Overview", "icon": "layout-dashboard", "route": "/VC/overview", "pageType": "dashboard"},
        {"label": "Tables", "icon": "grid-3x3", "route": "/VC/tables", "pageType": "list"},
        {"label": "Suppliers", "icon": "truck", "route": "/VC/suppliers", "pageType": "list"},
        {"label": "Finance", "icon": "wallet", "route": "/VC/finance", "pageType": "dashboard"},
        {"label": "Users", "icon": "users", "route": "/VC/users", "pageType": "form"},
        {"label": "Settings", "icon": "settings", "route": "/VC/settings", "pageType": "form"},
    ],
    "kpiCards": [
        {"label": "Today's Orders", "icon": "receipt", "metricKey": "todayOrders", "color": "#059669"},
        {"label": "Active Tables", "icon": "grid-3x3", "metricKey": "activeTables", "color": "#2563eb"},
        {"label": "Low Stock", "icon": "alert-triangle", "metricKey": "lowStock", "color": "#9333ea"},
        {"label": "Revenue", "icon": "wallet", "metricKey": "revenue", "color": "#e11d48"},
    ],
    "terminology": {"order": "Order", "menuItem": "Menu Item", "table": "Table"},
    "enabledModules": [
        "orders",
        "tables",
        "inventory",
        "paymentAccounts",
        "pos",
        "quotations",
        "reports",
        "finance",
    ],
    "itemCategories": ["Hot Drinks", "Cold Drinks", "Pastries", "Snacks"],
    "businessLocations": [{"code": "BL0001", "name": "Vonos Cafe"}],
    "storageLocations": [],
}


def run(*, dry_run: bool = False) -> None:
    url = load_database_url()
    with _connect(url) as conn, conn.cursor() as cur:
        cur.execute('SELECT config FROM "Tenant" WHERE id = %s', (TENANT_ID,))
        row = cur.fetchone()
        if not row:
            raise SystemExit(f"Tenant {TENANT_ID} not found")

        current = row[0]
        if isinstance(current, str):
            current = json.loads(current)

        merged = {**current, **TARGET_CONFIG}
        removed_kitchen = "kitchen" in (current.get("enabledModules") or [])
        print(f"Current enabledModules: {current.get('enabledModules')}")
        print(f"Target enabledModules:  {TARGET_CONFIG['enabledModules']}")
        print(f"Kitchen removed: {removed_kitchen}")

        if dry_run:
            print("Dry-run — no write.")
            return

        cur.execute(
            'UPDATE "Tenant" SET config = %s::jsonb WHERE id = %s',
            (json.dumps(merged), TENANT_ID),
        )
        conn.commit()
        print(f"Updated config for {TENANT_ID}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
