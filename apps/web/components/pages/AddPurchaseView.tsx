"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { MenuSelect } from "@/components/molecules/MenuSelect";
import { ProductItemSearch, type CatalogPartPick } from "@/components/molecules/ProductItemSearch";
import { createStockMovement } from "@/lib/api/stockMovements";
import { getSuppliers } from "@/lib/api/suppliers";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";

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

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", tenantId],
    queryFn: () => getSuppliers(tenantId!),
    enabled: Boolean(tenantId),
  });

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

  const addItem = (pick: CatalogPartPick) => {
    if (!pick.itemId) return;
    const itemId = pick.itemId;
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === itemId);
      if (existing) {
        return prev.map((l) =>
          l.itemId === itemId ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          itemId,
          sku: pick.sku,
          name: pick.name,
          quantity: 1,
          unitCost: pick.costPrice,
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
            <MenuSelect
              value={form.supplierId}
              placeholder="Select supplier…"
              onChange={(supplierId) => setForm({ ...form, supplierId })}
              options={[
                { value: "", label: "Select supplier…" },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
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
            isLoading={mutation.isPending}
            loadingText="Saving…"
            onClick={() => mutation.mutate()}
            disabled={lines.length === 0 || !form.supplierId}
          >
            Save Purchase
          </Button>
        </div>
      </div>
    </div>
  );
}
