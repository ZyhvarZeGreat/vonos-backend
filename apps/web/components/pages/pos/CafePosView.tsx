"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator,
  Info,
  Wallet,
} from "lucide-react";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { getCatalog } from "@/lib/api/catalog";
import {
  getCatalogBrandsPage,
  getCatalogCategoriesPage,
} from "@/lib/api/catalogMeta";
import { getCustomersForPicker } from "@/lib/api/customers";
import { getExpenseCategoriesForPicker } from "@/lib/api/expenses";
import { createSale, getSaleInvoiceUrl } from "@/lib/api/sales";
import { getPaymentAccounts } from "@/lib/api/paymentAccounts";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import {
  assertBusinessLocationSelected,
  useEntitySaleLocationOptions,
} from "@/lib/hooks/useBusinessLocationOptions";
import { toast } from "@/stores/toastStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { computePosTotals } from "@/lib/pos/posTotals";
import { usePosCartStore } from "@/stores/posCartStore";
import { PosCartPanel } from "./PosCartPanel";
import {
  PosProductGrid,
  toCartPick,
  type PosGridItem,
} from "./PosProductGrid";
import { PosFilterDrawer, type PosFilterGroup } from "./PosFilterDrawer";
import {
  PosPaymentModal,
  newPaymentRow,
  type PosPaymentRow,
} from "./PosPaymentModal";
import { PosConfirmModal } from "./PosConfirmModal";
import { PosRecentTransactions } from "./PosRecentTransactions";
import { PosAdjustmentModal } from "./PosAdjustmentModal";
import { PosDraftsModal } from "./PosDraftsModal";
import { PosReturnModal } from "./PosReturnModal";
import { PosCalculator } from "./PosCalculator";
import { PosQuickAddProductModal } from "./PosQuickAddProductModal";
import { PosExpenseModal } from "./PosExpenseModal";
import { PosRegisterModal } from "./PosRegisterModal";
import { getCurrentRegister } from "@/lib/api/cashRegister";

const GRID_PAGE_SIZE = 60;

function useDebounced(value: string, delayMs = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function toGridItem(row: {
  id: string;
  sku: string;
  name: string;
  imageUrl?: string | null;
  sellPrice: number | null;
  costPrice?: number | null;
  unit?: string | null;
  quantity?: number | null;
  availableQuantity?: number | null;
}): PosGridItem {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    imageUrl: row.imageUrl,
    sellPrice: row.sellPrice,
    costPrice: row.costPrice,
    unit: row.unit,
    stockQty: row.availableQuantity ?? row.quantity ?? 0,
  };
}

