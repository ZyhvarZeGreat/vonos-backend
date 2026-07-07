"""Import product reference tables: categories, brands, units, warranties, price groups."""

from __future__ import annotations

from migration.pos_common import legacy_map, new_cuid, parse_int, table_rows
from migration.types import TableData, TransformResult


def transform_catalog_meta(
    tables: dict[str, TableData],
    tenant_id: str,
    *,
    existing_legacy: dict[str, dict[int, str]] | None = None,
) -> TransformResult:
    result = TransformResult()
    existing = existing_legacy or {}

    category_legacy: dict[int, str] = {**existing.get("product_category", {})}
    brand_legacy: dict[int, str] = {**existing.get("brand", {})}
    unit_legacy: dict[int, str] = {**existing.get("product_unit", {})}
    warranty_legacy: dict[int, str] = {**existing.get("warranty", {})}
    price_group_legacy: dict[int, str] = {**existing.get("selling_price_group", {})}

    for row in table_rows(tables, "categories"):
        if row.get("deleted_at") not in (None, "", "NULL"):
            continue
        legacy_id = parse_int(row.get("id"))
        if legacy_id <= 0 or legacy_id in category_legacy:
            continue
        cat_id = new_cuid()
        parent_legacy = parse_int(row.get("parent_id"), 0)
        parent_id = category_legacy.get(parent_legacy) if parent_legacy > 0 else None
        result.product_categories.append({
            "id": cat_id,
            "tenantId": tenant_id,
            "name": str(row.get("name") or f"Category {legacy_id}"),
            "shortCode": str(row.get("short_code") or "") or None,
            "parentId": parent_id,
            "categoryType": str(row.get("category_type") or "") or None,
            "description": str(row.get("description") or "") or None,
            "slug": str(row.get("slug") or "") or None,
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "product_category",
            "legacyId": legacy_id,
            "newId": cat_id,
        })
        category_legacy[legacy_id] = cat_id

    category_legacy = {**category_legacy, **legacy_map(result.legacy_ids, "product_category")}

    for row in table_rows(tables, "brands"):
        if row.get("deleted_at") not in (None, "", "NULL"):
            continue
        legacy_id = parse_int(row.get("id"))
        if legacy_id <= 0 or legacy_id in brand_legacy:
            continue
        brand_id = new_cuid()
        result.brands.append({
            "id": brand_id,
            "tenantId": tenant_id,
            "name": str(row.get("name") or f"Brand {legacy_id}"),
            "description": str(row.get("description") or "") or None,
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "brand",
            "legacyId": legacy_id,
            "newId": brand_id,
        })

    for row in table_rows(tables, "units"):
        if row.get("deleted_at") not in (None, "", "NULL"):
            continue
        legacy_id = parse_int(row.get("id"))
        if legacy_id <= 0 or legacy_id in unit_legacy:
            continue
        unit_id = new_cuid()
        result.product_units.append({
            "id": unit_id,
            "tenantId": tenant_id,
            "name": str(row.get("actual_name") or f"Unit {legacy_id}"),
            "shortName": str(row.get("short_name") or "u"),
            "allowDecimal": bool(parse_int(row.get("allow_decimal"), 0)),
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "product_unit",
            "legacyId": legacy_id,
            "newId": unit_id,
        })

    for row in table_rows(tables, "warranties"):
        legacy_id = parse_int(row.get("id"))
        if legacy_id <= 0 or legacy_id in warranty_legacy:
            continue
        warranty_id = new_cuid()
        duration_type = str(row.get("duration_type") or "months")
        if duration_type not in ("days", "months", "years"):
            duration_type = "months"
        result.warranties.append({
            "id": warranty_id,
            "tenantId": tenant_id,
            "name": str(row.get("name") or f"Warranty {legacy_id}"),
            "description": str(row.get("description") or "") or None,
            "duration": parse_int(row.get("duration"), 0),
            "durationType": duration_type,
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "warranty",
            "legacyId": legacy_id,
            "newId": warranty_id,
        })

    for row in table_rows(tables, "selling_price_groups"):
        if row.get("deleted_at") not in (None, "", "NULL"):
            continue
        legacy_id = parse_int(row.get("id"))
        if legacy_id <= 0 or legacy_id in price_group_legacy:
            continue
        group_id = new_cuid()
        result.selling_price_groups.append({
            "id": group_id,
            "tenantId": tenant_id,
            "name": str(row.get("name") or f"Price group {legacy_id}"),
            "description": str(row.get("description") or "") or None,
            "isActive": bool(parse_int(row.get("is_active"), 1)),
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "selling_price_group",
            "legacyId": legacy_id,
            "newId": group_id,
        })

    layout_legacy: dict[int, str] = {**existing.get("invoice_layout", {})}
    scheme_legacy: dict[int, str] = {**existing.get("invoice_scheme", {})}

    for row in table_rows(tables, "invoice_layouts"):
        legacy_id = parse_int(row.get("id"))
        if legacy_id <= 0 or legacy_id in layout_legacy:
            continue
        layout_id = new_cuid()
        design = str(row.get("design") or "classic").strip().lower() or "classic"
        result.invoice_layouts.append({
            "id": layout_id,
            "tenantId": tenant_id,
            "name": str(row.get("name") or f"Layout {legacy_id}"),
            "design": design,
            "headerText": str(row.get("header_text") or "") or None,
            "footerText": str(row.get("footer_text") or "") or None,
            "termsText": None,
            "isDefault": bool(parse_int(row.get("is_default"), 0)),
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "invoice_layout",
            "legacyId": legacy_id,
            "newId": layout_id,
        })
        layout_legacy[legacy_id] = layout_id

    for row in table_rows(tables, "invoice_schemes"):
        legacy_id = parse_int(row.get("id"))
        if legacy_id <= 0 or legacy_id in scheme_legacy:
            continue
        scheme_id = new_cuid()
        result.invoice_schemes.append({
            "id": scheme_id,
            "tenantId": tenant_id,
            "name": str(row.get("name") or f"Scheme {legacy_id}"),
            "prefix": str(row.get("prefix") or "") or None,
            "startNumber": parse_int(row.get("start_number"), 1),
            "invoiceCount": parse_int(row.get("invoice_count"), 0),
            "totalDigits": parse_int(row.get("total_digits"), 4),
            "isDefault": bool(parse_int(row.get("is_default"), 0)),
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "invoice_scheme",
            "legacyId": legacy_id,
            "newId": scheme_id,
        })
        scheme_legacy[legacy_id] = scheme_id

    return result
