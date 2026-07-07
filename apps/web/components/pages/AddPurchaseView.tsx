"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { ProductItemSearch } from "@/components/molecules/ProductItemSearch";
import { createStockMovement } from "@/lib/api/stockMovements";
import { getSuppliers } from "@/lib/api/suppliers";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import type { Item } from "@vonos/types";

interface PurchaseLine {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export function AddPurchaseView() {
  const tenantId = useTenantId();
  const { tenantCode } = useRouteTenant();
  const router = useRouter();
  const qc = useQueryClient();
  const [supplierSearch, setSupplierSearch] = useState("");

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", tenantId, supplierSearch],
    queryFn: () => getSuppliers(tenantId!),
    enabled: Boolean(tenantId),
  });

  const filteredSuppliers = supplierSearch.trim()
    ? suppliers.filter((s) =>
        s.name.toLowerCase().includes(supplierSearch.trim().toLowerCase()),
      )
    : suppliers;

  const [form, setForm] = useState({
    reference: "",
    supplierId: "",
    locationCode: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [lines, setLines] = useState<PurchaseLine[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      createStockMovement(tenantId!, {
        type: "inbound",
        reference: form.reference || `PO-${Date.now()}`,
        status: "Pending",
        supplierId: form.supplierId || undefined,
        locationCode: form.locationCode || undefined,
        date: form.date,
        notes: form.notes || undefined,
        lines: lines.map((line) => ({
          itemId: line.itemId,
          sku: line.sku,
          name: line.name,
          quantity: line.quantity,
          unitCost: line.unitCost,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-movements", tenantId] });
      router.push(`/${tenantCode}/inbound`);
    },
  });

  const addItem = (item: Item) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.itemId === item.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          quantity: 1,
          unitCost: item.costPrice,
        },
      ];
    });
  };

  const grandTotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitCost,
    0,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Add Purchase</h2>
        <p className="mt-1 text-sm text-muted">Record a new purchase from a supplier.</p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Reference No</label>
            <input
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Auto-generated if empty"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Supplier *</label>
            <input
              type="search"
              className="mb-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Search suppliers…"
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
            />
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            >
              <option value="">Select supplier…</option>
              {filteredSuppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Location</label>
            <input
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={form.locationCode}
              onChange={(e) => setForm({ ...form, locationCode: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Purchase Date</label>
            <input
              type="date"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Add products</label>
          <ProductItemSearch tenantId={tenantId!} onSelect={addItem} />
        </div>

        {lines.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2">Product</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Unit cost</th>
                  <th className="py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.itemId} className="border-b border-border">
                    <td className="py-2">{line.name}</td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={1}
                        className="w-20 rounded border border-border px-2 py-1"
                        value={line.quantity}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.itemId === line.itemId
                                ? { ...l, quantity: Number(e.target.value) || 1 }
                                : l,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={0}
                        className="w-28 rounded border border-border px-2 py-1"
                        value={line.unitCost}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.itemId === line.itemId
                                ? { ...l, unitCost: Number(e.target.value) || 0 }
                                : l,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="py-2">₦{(line.quantity * line.unitCost).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-right text-sm font-medium">
              Grand total: ₦{grandTotal.toLocaleString()}
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || lines.length === 0 || !form.supplierId}
          >
            {mutation.isPending ? "Saving…" : "Save Purchase"}
          </Button>
        </div>
      </div>
    </div>
  );
}
