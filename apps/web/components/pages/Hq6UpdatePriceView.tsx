"use client";

import { useState, type FormEvent } from "react";
import { getAllItems, updateItem } from "@/lib/api/items";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { toast } from "@/stores/toastStore";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Ultimate POS — selling_price_group/update_product_price.blade.php */
export function Hq6UpdatePriceView() {
  const tenantId = useTenantId();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!tenantId) {
      toast.error("Select a business first");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const items = await getAllItems(tenantId);
      const header = ["product", "sku", "Selling Price Including Tax"];
      const rows = items.map((item) => [
        escapeCsv(item.name),
        escapeCsv(item.sku),
        String(item.sellPrice ?? item.costPrice ?? 0),
      ]);
      const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "product_prices.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${items.length} product price(s)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      setError(message);
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!file) {
      toast.error("Choose a file to import");
      return;
    }
    if (!tenantId) {
      toast.error("Select a business first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) throw new Error("File has no data rows");

      const items = await getAllItems(tenantId);
      const bySku = new Map(items.map((item) => [item.sku.toLowerCase(), item]));

      let updated = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]!;
        const cols = line.match(/("([^"]|"")*"|[^,]*)/g)?.map((c) =>
          c.replace(/^"|"$/g, "").replace(/""/g, '"').trim(),
        );
        if (!cols || cols.length < 3) continue;
        const sku = cols[1] ?? "";
        const priceRaw = cols[2] ?? "";
        const price = Number(priceRaw);
        if (!sku || !Number.isFinite(price)) {
          errors.push(`Row ${i + 1}: invalid sku/price`);
          continue;
        }
        const item = bySku.get(sku.toLowerCase());
        if (!item) {
          errors.push(`Row ${i + 1}: SKU ${sku} not found`);
          continue;
        }
        await updateItem(item.id, { sellPrice: price });
        updated += 1;
      }

      if (errors.length > 0) {
        setError(errors.slice(0, 5).join("; "));
        toast.success(`Updated ${updated} · ${errors.length} error(s)`);
      } else {
        toast.success(`Updated ${updated} product price(s)`);
      }
      setFile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hq6-page hq6-update-price-page">
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          Update Product Price
        </h1>
      </section>

      <section className="content">
        {error ? (
          <div className="row">
            <div className="col-sm-12">
              <div className="alert alert-danger alert-dismissible">
                <button
                  type="button"
                  className="close"
                  aria-label="Close"
                  onClick={() => setError(null)}
                >
                  ×
                </button>
                {error}
              </div>
            </div>
          </div>
        ) : null}

        <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
          <div className="box-header">
            <h3 className="box-title">Import Export Product Price</h3>
          </div>
          <div className="tw-p-2 sm:tw-p-3 md:p-6">
            <div className="row">
              <div className="col-sm-6">
                <button
                  type="button"
                  className="tw-dw-btn tw-dw-btn-primary tw-text-white"
                  disabled={exporting}
                  onClick={() => void handleExport()}
                >
                  {exporting ? "Exporting…" : "Export product prices"}
                </button>
              </div>
              <div className="col-sm-6">
                <form onSubmit={handleImport}>
                  <div className="form-group">
                    <label htmlFor="product_group_prices">File To Import:</label>
                    <input
                      id="product_group_prices"
                      name="product_group_prices"
                      type="file"
                      accept=".xls,.xlsx,.csv"
                      required
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="form-group">
                    <button
                      type="submit"
                      className="tw-dw-btn tw-dw-btn-primary tw-text-white"
                      disabled={busy}
                    >
                      {busy ? "Submitting…" : "Submit"}
                    </button>
                  </div>
                </form>
              </div>
              <div className="col-sm-12">
                <h4>Instructions:</h4>
                <ol>
                  <li>Export product prices by clicking on above button</li>
                  <li>
                    Make changes in product price including tax &amp; selling
                    price groups.
                  </li>
                  <li>Do not change any product name, sku &amp; headers</li>
                  <li>After making changes import the file</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      <p className="hq6-footer">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()}{" "}
        All rights reserved.
      </p>
    </div>
  );
}
