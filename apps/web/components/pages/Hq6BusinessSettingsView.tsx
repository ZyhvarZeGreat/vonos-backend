"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Info, Search } from "lucide-react";
import type { Hq6BusinessSettings } from "@vonos/types";
import { updateTenantConfig } from "@/lib/api/tenants";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  applyHq6ModulesToEnabled,
  bool,
  defaultHq6BusinessSettings,
  HQ6_MODULE_KEYS,
  mergeBusinessSettingsDraft,
  str,
  type Hq6ModuleKey,
} from "@/lib/registries/hq6BusinessSettings";
import { cn } from "@/lib/utils/cn";
import { useTenantStore } from "@/stores/tenantStore";

const HQ6_SETTINGS_NAV = [
  { id: "business", label: "Business" },
  { id: "tax", label: "Tax", info: true },
  { id: "product", label: "Product" },
  { id: "contact", label: "Contact" },
  { id: "sale", label: "Sale" },
  { id: "pos", label: "POS" },
  { id: "display-screen", label: "Display Screen" },
  { id: "purchases", label: "Purchases" },
  { id: "payment", label: "Payment" },
  { id: "dashboard", label: "Dashboard" },
  { id: "system", label: "System" },
  { id: "prefixes", label: "Prefixes" },
  { id: "email-settings", label: "Email Settings" },
  { id: "sms-settings", label: "SMS Settings" },
  { id: "reward-point-settings", label: "Reward Point Settings" },
  { id: "modules", label: "Modules" },
  { id: "custom-labels", label: "Custom Labels" },
] as const;

type Hq6SettingsNavId = (typeof HQ6_SETTINGS_NAV)[number]["id"];

type TabKey = keyof Pick<
  Hq6BusinessSettings,
  | "business"
  | "tax"
  | "product"
  | "contact"
  | "sale"
  | "pos"
  | "displayScreen"
  | "purchases"
  | "payment"
  | "dashboard"
  | "system"
  | "prefixes"
  | "email"
  | "sms"
  | "rewardPoints"
>;

const MODULE_LABELS: Record<Hq6ModuleKey, string> = {
  purchases: "Purchases",
  addSale: "Add Sale",
  pos: "POS",
  stockTransfers: "Stock Transfers",
  stockAdjustment: "Stock Adjustment",
  expenses: "Expenses",
  account: "Account",
  tables: "Tables",
  modifiers: "Modifiers",
  serviceStaff: "Service staff",
  enableSubscription: "Enable Subscription",
  enableBookings: "Enable Bookings",
  kitchen: "Kitchen (For restaurants)",
  typesOfService: "Types of service",
};

const MODULE_INFO: Partial<Record<Hq6ModuleKey, boolean>> = {
  tables: true,
  modifiers: true,
  serviceStaff: true,
  typesOfService: true,
};

function InfoHint({ title }: { title?: string }) {
  return (
    <Info
      className="inline h-3.5 w-3.5 shrink-0 text-[var(--hq6-blue)]"
      aria-label={title ?? "More information"}
    />
  );
}