export function CafePosView() {
  const { tenantId, config } = useRouteTenant();
  const now = useNow();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [quickProductOpen, setQuickProductOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [adjustment, setAdjustment] = useState<null | "discount" | "tax">(null);
  const [confirmIntent, setConfirmIntent] = useState<null | "cash" | "card" | "draft">(null);

  const { required: locationRequired, defaultCode } =
    useEntitySaleLocationOptions(config);

  const debouncedSearch = useDebounced(search);

  const gridQuery = useQuery({
    queryKey: ["pos-grid", tenantId, debouncedSearch, category, brand],
    enabled: Boolean(tenantId),
    queryFn: () =>
      getCatalog(tenantId!, {
        search: debouncedSearch || undefined,
        category: category ?? undefined,
        brandName: brand ?? undefined,
        limit: GRID_PAGE_SIZE,
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["pos-categories", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
    queryFn: () => getCatalogCategoriesPage(tenantId!, undefined, 100),
  });

  const brandsQuery = useQuery({
    queryKey: ["pos-brands", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
    queryFn: () => getCatalogBrandsPage(tenantId!, undefined, 100),
  });

  const customersQuery = useQuery({
    queryKey: ["pos-customers", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
    queryFn: () => getCustomersForPicker(tenantId!),
  });

  const accountsQuery = useQuery({
    queryKey: ["pos-payment-accounts", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 60_000,
    queryFn: () => getPaymentAccounts(tenantId!, { openOnly: true }),
  });

  const registerQuery = useQuery({
    queryKey: ["pos-register", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 15_000,
    queryFn: () => getCurrentRegister(tenantId!),
  });
  const register = registerQuery.data ?? null;

  const expenseCategoriesQuery = useQuery({
    queryKey: ["pos-expense-categories", tenantId],
    enabled: Boolean(tenantId) && expenseOpen,
    staleTime: 5 * 60_000,
    queryFn: () => getExpenseCategoriesForPicker(tenantId!),
  });

  const categoryGroups: PosFilterGroup[] = useMemo(() => {
    const rows = categoriesQuery.data?.items ?? [];
    const childrenByParent = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.parentId) continue;
      const list = childrenByParent.get(row.parentId) ?? [];
      list.push(row.name);
      childrenByParent.set(row.parentId, list);
    }
    return rows
      .filter((row) => !row.parentId)
      .map((row) => ({ name: row.name, children: childrenByParent.get(row.id) ?? [] }));
  }, [categoriesQuery.data]);

  const brandGroups: PosFilterGroup[] = useMemo(() => {
    const rows = brandsQuery.data?.items ?? [];
    if (rows.length === 0) return [];
    return [{ name: "Brands", children: rows.map((row) => row.name) }];
  }, [brandsQuery.data]);

  const gridItems: PosGridItem[] = useMemo(
    () => (gridQuery.data ?? []).map(toGridItem),
    [gridQuery.data],
  );

  const lines = usePosCartStore((s) => s.lines);
  const discount = usePosCartStore((s) => s.discount);
  const orderTax = usePosCartStore((s) => s.orderTax);
  const shipping = usePosCartStore((s) => s.shipping);
  const customerId = usePosCartStore((s) => s.customerId);
  const addItem = usePosCartStore((s) => s.addItem);
  const clearCart = usePosCartStore((s) => s.clearCart);
  const setDiscount = usePosCartStore((s) => s.setDiscount);
  const setOrderTax = usePosCartStore((s) => s.setOrderTax);
  const totals = computePosTotals({ lines, discount, orderTax, shipping });

  const accounts = accountsQuery.data ?? [];
  const defaultAccountId = accounts[0]?.id ?? "";
  const locationCode = defaultCode ?? "";

  const checkout = useAppMutation({
    mutationFn: async (vars: {
      status: "final" | "draft";
      payments: PosPaymentRow[];
      saleNote?: string;
    }) => {
      if (!tenantId) throw new Error("No tenant selected");
      if (!register) throw new Error("Open the cash register before selling");
      assertBusinessLocationSelected(locationRequired, locationCode);
      if (lines.length === 0) throw new Error("Add at least one product");
      if (vars.status === "final" && totals.totalPayable <= 0) {
        throw new Error("Nothing to pay");
      }
      return createSale(tenantId, {
        customerId: customerId ?? undefined,
        locationCode: locationCode || undefined,
        status: vars.status,
        lines: lines.map((line) => ({
          itemId: line.itemId,
          sku: line.sku,
          name: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        discountAmount: totals.discount || undefined,
        taxAmount: totals.tax || undefined,
        notes: vars.saleNote?.trim() || undefined,
        payments:
          vars.status === "final"
            ? vars.payments.map((row) => ({
                amount: row.amount,
                method: row.method,
                accountId: row.accountId || undefined,
                note: row.note || undefined,
              }))
            : undefined,
      });
    },
    successMessage: (sale, vars) =>
      vars.status === "draft"
        ? `Draft ${sale.reference} saved`
        : `Sale ${sale.reference} completed`,
    invalidateKeys: [
      ["pos-recent-sales", tenantId],
      ["sales"],
      ["items"],
      ["catalog"],
      ["paymentAccounts"],
    ],
    onSuccess: async (sale, vars) => {
      clearCart();
      setPaymentOpen(false);
      setConfirmIntent(null);
      if (vars.status === "draft") return;
      try {
        const { path } = await getSaleInvoiceUrl(tenantId!, sale.id);
        window.open(path, "_blank", "noopener");
      } catch {
        /* receipt is best-effort */
      }
    },
  });

  const busy = checkout.isPending;

  function submitExpress(method: "cash" | "card") {
    checkout.mutate({
      status: "final",
      payments: [
        { amount: totals.totalPayable, method, accountId: defaultAccountId, note: "" },
      ],
    });
  }

  function submitDraft() {
    checkout.mutate({ status: "draft", payments: [] });
  }

  function printSale(sale: { id: string }) {
    if (!tenantId) return;
    void getSaleInvoiceUrl(tenantId, sale.id)
      .then(({ path }) => window.open(path, "_blank", "noopener"))
      .catch(() => toast.error("Could not open invoice"));
  }

  const dateLabel = now.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div className="cafe-pos flex h-[calc(100vh-6.5rem)] min-h-[32rem] flex-col gap-3 p-4">
      {/* Top bar — location, clock, till utilities (Phase 4 enables the icons). */}
      <div className="cafe-pos-toolbar flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card">
        <p className="text-sm text-foreground">
          <span className="font-semibold">Location:</span>{" "}
          <span className="ml-2">{config?.name ?? ""}</span>
        </p>
        <span className="ml-2 rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white tabular-nums">
          {dateLabel}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReturnOpen(true)}
            className="cafe-pos-btn cafe-pos-btn--dark"
            title="Sell return against an invoice"
          >
            Sell Return
          </button>
          <button
            type="button"
            onClick={() => setDraftsOpen(true)}
            className="cafe-pos-btn cafe-pos-btn--dark"
            title="Suspended sales / drafts"
          >
            Drafts
          </button>
          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className={register ? "cafe-pos-btn cafe-pos-btn--primary" : "cafe-pos-btn cafe-pos-btn--success"}
            title={register ? "Current register / close shift" : "Open a cash register"}
          >
            {register ? "Register Details" : "Open Register"}
          </button>
          {[
            { label: "Payment accounts", Icon: Wallet },
            { label: "About this till", Icon: Info },
          ].map(({ label, Icon }) => (
            <button
              key={label}
              type="button"
              disabled
              title={`${label} — not enabled yet`}
              aria-label={label}
              className="cafe-pos-icon-btn h-9 w-9"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setQuickProductOpen(true)}
            className="cafe-pos-btn cafe-pos-btn--dark"
            title="Quick add product"
          >
            + Product
          </button>
          <button
            type="button"
            onClick={() => setExpenseOpen(true)}
            className="cafe-pos-btn cafe-pos-btn--dark"
            title="Add expense"
          >
            Add Expense
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalculatorOpen((v) => !v)}
              aria-label="Calculator"
              title="Calculator"
              className="cafe-pos-icon-btn h-9 w-9"
            >
              <Calculator className="h-4 w-4" />
            </button>
            {calculatorOpen ? <PosCalculator onClose={() => setCalculatorOpen(false)} /> : null}
          </div>
        </div>
      </div>

      {/* Main panes */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <PosCartPanel
          search={search}
          onSearchChange={setSearch}
          customers={(customersQuery.data ?? []).map((c) => ({
            id: c.id,
            name: c.name,
          }))}
          totals={totals}
          onEditDiscount={() => setAdjustment("discount")}
          onEditTax={() => setAdjustment("tax")}
        />

        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCategoryOpen(true)}
              className="cafe-pos-btn cafe-pos-btn--primary cafe-pos-btn--lg flex-1"
            >
              Category{category ? `: ${category}` : ""}
            </button>
            <button
              type="button"
              onClick={() => setBrandOpen(true)}
              className="cafe-pos-btn cafe-pos-btn--primary cafe-pos-btn--lg flex-1"
            >
              Brands{brand ? `: ${brand}` : ""}
            </button>
          </div>
          {(category || brand) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {category ? (
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  className="cafe-pos-chip"
                >
                  ✕ {category}
                </button>
              ) : null}
              {brand ? (
                <button
                  type="button"
                  onClick={() => setBrand(null)}
                  className="cafe-pos-chip"
                >
                  ✕ {brand}
                </button>
              ) : null}
            </div>
          )}
          <div className="cafe-pos-grid-scroll min-h-0 flex-1 overflow-y-auto">
            <PosProductGrid
              items={gridItems}
              isLoading={gridQuery.isLoading}
              isError={gridQuery.isError}
              onRetry={() => gridQuery.refetch()}
              onAdd={(item) => {
                if (item.stockQty <= 0) {
                  toast.error(`${item.name} is out of stock`);
                  return;
                }
                addItem(toCartPick(item));
              }}
            />
          </div>
        </div>
      </div>

      {!register && !registerQuery.isLoading ? (
        <p className="cafe-pos-muted px-1 text-xs">
          Register closed — open the cash register (top bar) before taking payment.
        </p>
      ) : null}

      {/* Footer action bar */}
      <div className="cafe-pos-footerbar flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card">
        <button
          type="button"
          disabled={lines.length === 0 || busy || !register}
          title={!register ? "Open the cash register first" : undefined}
          onClick={() => setConfirmIntent("draft")}
          className="cafe-pos-btn cafe-pos-btn--dark"
        >
          Draft
        </button>
        <button
          type="button"
          disabled={lines.length === 0 || busy || !register}
          title={!register ? "Open the cash register first" : undefined}
          onClick={() => setConfirmIntent("card")}
          className="cafe-pos-btn cafe-pos-btn--dark"
        >
          Card
        </button>
        <button
          type="button"
          disabled={lines.length === 0 || busy || !register}
          title={!register ? "Open the cash register first" : undefined}
          onClick={() => setPaymentOpen(true)}
          className="cafe-pos-btn cafe-pos-btn--dark"
        >
          Multiple Pay
        </button>
        <button
          type="button"
          disabled={lines.length === 0 || busy || !register}
          title={!register ? "Open the cash register first" : undefined}
          onClick={() => setConfirmIntent("cash")}
          className="cafe-pos-btn cafe-pos-btn--success"
        >
          Cash
        </button>
        <button
          type="button"
          onClick={clearCart}
          disabled={lines.length === 0 || busy}
          className="cafe-pos-btn cafe-pos-btn--danger"
        >
          Cancel
        </button>
        <p className="ml-2 text-sm text-foreground">
          <span className="font-semibold">Total Payable:</span>{" "}
          <span className="text-lg font-bold tabular-nums">
            {formatCurrency(totals.totalPayable, "NGN")}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setRecentOpen(true)}
          className="cafe-pos-btn cafe-pos-btn--pill ml-auto"
        >
          Recent Transactions
        </button>
      </div>

      <PosFilterDrawer
        open={categoryOpen}
        title="Category"
        groups={categoryGroups}
        selected={category}
        onSelect={setCategory}
        onClose={() => setCategoryOpen(false)}
      />
      <PosFilterDrawer
        open={brandOpen}
        title="Brands"
        groups={brandGroups}
        selected={brand}
        onSelect={setBrand}
        onClose={() => setBrandOpen(false)}
      />

      {paymentOpen ? (
        <PosPaymentModal
          open={paymentOpen}
          totals={totals}
          accounts={accounts}
          initialRows={[newPaymentRow(totals.totalPayable, defaultAccountId)]}
          busy={busy}
          onClose={() => setPaymentOpen(false)}
          onConfirm={(rows, saleNote) =>
            checkout.mutate({ status: "final", payments: rows, saleNote })
          }
        />
      ) : null}

      <PosConfirmModal
        open={confirmIntent !== null}
        title={
          confirmIntent === "draft"
            ? "Save draft?"
            : confirmIntent === "card"
              ? "Complete card sale?"
              : "Complete cash sale?"
        }
        message={
          confirmIntent === "draft"
            ? `Save this ticket as a draft for later? ${formatCurrency(totals.totalPayable, "NGN")}`
            : `Take ${formatCurrency(totals.totalPayable, "NGN")} by ${
                confirmIntent === "card" ? "card" : "cash"
              } and complete the sale?`
        }
        confirmLabel={confirmIntent === "draft" ? "Save Draft" : "Complete Sale"}
        tone={confirmIntent === "draft" ? "primary" : "success"}
        busy={busy}
        onConfirm={() => {
          if (confirmIntent === "draft") submitDraft();
          else if (confirmIntent === "card") submitExpress("card");
          else submitExpress("cash");
        }}
        onClose={() => setConfirmIntent(null)}
      />

      {tenantId ? (
        <PosRecentTransactions
          open={recentOpen}
          tenantId={tenantId}
          onClose={() => setRecentOpen(false)}
          onPrint={(sale) => printSale(sale)}
        />
      ) : null}

      {tenantId ? (
        <PosDraftsModal
          open={draftsOpen}
          tenantId={tenantId}
          onClose={() => setDraftsOpen(false)}
          onResumed={() => setDraftsOpen(false)}
        />
      ) : null}

      {tenantId ? (
        <PosReturnModal
          open={returnOpen}
          tenantId={tenantId}
          onClose={() => setReturnOpen(false)}
          onDone={() => setReturnOpen(false)}
        />
      ) : null}

      {adjustment === "discount" ? (
        <PosAdjustmentModal
          open
          title="Discount"
          initial={discount}
          onClose={() => setAdjustment(null)}
          onSave={(value) => {
            setDiscount(value);
            setAdjustment(null);
          }}
        />
      ) : null}

      {adjustment === "tax" ? (
        <PosAdjustmentModal
          open
          title="Edit Order Tax"
          initial={orderTax}
          onClose={() => setAdjustment(null)}
          onSave={(value) => {
            setOrderTax(value);
            setAdjustment(null);
          }}
        />
      ) : null}

      {quickProductOpen && tenantId ? (
        <PosQuickAddProductModal
          open
          tenantId={tenantId}
          locationCode={locationCode}
          onClose={() => setQuickProductOpen(false)}
          onCreated={() => {
            setQuickProductOpen(false);
            void gridQuery.refetch();
          }}
        />
      ) : null}

      {tenantId ? (
        <PosRegisterModal
          open={registerOpen}
          tenantId={tenantId}
          locationCode={locationCode}
          register={register}
          onClose={() => setRegisterOpen(false)}
          onChanged={() => {
            setRegisterOpen(false);
            void registerQuery.refetch();
          }}
        />
      ) : null}

      {expenseOpen && tenantId ? (
        <PosExpenseModal
          open
          tenantId={tenantId}
          locationCode={locationCode}
          accounts={accounts}
          categories={(expenseCategoriesQuery.data ?? []).map((c) => ({
            id: c.id,
            name: c.name,
          }))}
          onClose={() => setExpenseOpen(false)}
          onCreated={() => setExpenseOpen(false)}
        />
      ) : null}
    </div>
  );
}
