"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import {
  ProductItemSearch,
  type CatalogPartPick,
} from "@/components/molecules/ProductItemSearch";
import { createSale } from "@/lib/api/sales";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import {
  assertBusinessLocationSelected,
  useBusinessLocationOptions,
} from "@/lib/hooks/useBusinessLocationOptions";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { Hq6PosOpenRegisterView } from "@/components/pages/Hq6PosTerminalView";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface SaleLineDraft {
  key: string;
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

function lineSubtotal(line: SaleLineDraft): number {
  return Math.max(0, line.quantity * line.unitPrice);
}

export function PosTerminalView() {
  const isHq6 = useIsVaHq6();
  if (isHq6) return <Hq6PosOpenRegisterView />;
  return <PosTerminalViewBody />;
}

function PosTerminalViewBody() {
  const router = useRouter();
  const { tenantId, tenantCode, config } = useRouteTenant();
  const { options: businessLocationOptions, required: locationRequired } =
    useBusinessLocationOptions(config);
  const queryClient = useQueryClient();

  const [customerName, setCustomerName] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const showLocationField = (config?.businessLocations?.length ?? 0) > 0;
  const total = useMemo(
    () => lines.reduce((sum, line) => sum + lineSubtotal(line), 0),
    [lines],
  );

  const addLineFromItem = (pick: CatalogPartPick) => {
    if (!pick.itemId) return;
    const itemId = pick.itemId;
    setLines((prev) => {
      const existing = prev.find((row) => row.itemId === itemId);
      if (existing) {
        return prev.map((row) =>
          row.itemId === itemId
            ? { ...row, quantity: row.quantity + 1 }
            : row,
        );
      }
      return [
        ...prev,
        {
          key: itemId,
          itemId,
          sku: pick.sku,
          name: pick.name,
          quantity: 1,
          unitPrice: pick.sellPrice || pick.costPrice || 0,
        },
      ];
    });
  };

  const updateLine = (key: string, patch: Partial<SaleLineDraft>) => {
    setLines((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((row) => row.key !== key));
  };

  const resetCart = () => {
    setLines([]);
    setCustomerName("");
    setError(null);
  };

  const mutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      assertBusinessLocationSelected(locationRequired, locationCode);
      if (lines.length === 0) throw new Error("Add at least one product");
      const reference = `POS-${Date.now().toString(36).toUpperCase()}`;
      return createSale(tenantId, {
        reference,
        customerName: customerName.trim() || undefined,
        locationCode: locationCode.trim() || undefined,
        lines: lines.map((line) => ({
          itemId: line.itemId,
          sku: line.sku,
          name: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        payments: [{ amount: total, method: paymentMethod }],
      });
    },
    successMessage: "Sale completed",
    onSuccess: async (sale) => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["ledgerTablePage"] });
      await queryClient.invalidateQueries({ queryKey: ["ledgerSummary"] });
      resetCart();
      router.push(`/${tenantCode}/sales/${sale.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-semibold text-foreground">POS</h1>
        <p className="text-sm text-muted">Record a sale at the register</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <ProductItemSearch
              tenantId={tenantId}
              tenantCode={config?.code}
              retailOnly
              includeWarehouse
              allowCustom={false}
              onSelect={addLineFromItem}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border bg-[var(--color-surface-muted)] text-left text-muted">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium text-right">Subtotal</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-muted">
                      Search and add products to start a sale
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={line.key} className="border-b border-[var(--color-border-subtle)]">
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">{line.name}</div>
                        <div className="text-xs text-muted">{line.sku}</div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.key, {
                              quantity: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="w-16 rounded border border-border px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) =>
                            updateLine(line.key, {
                              unitPrice: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-24 rounded border border-border px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(lineSubtotal(line))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="text-muted hover:text-error"
                          aria-label="Remove line"
                          onClick={() => removeLine(line.key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-3 rounded-lg border border-border bg-card p-4">
          {showLocationField ? (
            <Select
              label="Business location"
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
              options={businessLocationOptions}
            />
          ) : null}
          <Input
            label="Customer"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Walk-in customer"
          />
          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: "cash", label: "Cash" },
              { value: "card", label: "Card" },
              { value: "transfer", label: "Bank transfer" },
            ]}
          />
          <div className="rounded-md bg-[var(--color-surface-muted)] px-3 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Items</span>
              <span className="font-medium text-foreground">{lines.length}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2">
              <span className="text-muted">Total</span>
              <span className="text-lg font-semibold text-foreground">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              isLoading={mutation.isPending}
              loadingText="Processing…"
              disabled={lines.length === 0}
              onClick={() => mutation.mutate()}
            >
              Complete sale
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={lines.length === 0}
              onClick={resetCart}
            >
              Clear cart
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