function Field({
  label,
  required,
  info,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  info?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("hq6-field", className)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {required ? <span className="text-[var(--hq6-danger)]">*</span> : null}
        {info ? <InfoHint /> : null}
      </span>
      {children}
    </label>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
  info,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  info?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-[#111827]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-[#d1d5db] text-[var(--hq6-blue)]"
      />
      <span className="inline-flex items-center gap-1">
        {label}
        {info ? <InfoHint /> : null}
      </span>
    </label>
  );
}

export function Hq6BusinessSettingsView() {
  const { tenantId, tenantName, tenantCode, config } = useRouteTenant();
  const setTenantConfig = useTenantStore((state) => state.setTenantConfig);
  const queryClient = useQueryClient();
  const [nav, setNav] = useState<Hq6SettingsNavId>("business");
  const [search, setSearch] = useState("");
  const [displayName, setDisplayName] = useState(
    config?.name ?? tenantName ?? "",
  );
  const [draft, setDraft] = useState<Hq6BusinessSettings>(() =>
    mergeBusinessSettingsDraft(
      defaultHq6BusinessSettings(tenantName || "Business", tenantCode),
      config?.businessSettings,
    ),
  );

  useEffect(() => {
    setDisplayName(config?.name ?? tenantName ?? "");
    setDraft(
      mergeBusinessSettingsDraft(
        defaultHq6BusinessSettings(
          config?.name ?? tenantName ?? "Business",
          tenantCode,
        ),
        config?.businessSettings,
      ),
    );
  }, [config?.businessSettings, config?.name, tenantCode, tenantName]);

  const filteredNav = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return HQ6_SETTINGS_NAV;
    return HQ6_SETTINGS_NAV.filter((item) =>
      item.label.toLowerCase().includes(q),
    );
  }, [search]);

  const setTab = (tab: TabKey, key: string, value: string | boolean) => {
    setDraft((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [key]: value },
    }));
  };

  const setModule = (key: Hq6ModuleKey, value: boolean) => {
    setDraft((prev) => ({
      ...prev,
      modules: { ...prev.modules, [key]: value },
    }));
  };

  const setLabelList = (
    group: keyof NonNullable<Hq6BusinessSettings["customLabels"]>,
    index: number,
    value: string,
  ) => {
    setDraft((prev) => {
      const current = [...(prev.customLabels?.[group] ?? [])] as Array<
        string | { label: string; required?: boolean }
      >;
      while (current.length <= index) {
        current.push(group === "sell" ? { label: "", required: false } : "");
      }
      if (group === "sell") {
        const row = current[index];
        const nextRow =
          typeof row === "object" && row
            ? { ...row, label: value }
            : { label: value, required: false };
        current[index] = nextRow;
      } else {
        current[index] = value;
      }
      return {
        ...prev,
        customLabels: { ...prev.customLabels, [group]: current },
      };
    });
  };

  const setSellRequired = (index: number, required: boolean) => {
    setDraft((prev) => {
      const sell = [...(prev.customLabels?.sell ?? [])];
      while (sell.length <= index) sell.push({ label: "", required: false });
      const row = sell[index] ?? { label: "", required: false };
      sell[index] = { ...row, required };
      return {
        ...prev,
        customLabels: { ...prev.customLabels, sell },
      };
    });
  };

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      const enabledModules = applyHq6ModulesToEnabled(
        config?.enabledModules ?? [],
        draft.modules,
      );
      return updateTenantConfig(tenantId, {
        name: displayName.trim() || undefined,
        businessSettings: draft,
        enabledModules,
      });
    },
    successMessage: "Settings updated",
    onSuccess: (updated) => {
      setTenantConfig(updated);
      void queryClient.invalidateQueries({ queryKey: ["tenantConfig", tenantId] });
    },
  });

  const t = (tab: TabKey, key: string, fallback = "") =>
    str(draft[tab], key, fallback);
  const b = (tab: TabKey, key: string, fallback = false) =>
    bool(draft[tab], key, fallback);

  return (
    <div className="hq6-page hq6-business-settings space-y-3">
      <section className="hq6-content-header">
        <h1>Business Settings</h1>
      </section>

      {/*
        HQ6 / AdminLTE layout (nav-stacked):
        LEFT  = vertical settings tabs only
        RIGHT = search + active section form
        BOTTOM (inside card) = Update Settings
      */}
      <div className="hq6-biz-settings-shell overflow-hidden rounded border border-[#d2d6de] bg-white">
        <div className="hq6-biz-settings-body flex min-h-[28rem] flex-col md:flex-row">
          <nav
            className="hq6-biz-settings-nav flex w-full shrink-0 flex-col border-b border-[#d2d6de] bg-[#fafafa] md:w-[13.5rem] md:border-b-0 md:border-r"
            aria-label="Business settings sections"
          >
            {filteredNav.map((item) => {
              const active = nav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setNav(item.id)}
                  className={cn(
                    "hq6-biz-settings-tab flex w-full items-center justify-start gap-1.5 border-0 border-b border-[#d2d6de] px-3 py-[0.65rem] text-left text-[13px] font-medium",
                    active
                      ? "hq6-biz-settings-tab-active bg-[#3c8dbc] text-white"
                      : "bg-white text-[#444] hover:bg-[#f4f4f4]",
                  )}
                >
                  <span>{item.label}</span>
                  {"info" in item && item.info ? (
                    <InfoHint />
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="hq6-biz-settings-main flex min-w-0 flex-1 flex-col">
            <div className="hq6-biz-settings-search m-3 mb-0 flex items-center gap-2 rounded border border-[#d2d6de] bg-white px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-[#9ca3af]" />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="hq6-biz-settings-content flex-1 p-4 pt-3 md:p-5 md:pt-4">
            {nav === "business" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Business Name:" required>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </Field>
                <Field label="Start Date:">
                  <input
                    value={t("business", "startDate", "01-01-2023")}
                    onChange={(e) => setTab("business", "startDate", e.target.value)}
                  />
                </Field>
                <Field label="Default profit percent:" required>
                  <input
                    value={t("business", "defaultProfitPercent", "0.00")}
                    onChange={(e) =>
                      setTab("business", "defaultProfitPercent", e.target.value)
                    }
                  />
                </Field>
                <Field label="Currency:" info>
                  <select
                    value={t("business", "currency", "NGN")}
                    onChange={(e) => setTab("business", "currency", e.target.value)}
                  >
                    <option value="NGN">Nigeria - Nairas(NGN) 🇳🇬</option>
                  </select>
                </Field>
                <Field label="Currency Symbol Placement:">
                  <select
                    value={t("business", "currencySymbolPlacement", "before")}
                    onChange={(e) =>
                      setTab("business", "currencySymbolPlacement", e.target.value)
                    }
                  >
                    <option value="before">Before amount</option>
                    <option value="after">After amount</option>
                  </select>
                </Field>
                <Field label="Time zone:">
                  <select
                    value={t("business", "timeZone", "Africa/Lagos")}
                    onChange={(e) => setTab("business", "timeZone", e.target.value)}
                  >
                    <option value="Africa/Lagos">Africa/Lagos</option>
                  </select>
                </Field>
                <Field label="Business logo:">
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*" className="text-sm" />
                  </div>
                </Field>
                <Field label="Financial year start month:">
                  <select
                    value={t("business", "financialYearStartMonth", "1")}
                    onChange={(e) =>
                      setTab("business", "financialYearStartMonth", e.target.value)
                    }
                  >
                    <option value="1">January</option>
                    <option value="4">April</option>
                  </select>
                </Field>
                <Field label="Stock Accounting Method:" required>
                  <select
                    value={t("business", "stockAccountingMethod", "fifo")}
                    onChange={(e) =>
                      setTab("business", "stockAccountingMethod", e.target.value)
                    }
                  >
                    <option value="fifo">FIFO (First In First Out)</option>
                    <option value="lifo">LIFO (Last In First Out)</option>
                  </select>
                </Field>
                <Field label="Transaction Edit Days:" required info>
                  <input
                    value={t("business", "transactionEditDays", "720")}
                    onChange={(e) =>
                      setTab("business", "transactionEditDays", e.target.value)
                    }
                  />
                </Field>
                <Field label="Date Format:" required>
                  <select
                    value={t("business", "dateFormat", "dd-mm-yyyy")}
                    onChange={(e) => setTab("business", "dateFormat", e.target.value)}
                  >
                    <option value="dd-mm-yyyy">dd-mm-yyyy</option>
                    <option value="mm-dd-yyyy">mm-dd-yyyy</option>
                    <option value="yyyy-mm-dd">yyyy-mm-dd</option>
                  </select>
                </Field>
                <Field label="Time Format:" required>
                  <select
                    value={t("business", "timeFormat", "24")}
                    onChange={(e) => setTab("business", "timeFormat", e.target.value)}
                  >
                    <option value="24">24 Hour</option>
                    <option value="12">12 Hour</option>
                  </select>
                </Field>
                <Field label="Currency precision:" required info>
                  <input
                    value={t("business", "currencyPrecision", "2")}
                    onChange={(e) =>
                      setTab("business", "currencyPrecision", e.target.value)
                    }
                  />
                </Field>
                <Field label="Quantity precision:" required info>
                  <input
                    value={t("business", "quantityPrecision", "2")}
                    onChange={(e) =>
                      setTab("business", "quantityPrecision", e.target.value)
                    }
                  />
                </Field>
              </div>
            ) : null}

            {nav === "tax" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Tax 1 Name:" info>
                  <input
                    placeholder="GST / VAT / Other"
                    value={t("tax", "tax1Name")}
                    onChange={(e) => setTab("tax", "tax1Name", e.target.value)}
                  />
                </Field>
                <Field label="Tax 1 No.:">
                  <input
                    placeholder="GST / VAT / Other number"
                    value={t("tax", "tax1No")}
                    onChange={(e) => setTab("tax", "tax1No", e.target.value)}
                  />
                </Field>
                <div />
                <Field label="Tax 2 Name:" info>
                  <input
                    placeholder="GST / VAT / Other"
                    value={t("tax", "tax2Name")}
                    onChange={(e) => setTab("tax", "tax2Name", e.target.value)}
                  />
                </Field>
                <Field label="Tax 2 No.:">
                  <input
                    placeholder="GST / VAT / Other number"
                    value={t("tax", "tax2No")}
                    onChange={(e) => setTab("tax", "tax2No", e.target.value)}
                  />
                </Field>
                <div className="flex items-end pb-1">
                  <CheckRow
                    label="Enable inline tax in purchase and sell"
                    checked={b("tax", "enableInlineTax")}
                    onChange={(v) => setTab("tax", "enableInlineTax", v)}
                  />
                </div>
              </div>
            ) : null}

            {nav === "product" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="SKU prefix:">
                  <input
                    value={t("product", "skuPrefix")}
                    onChange={(e) => setTab("product", "skuPrefix", e.target.value)}
                  />
                </Field>
                <Field label="Enable Product Expiry:" info>
                  <select
                    value={t("product", "enableProductExpiry", "add")}
                    onChange={(e) =>
                      setTab("product", "enableProductExpiry", e.target.value)
                    }
                  >
                    <option value="add">Add item expiry</option>
                    <option value="off">Disabled</option>
                  </select>
                </Field>
                <div />
                <Field label="Default Unit:" info>
                  <select
                    value={t("product", "defaultUnit", "sng")}
                    onChange={(e) => setTab("product", "defaultUnit", e.target.value)}
                  >
                    <option value="sng">Single (sng)</option>
                  </select>
                </Field>
                <Field label="On Product expiry:" info>
                  <select
                    value={t("product", "onProductExpiry", "keep")}
                    onChange={(e) =>
                      setTab("product", "onProductExpiry", e.target.value)
                    }
                  >
                    <option value="keep">Keep selling</option>
                    <option value="stop">Stop selling</option>
                  </select>
                </Field>
                <div className="space-y-3 sm:col-span-2 lg:col-span-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <CheckRow
                      label="Enable Brand"
                      checked={b("product", "enableBrand", true)}
                      onChange={(v) => setTab("product", "enableBrand", v)}
                      info
                    />
                    <CheckRow
                      label="Enable Category"
                      checked={b("product", "enableCategory", true)}
                      onChange={(v) => setTab("product", "enableCategory", v)}
                    />
                    <CheckRow
                      label="Enable Sub category"
                      checked={b("product", "enableSubCategory")}
                      onChange={(v) => setTab("product", "enableSubCategory", v)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <CheckRow
                      label="Enable Price & Tax info."
                      checked={b("product", "enablePriceTaxInfo", true)}
                      onChange={(v) => setTab("product", "enablePriceTaxInfo", v)}
                    />
                    <CheckRow
                      label="Enable Warranty"
                      checked={b("product", "enableWarranty")}
                      onChange={(v) => setTab("product", "enableWarranty", v)}
                    />
                    <CheckRow
                      label="Enable Secondary Unit"
                      checked={b("product", "enableSecondaryUnit")}
                      onChange={(v) => setTab("product", "enableSecondaryUnit", v)}
                      info
                    />
                  </div>
                  <CheckRow
                    label="Is product image required?"
                    checked={b("product", "isProductImageRequired")}
                    onChange={(v) => setTab("product", "isProductImageRequired", v)}
                  />
                </div>
              </div>
            ) : null}

            {nav === "contact" ? (
              <div className="grid max-w-md gap-4">
                <Field label="Default credit limit:">
                  <input
                    value={t("contact", "defaultCreditLimit", "10000")}
                    onChange={(e) =>
                      setTab("contact", "defaultCreditLimit", e.target.value)
                    }
                  />
                </Field>
              </div>
            ) : null}

            {nav === "sale" ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Default Sale Discount:">
                    <input
                      value={t("sale", "defaultSaleDiscount", "0.00")}
                      onChange={(e) =>
                        setTab("sale", "defaultSaleDiscount", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Default Sale Tax:">
                    <select
                      value={t("sale", "defaultSaleTax")}
                      onChange={(e) => setTab("sale", "defaultSaleTax", e.target.value)}
                    >
                      <option value="">None</option>
                    </select>
                  </Field>
                  <Field label="Sales Item Addition Method" info>
                    <select
                      value={t("sale", "salesItemAdditionMethod", "add")}
                      onChange={(e) =>
                        setTab("sale", "salesItemAdditionMethod", e.target.value)
                      }
                    >
                      <option value="add">Add item in new row</option>
                    </select>
                  </Field>
                  <Field label="Amount rounding method" info>
                    <select
                      value={t("sale", "amountRoundingMethod", "none")}
                      onChange={(e) =>
                        setTab("sale", "amountRoundingMethod", e.target.value)
                      }
                    >
                      <option value="none">None</option>
                    </select>
                  </Field>
                  <div className="flex items-end pb-1 sm:col-span-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <CheckRow
                        label="Sales price is minimum selling price"
                        checked={b("sale", "salesPriceIsMinimum")}
                        onChange={(v) => setTab("sale", "salesPriceIsMinimum", v)}
                        info
                      />
                      <CheckRow
                        label="Allow Overselling"
                        checked={b("sale", "allowOverselling", true)}
                        onChange={(v) => setTab("sale", "allowOverselling", v)}
                        info
                      />
                      <CheckRow
                        label="Enable Sales Order"
                        checked={b("sale", "enableSalesOrder")}
                        onChange={(v) => setTab("sale", "enableSalesOrder", v)}
                      />
                    </div>
                  </div>
                </div>
                <hr className="border-[var(--hq6-border)]" />
                <h3 className="text-sm font-semibold text-[#111827]">Commission Agent:</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Sales Commission Agent:" info>
                    <select
                      value={t("sale", "salesCommissionAgent", "disable")}
                      onChange={(e) =>
                        setTab("sale", "salesCommissionAgent", e.target.value)
                      }
                    >
                      <option value="disable">Disable</option>
                      <option value="logged">Logged in user</option>
                    </select>
                  </Field>
                  <Field label="Commission Calculation Type:" info>
                    <select
                      value={t("sale", "commissionCalculationType", "invoice")}
                      onChange={(e) =>
                        setTab("sale", "commissionCalculationType", e.target.value)
                      }
                    >
                      <option value="invoice">Invoice value</option>
                      <option value="payment">Payment Received</option>
                    </select>
                  </Field>
                  <div className="flex items-end pb-1">
                    <CheckRow
                      label="Is commission agent required"
                      checked={b("sale", "commissionAgentRequired")}
                      onChange={(v) => setTab("sale", "commissionAgentRequired", v)}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {nav === "pos" ? (
              <div className="space-y-6">
                <CheckRow
                  label="Add keyboard shortcuts"
                  checked={b("pos", "addKeyboardShortcuts")}
                  onChange={(v) => setTab("pos", "addKeyboardShortcuts", v)}
                />
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-[#111827]">POS settings:</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(
                      [
                        ["disableMultiplePay", "Disable Multiple Pay"],
                        ["disableDraft", "Disable Draft"],
                        ["disableExpressCheckout", "Disable Express Checkout"],
                        ["dontShowProductSuggestion", "Don't show product suggestion"],
                        ["dontShowRecentTransactions", "Don't show recent transactions"],
                        ["disableDiscount", "Disable Discount"],
                        ["disableOrderTax", "Disable Order Tax"],
                        ["disableCreditSaleButton", "Disable Credit Sale Button"],
                        [
                          "showBillingAddressAboveServiceStaff",
                          "Show billing address above service staff",
                        ],
                        ["disableQuantity", "Disable Quantity"],
                        ["isServiceStaffRequired", "Is service staff required"],
                        ["disableQuotation", "Disable quotation"],
                        ["showInvoiceScheme", "Show invoice scheme"],
                        ["showInvoiceLayoutDropdown", "Show invoice layout dropdown"],
                        ["printInvoiceOnSuspend", "Print Invoice on suspend"],
                        [
                          "showPricingOnProductSuggestion",
                          "Show pricing on product suggestion tooltip",
                        ],
                      ] as const
                    ).map(([key, label]) => (
                      <CheckRow
                        key={key}
                        label={label}
                        checked={b("pos", key)}
                        onChange={(v) => setTab("pos", key, v)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-[#111827]">
                    Weighing Scale barcode Setting:
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Barcode prefix:">
                      <input
                        value={t("pos", "barcodePrefix")}
                        onChange={(e) => setTab("pos", "barcodePrefix", e.target.value)}
                      />
                    </Field>
                    <Field label="Product sku length:">
                      <input
                        value={t("pos", "productSkuLength", "5")}
                        onChange={(e) =>
                          setTab("pos", "productSkuLength", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Quantity integer part length:">
                      <input
                        value={t("pos", "qtyIntegerLength", "4")}
                        onChange={(e) =>
                          setTab("pos", "qtyIntegerLength", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Quantity fractional part length:">
                      <input
                        value={t("pos", "qtyFractionalLength", "3")}
                        onChange={(e) =>
                          setTab("pos", "qtyFractionalLength", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ) : null}

            {nav === "display-screen" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Customer display screen heading:">
                  <input
                    value={t("displayScreen", "heading", "Welcome")}
                    onChange={(e) => setTab("displayScreen", "heading", e.target.value)}
                  />
                </Field>
                <Field label="Customer display screen sub heading:">
                  <input
                    value={t("displayScreen", "subHeading")}
                    onChange={(e) =>
                      setTab("displayScreen", "subHeading", e.target.value)
                    }
                  />
                </Field>
                <CheckRow
                  label="Show quote to customers"
                  checked={b("displayScreen", "showQuoteToCustomers", true)}
                  onChange={(v) => setTab("displayScreen", "showQuoteToCustomers", v)}
                />
              </div>
            ) : null}

            {nav === "purchases" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <CheckRow
                  label="Enable editing product price from purchase screen"
                  checked={b("purchases", "enableEditProductPrice", true)}
                  onChange={(v) => setTab("purchases", "enableEditProductPrice", v)}
                  info
                />
                <CheckRow
                  label="Enable Purchase Status"
                  checked={b("purchases", "enablePurchaseStatus", true)}
                  onChange={(v) => setTab("purchases", "enablePurchaseStatus", v)}
                  info
                />
                <CheckRow
                  label="Enable Lot number"
                  checked={b("purchases", "enableLotNumber")}
                  onChange={(v) => setTab("purchases", "enableLotNumber", v)}
                  info
                />
                <CheckRow
                  label="Enable purchase order"
                  checked={b("purchases", "enablePurchaseOrder", true)}
                  onChange={(v) => setTab("purchases", "enablePurchaseOrder", v)}
                />
                <CheckRow
                  label="Enable Purchase Requisition"
                  checked={b("purchases", "enablePurchaseRequisition")}
                  onChange={(v) => setTab("purchases", "enablePurchaseRequisition", v)}
                  info
                />
              </div>
            ) : null}

            {nav === "payment" ? (
              <div className="space-y-4">
                <Field label="Cash Denominations:" info className="max-w-xl">
                  <input
                    value={t("payment", "cashDenominations")}
                    onChange={(e) =>
                      setTab("payment", "cashDenominations", e.target.value)
                    }
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Enable cash denomination on:">
                    <select
                      value={t("payment", "enableCashDenominationOn", "pos")}
                      onChange={(e) =>
                        setTab("payment", "enableCashDenominationOn", e.target.value)
                      }
                    >
                      <option value="pos">POS screen</option>
                      <option value="all">All payment screens</option>
                    </select>
                  </Field>
                  <div className="space-y-2">
                    <Field label="Enable cash denomination for payment methods:">
                      <input
                        value={t("payment", "cashDenominationPaymentMethods", "cash")}
                        onChange={(e) =>
                          setTab(
                            "payment",
                            "cashDenominationPaymentMethods",
                            e.target.value,
                          )
                        }
                      />
                    </Field>
                    <CheckRow
                      label="Strict check"
                      checked={b("payment", "strictCheck")}
                      onChange={(v) => setTab("payment", "strictCheck", v)}
                      info
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {nav === "dashboard" ? (
              <div className="max-w-md">
                <Field label="View Stock Expiry Alert For:" required>
                  <div className="flex overflow-hidden rounded-md border border-[var(--hq6-border)]">
                    <input
                      className="!rounded-none !border-0 flex-1"
                      value={t("dashboard", "stockExpiryAlertDays", "365")}
                      onChange={(e) =>
                        setTab("dashboard", "stockExpiryAlertDays", e.target.value)
                      }
                    />
                    <span className="flex items-center bg-[#f3f4f6] px-3 text-sm text-[#6b7280]">
                      Days
                    </span>
                  </div>
                </Field>
              </div>
            ) : null}

            {nav === "system" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Theme Color:">
                  <select
                    value={t("system", "themeColor", "green")}
                    onChange={(e) => setTab("system", "themeColor", e.target.value)}
                  >
                    <option value="green">Green</option>
                    <option value="blue">Blue</option>
                    <option value="black">Black</option>
                  </select>
                </Field>
                <Field label="Default datatable page entries:">
                  <select
                    value={t("system", "defaultDatatableEntries", "50")}
                    onChange={(e) =>
                      setTab("system", "defaultDatatableEntries", e.target.value)
                    }
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </Field>
                <div className="flex items-end pb-1">
                  <CheckRow
                    label="Show help text:"
                    checked={b("system", "showHelpText", true)}
                    onChange={(v) => setTab("system", "showHelpText", v)}
                  />
                </div>
              </div>
            ) : null}

            {nav === "prefixes" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["purchase", "Purchase Order Ref. No. Prefix:"],
                    ["purchaseOrder", "Purchase Order Prefix"],
                    ["purchaseReturn", "Purchase Return Prefix"],
                    ["stockTransfer", "Stock Transfer Prefix"],
                    ["stockAdjustment", "Stock Adjustment Prefix"],
                    ["sellReturn", "Sell Return Prefix"],
                    ["expenses", "Expense Prefix"],
                    ["contacts", "Contacts Prefix"],
                    ["purchasePayment", "Purchase Payment Prefix"],
                    ["sellPayment", "Sell Payment Prefix"],
                    ["expensePayment", "Expense Payment Prefix"],
                    ["businessLocation", "Business Location Prefix"],
                    ["username", "Username Prefix"],
                    ["subscriptionNo", "Subscription No. Prefix"],
                    ["draft", "Draft Prefix"],
                    ["salesOrder", "Sales Order Prefix"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      value={t("prefixes", key)}
                      onChange={(e) => setTab("prefixes", key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            ) : null}

            {nav === "email-settings" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["mailDriver", "Mail Driver"],
                    ["mailHost", "Mail Host"],
                    ["mailPort", "Mail Port"],
                    ["mailUsername", "Mail Username"],
                    ["mailPassword", "Mail Password"],
                    ["mailEncryption", "Mail Encryption"],
                    ["mailFromAddress", "Mail From Address"],
                    ["mailFromName", "Mail From Name"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={`${label}:`}>
                    <input
                      type={key === "mailPassword" ? "password" : "text"}
                      value={t("email", key)}
                      onChange={(e) => setTab("email", key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            ) : null}

            {nav === "sms-settings" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="SMS Service:">
                  <select
                    value={t("sms", "smsService", "nexmo")}
                    onChange={(e) => setTab("sms", "smsService", e.target.value)}
                  >
                    <option value="nexmo">Nexmo</option>
                    <option value="twilio">Twilio</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                {(
                  [
                    ["smsUrl", "SMS URL"],
                    ["sendToParamName", "Send to parameter name"],
                    ["messageParamName", "Message parameter name"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={`${label}:`}>
                    <input
                      value={t("sms", key)}
                      onChange={(e) => setTab("sms", key, e.target.value)}
                    />
                  </Field>
                ))}
                <Field label="Request Method:">
                  <select
                    value={t("sms", "requestMethod", "post")}
                    onChange={(e) => setTab("sms", "requestMethod", e.target.value)}
                  >
                    <option value="post">POST</option>
                    <option value="get">GET</option>
                  </select>
                </Field>
              </div>
            ) : null}

            {nav === "reward-point-settings" ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-end pb-1">
                    <CheckRow
                      label="Enable Reward Point"
                      checked={b("rewardPoints", "enableRewardPoint", true)}
                      onChange={(v) => setTab("rewardPoints", "enableRewardPoint", v)}
                    />
                  </div>
                  <Field label="Reward Point Display Name:">
                    <input
                      value={t("rewardPoints", "displayName")}
                      onChange={(e) =>
                        setTab("rewardPoints", "displayName", e.target.value)
                      }
                    />
                  </Field>
                </div>
                <h3 className="text-sm font-semibold text-[#111827]">
                  Earning Points Settings
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Amount spend for unit point:" info>
                    <input
                      value={t("rewardPoints", "amountSpendForUnitPoint", "1000.00")}
                      onChange={(e) =>
                        setTab("rewardPoints", "amountSpendForUnitPoint", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Minimum order total to earn reward:" info>
                    <input
                      value={t("rewardPoints", "minOrderTotalToEarn", "1.00")}
                      onChange={(e) =>
                        setTab("rewardPoints", "minOrderTotalToEarn", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Maximum points per order:" info>
                    <input
                      value={t("rewardPoints", "maxPointsPerOrder", "10")}
                      onChange={(e) =>
                        setTab("rewardPoints", "maxPointsPerOrder", e.target.value)
                      }
                    />
                  </Field>
                </div>
                <h3 className="text-sm font-semibold text-[#111827]">
                  Redeem Points Settings
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Redeem amount per unit point:" info>
                    <input
                      value={t("rewardPoints", "redeemAmountPerUnitPoint", "0.10")}
                      onChange={(e) =>
                        setTab(
                          "rewardPoints",
                          "redeemAmountPerUnitPoint",
                          e.target.value,
                        )
                      }
                    />
                  </Field>
                  <Field label="Minimum order total to redeem points:" info>
                    <input
                      value={t("rewardPoints", "minOrderTotalToRedeem", "100000.00")}
                      onChange={(e) =>
                        setTab("rewardPoints", "minOrderTotalToRedeem", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Minimum redeem point:" info>
                    <input
                      value={t("rewardPoints", "minRedeemPoint", "1000")}
                      onChange={(e) =>
                        setTab("rewardPoints", "minRedeemPoint", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Maximum redeem point per order:" info>
                    <input
                      value={t("rewardPoints", "maxRedeemPointPerOrder")}
                      onChange={(e) =>
                        setTab("rewardPoints", "maxRedeemPointPerOrder", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Reward Point expiry period:" info>
                    <div className="flex gap-2">
                      <input
                        className="flex-1"
                        value={t("rewardPoints", "expiryPeriod")}
                        onChange={(e) =>
                          setTab("rewardPoints", "expiryPeriod", e.target.value)
                        }
                      />
                      <select
                        className="w-28"
                        value={t("rewardPoints", "expiryPeriodUnit", "year")}
                        onChange={(e) =>
                          setTab("rewardPoints", "expiryPeriodUnit", e.target.value)
                        }
                      >
                        <option value="year">Year</option>
                        <option value="month">Month</option>
                        <option value="day">Day</option>
                      </select>
                    </div>
                  </Field>
                </div>
              </div>
            ) : null}

            {nav === "modules" ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#111827]">
                  Enable/Disable Modules
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {HQ6_MODULE_KEYS.map((key) => (
                    <CheckRow
                      key={key}
                      label={MODULE_LABELS[key]}
                      checked={Boolean(draft.modules?.[key])}
                      onChange={(v) => setModule(key, v)}
                      info={MODULE_INFO[key]}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {nav === "custom-labels" ? (
              <div className="space-y-6">
                {(
                  [
                    ["payments", "Labels for custom payments", 7],
                    ["contact", "Labels for contact custom fields", 10],
                    ["product", "Labels for product custom fields", 6],
                    ["location", "Labels for location custom fields", 3],
                    ["user", "Labels for user custom fields", 3],
                    ["purchase", "Labels for purchase custom fields", 3],
                    ["purchaseShipping", "Labels for purchase shipping custom fields", 3],
                    ["saleShipping", "Labels for sale shipping custom fields", 3],
                    ["typesOfService", "Labels for types of service custom fields", 3],
                  ] as const
                ).map(([group, title, count]) => (
                  <div key={group}>
                    <h3 className="mb-3 text-sm font-semibold text-[#111827]">{title}</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: count }, (_, i) => (
                        <Field key={i} label={`Custom Field ${i + 1}`}>
                          <input
                            placeholder={`Custom Field ${i + 1}`}
                            value={String(
                              (draft.customLabels?.[group] as string[] | undefined)?.[
                                i
                              ] ?? "",
                            )}
                            onChange={(e) => setLabelList(group, i, e.target.value)}
                          />
                        </Field>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-[#111827]">
                    Labels for sell custom fields
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }, (_, i) => {
                      const row = draft.customLabels?.sell?.[i];
                      return (
                        <div key={i} className="space-y-2">
                          <Field label={`Custom Field ${i + 1}`}>
                            <input
                              placeholder={`Custom Field ${i + 1}`}
                              value={row?.label ?? ""}
                              onChange={(e) => setLabelList("sell", i, e.target.value)}
                            />
                          </Field>
                          <CheckRow
                            label="Is required"
                            checked={Boolean(row?.required)}
                            onChange={(v) => setSellRequired(i, v)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
            </div>

            <div className="flex justify-center border-t border-[#d2d6de] bg-white px-4 py-4">
              <button
                type="button"
                className="hq6-biz-settings-update min-w-[11rem] rounded bg-[#dd4b39] px-8 py-2.5 text-[15px] font-semibold text-white hover:bg-[#c23321] disabled:opacity-70"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Updating…" : "Update Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="hq6-footer">
        Vonos Autos Head Office - V6.8 | Copyright © {new Date().getFullYear()} All rights
        reserved.
      </p>
    </div>
  );
}
