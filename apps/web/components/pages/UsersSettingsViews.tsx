"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Info, Search } from "lucide-react";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { updateTenantConfig } from "@/lib/api/tenants";
import { linesToList, listToLines } from "@/lib/utils/catalogConfig";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useTenantStore } from "@/stores/tenantStore";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/stores/toastStore";

const SETTINGS_TABS = [
  { id: "branding", label: "Branding" },
  { id: "terminology", label: "Terminology" },
  { id: "catalog", label: "Catalog" },
  { id: "notifications", label: "Notifications" },
];

/** HQ6 business-settings vertical nav — matches hq6.vonosautomarket.com/business/settings */
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
  defaultChecked,
  info,
}: {
  label: string;
  defaultChecked?: boolean;
  info?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-[#111827]">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-[#d1d5db] text-[var(--hq6-blue)]"
      />
      <span className="inline-flex items-center gap-1">
        {label}
        {info ? <InfoHint /> : null}
      </span>
    </label>
  );
}

export function SettingsView() {
  const isHq6 = useIsVaHq6();
  if (isHq6) return <Hq6BusinessSettingsView />;
  return <DefaultSettingsView />;
}

/** HQ6 Business Settings — vertical tab layout from business/settings screenshots. */
function Hq6BusinessSettingsView() {
  const { tenantId, tenantName, config } = useRouteTenant();
  const setTenantConfig = useTenantStore((state) => state.setTenantConfig);
  const queryClient = useQueryClient();
  const [nav, setNav] = useState<Hq6SettingsNavId>("business");
  const [displayName, setDisplayName] = useState(config?.name ?? tenantName ?? "");
  const [search, setSearch] = useState("");
  const [profitPercent, setProfitPercent] = useState("0.00");

  useEffect(() => {
    setDisplayName(config?.name ?? tenantName ?? "");
  }, [config?.name, tenantName]);

  const filteredNav = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return HQ6_SETTINGS_NAV;
    return HQ6_SETTINGS_NAV.filter((item) => item.label.toLowerCase().includes(q));
  }, [search]);

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      return updateTenantConfig(tenantId, {
        name: displayName.trim() || undefined,
      });
    },
    successMessage: "Settings updated",
    onSuccess: (updated) => {
      setTenantConfig(updated);
      void queryClient.invalidateQueries({ queryKey: ["tenantConfig", tenantId] });
    },
  });

  const handleUpdate = () => {
    if (nav === "business") {
      saveMutation.mutate();
      return;
    }
    toast.success("Settings updated");
  };

  return (
    <div className="hq6-page hq6-business-settings">
      <section className="hq6-content-header">
        <h1>Business Settings</h1>
      </section>

      <div className="hq6-biz-settings-shell">
        <div className="hq6-biz-settings-search">
          <Search className="h-4 w-4 shrink-0 text-[#9ca3af]" />
          <input
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="hq6-biz-settings-body">
          <nav className="hq6-biz-settings-nav" aria-label="Business settings sections">
            {filteredNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setNav(item.id)}
                className={cn(
                  "hq6-biz-settings-tab",
                  nav === item.id && "hq6-biz-settings-tab-active",
                )}
              >
                <span>{item.label}</span>
                {"info" in item && item.info ? <InfoHint /> : null}
              </button>
            ))}
          </nav>

          <div className="hq6-biz-settings-content">
            {nav === "business" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Business Name:" required>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </Field>
                <Field label="Start Date:">
                  <input type="text" defaultValue="01-01-2023" />
                </Field>
                <Field label="Default profit percent:" required>
                  <input
                    value={profitPercent}
                    onChange={(e) => setProfitPercent(e.target.value)}
                  />
                </Field>
                <Field label="Currency:" info>
                  <select defaultValue="NGN">
                    <option value="NGN">Nigeria - Nairas(NGN) 🇳🇬</option>
                  </select>
                </Field>
                <Field label="Currency Symbol Placement:">
                  <select defaultValue="before">
                    <option value="before">Before amount</option>
                    <option value="after">After amount</option>
                  </select>
                </Field>
                <Field label="Time zone:">
                  <select defaultValue="Africa/Lagos">
                    <option value="Africa/Lagos">Africa/Lagos</option>
                  </select>
                </Field>
                <Field label="Business logo:">
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*" className="text-sm" />
                  </div>
                </Field>
                <Field label="Financial year start month:">
                  <select defaultValue="1">
                    <option value="1">January</option>
                    <option value="4">April</option>
                  </select>
                </Field>
                <Field label="Stock Accounting Method:" required>
                  <select defaultValue="fifo">
                    <option value="fifo">FIFO (First In First Out)</option>
                    <option value="lifo">LIFO (Last In First Out)</option>
                  </select>
                </Field>
              </div>
            ) : null}

            {nav === "tax" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Tax 1 Name:" info>
                  <input placeholder="GST / VAT / Other" defaultValue="" />
                </Field>
                <Field label="Tax 1 No.:">
                  <input placeholder="GST / VAT / Other number" defaultValue="" />
                </Field>
                <div />
                <Field label="Tax 2 Name:" info>
                  <input placeholder="GST / VAT / Other" defaultValue="" />
                </Field>
                <Field label="Tax 2 No.:">
                  <input placeholder="GST / VAT / Other number" defaultValue="" />
                </Field>
                <div className="flex items-end pb-1">
                  <CheckRow label="Enable inline tax in purchase and sell" />
                </div>
              </div>
            ) : null}

            {nav === "product" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="SKU prefix:">
                  <input defaultValue="VONOS AUTO-" />
                </Field>
                <Field label="Enable Product Expiry:" info>
                  <select defaultValue="add">
                    <option value="add">Add item expiry</option>
                    <option value="off">Disabled</option>
                  </select>
                </Field>
                <div />
                <Field label="Default Unit:" info>
                  <select defaultValue="sng">
                    <option value="sng">Single (sng)</option>
                  </select>
                </Field>
                <Field label="On Product expiry:" info>
                  <select defaultValue="keep">
                    <option value="keep">Keep selling</option>
                    <option value="stop">Stop selling</option>
                  </select>
                </Field>
                <div className="space-y-3 sm:col-span-2 lg:col-span-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <CheckRow label="Enable Brand" defaultChecked info />
                    <CheckRow label="Enable Category" defaultChecked />
                    <CheckRow label="Enable Sub category" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <CheckRow label="Enable Price & Tax info." defaultChecked />
                    <CheckRow label="Enable Warranty" />
                    <CheckRow label="Enable Secondary Unit" info />
                  </div>
                  <CheckRow label="Is product image required?" />
                </div>
              </div>
            ) : null}

            {nav === "contact" ? (
              <div className="grid max-w-md gap-4">
                <Field label="Default credit limit:">
                  <input defaultValue="10000" />
                </Field>
              </div>
            ) : null}

            {nav === "sale" ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Default Sale Discount:">
                    <input defaultValue="0.00" />
                  </Field>
                  <Field label="Default Sale Tax:">
                    <select defaultValue="">
                      <option value="">None</option>
                    </select>
                  </Field>
                  <Field label="Sales Item Addition Method" info>
                    <select defaultValue="add">
                      <option value="add">Add item in new row</option>
                    </select>
                  </Field>
                  <Field label="Amount rounding method" info>
                    <select defaultValue="none">
                      <option value="none">None</option>
                    </select>
                  </Field>
                  <div className="flex items-end pb-1 sm:col-span-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <CheckRow label="Sales price is minimum selling price" info />
                      <CheckRow label="Allow Overselling" defaultChecked info />
                      <CheckRow label="Enable Sales Order" />
                    </div>
                  </div>
                </div>
                <hr className="border-[var(--hq6-border)]" />
                <h3 className="text-sm font-semibold text-[#111827]">Commission Agent:</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Sales Commission Agent:" info>
                    <select defaultValue="disable">
                      <option value="disable">Disable</option>
                      <option value="logged">Logged in user</option>
                    </select>
                  </Field>
                  <Field label="Commission Calculation Type:" info>
                    <select defaultValue="invoice">
                      <option value="invoice">Invoice value</option>
                      <option value="payment">Payment Received</option>
                    </select>
                  </Field>
                  <div className="flex items-end pb-1">
                    <CheckRow label="Is commission agent required" />
                  </div>
                </div>
                <hr className="border-[var(--hq6-border)]" />
                <h3 className="text-sm font-semibold text-[#111827]">Payment Gateways:</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Payment Link:" info>
                    <select defaultValue="razorpay">
                      <option value="razorpay">Razorpay</option>
                      <option value="stripe">Stripe</option>
                    </select>
                  </Field>
                  <Field label="Razorpay Key ID:">
                    <input placeholder="Key ID" />
                  </Field>
                  <Field label="Razorpay Key Secret:">
                    <input placeholder="Key Secret" type="password" />
                  </Field>
                  <Field label="Stripe Public Key:">
                    <input placeholder="Public Key" />
                  </Field>
                  <Field label="Stripe Secret Key:">
                    <input placeholder="Secret Key" type="password" />
                  </Field>
                </div>
              </div>
            ) : null}

            {nav === "pos" ? (
              <div className="space-y-6">
                <CheckRow label="Add keyboard shortcuts" />
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-[#111827]">POS settings:</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <CheckRow label="Disable Multiple Pay" />
                    <CheckRow label="Disable Draft" />
                    <CheckRow label="Disable Express Checkout" />
                    <CheckRow label="Don't show product suggestion" />
                    <CheckRow label="Don't show recent transactions" />
                    <CheckRow label="Disable Discount" />
                    <CheckRow label="Disable Order Tax" />
                    <CheckRow label="Disable Credit Sale Button" />
                    <CheckRow label="Show billing address above service staff" />
                    <CheckRow label="Disable Quantity" />
                    <CheckRow label="Is service staff required" />
                    <CheckRow label="Disable quotation" />
                    <CheckRow label="Show invoice scheme" />
                    <CheckRow label="Show invoice layout dropdown" />
                    <CheckRow label="Print Invoice on suspend" />
                    <CheckRow label="Show pricing on product suggestion tooltip" />
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-[#111827]">
                    Weighing Scale barcode Setting:
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Barcode prefix:">
                      <input />
                    </Field>
                    <Field label="Product sku length:">
                      <input defaultValue="5" />
                    </Field>
                    <Field label="Quantity integer part length:">
                      <input defaultValue="4" />
                    </Field>
                    <Field label="Quantity fractional part length:">
                      <input defaultValue="3" />
                    </Field>
                  </div>
                </div>
              </div>
            ) : null}

            {nav === "display-screen" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Customer display screen heading:">
                  <input defaultValue="Welcome" />
                </Field>
                <Field label="Customer display screen sub heading:">
                  <input defaultValue="Thank you for shopping with us" />
                </Field>
                <CheckRow label="Show quote to customers" defaultChecked />
              </div>
            ) : null}

            {nav === "purchases" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <CheckRow
                  label="Enable editing product price from purchase screen"
                  defaultChecked
                  info
                />
                <CheckRow label="Enable Purchase Status" defaultChecked info />
                <CheckRow label="Enable Lot number" info />
                <CheckRow label="Enable purchase order" defaultChecked />
                <CheckRow label="Enable Purchase Requisition" info />
              </div>
            ) : null}

            {nav === "payment" ? (
              <div className="space-y-4">
                <Field label="Cash Denominations:" info className="max-w-xl">
                  <input defaultValue="5,10,20,50,100,200,500,1000" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Enable cash denomination on:">
                    <select defaultValue="pos">
                      <option value="pos">POS screen</option>
                      <option value="all">All payment screens</option>
                    </select>
                  </Field>
                  <div className="space-y-2">
                    <Field label="Enable cash denomination for payment methods:">
                      <input placeholder="cash" defaultValue="cash" />
                    </Field>
                    <CheckRow label="Strict check" info />
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
                      defaultValue="365"
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
                  <select defaultValue="green">
                    <option value="green">Green</option>
                    <option value="blue">Blue</option>
                    <option value="black">Black</option>
                  </select>
                </Field>
                <Field label="Default datatable page entries:">
                  <select defaultValue="50">
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </Field>
                <div className="flex items-end pb-1">
                  <CheckRow label="Show help text:" defaultChecked />
                </div>
              </div>
            ) : null}

            {nav === "prefixes" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["Purchase", ""],
                    ["Purchase Return", ""],
                    ["Purchase Requisition", ""],
                    ["Purchase Order", "PO"],
                    ["Stock Transfer", "ST"],
                    ["Stock Adjustment", ""],
                    ["Sell Return", ""],
                    ["Expenses", "EP"],
                    ["Contacts", ""],
                    ["Purchase Payment", ""],
                    ["Sell Payment", ""],
                    ["Expense Payment", ""],
                    ["Business Location", ""],
                    ["Username", ""],
                    ["Subscription No.", ""],
                    ["Draft", ""],
                    ["Sales Order", ""],
                  ] as const
                ).map(([label, value]) => (
                  <Field key={label} label={`${label}:`}>
                    <input defaultValue={value} />
                  </Field>
                ))}
              </div>
            ) : null}

            {nav === "email-settings" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Mail Driver:">
                    <select defaultValue="smtp">
                      <option value="smtp">SMTP</option>
                      <option value="sendmail">Sendmail</option>
                    </select>
                  </Field>
                  <Field label="Host:">
                    <input placeholder="smtp.mailtrap.io" />
                  </Field>
                  <Field label="Port:">
                    <input placeholder="2525" />
                  </Field>
                  <Field label="Username:">
                    <input />
                  </Field>
                  <Field label="Password:">
                    <input type="password" />
                  </Field>
                  <Field label="Encryption:">
                    <select defaultValue="tls">
                      <option value="tls">TLS</option>
                      <option value="ssl">SSL</option>
                      <option value="">None</option>
                    </select>
                  </Field>
                  <Field label="From Address:">
                    <input placeholder="noreply@example.com" />
                  </Field>
                  <Field label="From Name:">
                    <input placeholder="Vonos" />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="rounded-md bg-[var(--hq6-success)] px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => toast.info("Test email queued")}
                  >
                    Send test email
                  </button>
                </div>
              </div>
            ) : null}

            {nav === "sms-settings" ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="SMS Service:">
                    <select defaultValue="other">
                      <option value="other">Other</option>
                      <option value="nexmo">Nexmo</option>
                      <option value="twilio">Twilio</option>
                    </select>
                  </Field>
                  <Field label="Request Method:">
                    <select defaultValue="post">
                      <option value="post">POST</option>
                      <option value="get">GET</option>
                    </select>
                  </Field>
                  <Field label="Data Parameter Type:">
                    <select defaultValue="form">
                      <option value="form">Form params</option>
                      <option value="json">JSON</option>
                    </select>
                  </Field>
                  <Field label="URL:" className="sm:col-span-2 lg:col-span-3">
                    <input placeholder="https://" />
                  </Field>
                  <Field label="SEND TO parameter name:">
                    <input placeholder="to" />
                  </Field>
                  <Field label="Message parameter name:">
                    <input placeholder="message" />
                  </Field>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Headers:</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="contents">
                        <input placeholder="Header key" className="hq6-modal-input" />
                        <input placeholder="Header value" className="hq6-modal-input" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Parameters:</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div key={i} className="contents">
                        <input placeholder="Parameter key" className="hq6-modal-input" />
                        <input placeholder="Parameter value" className="hq6-modal-input" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="rounded-md bg-[var(--hq6-success)] px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => toast.info("Test SMS queued")}
                  >
                    Send test SMS
                  </button>
                </div>
              </div>
            ) : null}

            {nav === "reward-point-settings" ? (
              <div className="space-y-4">
                <div className="rounded-md border border-[var(--hq6-border)] bg-[#f9fafb] p-4 space-y-4">
                  <CheckRow label="Enable Reward Point" defaultChecked />
                  <Field label="Reward Point Display Name:" className="max-w-md">
                    <input defaultValue="Reward Point Display Name" />
                  </Field>
                  <h3 className="text-sm font-semibold">Earning Points Settings:</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Amount spend for unit point:" info>
                      <input defaultValue="1,000.00" />
                    </Field>
                    <Field label="Minimum order total to earn reward:" info>
                      <input defaultValue="1.00" />
                    </Field>
                    <Field label="Maximum points per order:" info>
                      <input defaultValue="10" />
                    </Field>
                  </div>
                </div>
                <div className="rounded-md border border-[var(--hq6-border)] bg-[#f9fafb] p-4 space-y-4">
                  <h3 className="text-sm font-semibold">Redeem Points Settings:</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Redeem amount per unit point:" info>
                      <input defaultValue="0.10" />
                    </Field>
                    <Field label="Minimum order total to redeem points:" info>
                      <input defaultValue="100,000.00" />
                    </Field>
                    <Field label="Minimum redeem point:" info>
                      <input defaultValue="1000" />
                    </Field>
                    <Field label="Maximum redeem point per order:" info>
                      <input />
                    </Field>
                    <Field label="Reward Point expiry period:" info>
                      <div className="flex gap-2">
                        <input className="flex-1" />
                        <select defaultValue="year" className="w-28">
                          <option value="year">Year</option>
                          <option value="month">Month</option>
                          <option value="day">Day</option>
                        </select>
                      </div>
                    </Field>
                  </div>
                </div>
              </div>
            ) : null}

            {nav === "modules" ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#111827]">Enable/Disable Modules</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <CheckRow label="Purchases" defaultChecked />
                  <CheckRow label="Add Sale" defaultChecked />
                  <CheckRow label="POS" defaultChecked />
                  <CheckRow label="Stock Transfers" />
                  <CheckRow label="Stock Adjustment" />
                  <CheckRow label="Expenses" defaultChecked />
                  <CheckRow label="Account" defaultChecked />
                  <CheckRow label="Tables" info />
                  <CheckRow label="Modifiers" info />
                  <CheckRow label="Service staff" defaultChecked info />
                  <CheckRow label="Enable Bookings" />
                  <CheckRow label="Kitchen (For restaurants)" />
                  <CheckRow label="Enable Subscription" />
                  <CheckRow label="Types of service" info />
                </div>
              </div>
            ) : null}

            {nav === "custom-labels" ? (
              <div className="space-y-6">
                {(
                  [
                    "Labels for custom payments",
                    "Labels for contact custom fields",
                    "Labels for product custom fields",
                    "Labels for location custom fields",
                    "Labels for user custom fields",
                    "Labels for purchase custom fields",
                    "Labels for purchase shipping custom fields",
                    "Labels for sell custom fields",
                    "Labels for sale shipping custom fields",
                    "Labels for types of service custom fields",
                  ] as const
                ).map((section) => (
                  <div key={section}>
                    <h3 className="mb-3 text-sm font-semibold text-[#111827]">{section}</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[1, 2, 3].map((n) => (
                        <Field key={n} label={`Custom Field ${n}`}>
                          <input placeholder={`Custom Field ${n}`} />
                        </Field>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          className="hq6-biz-settings-update"
          onClick={handleUpdate}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Updating…" : "Update Settings"}
        </button>
      </div>

      <p className="hq6-footer">
        Vonos Autos Head Office - V6.8 | Copyright © {new Date().getFullYear()} All rights
        reserved.
      </p>
    </div>
  );
}

function DefaultSettingsView() {
  const [activeTab, setActiveTab] = useState("branding");
  const { tenantId, tenantName, tenantCode, config } = useRouteTenant();
  const setTenantConfig = useTenantStore((state) => state.setTenantConfig);
  const queryClient = useQueryClient();
  const terminology = config?.terminology ?? {};
  const [displayName, setDisplayName] = useState(config?.name ?? tenantName ?? "");
  const [itemLabel, setItemLabel] = useState(terminology.item ?? "Item");
  const [inventoryLabel, setInventoryLabel] = useState(terminology.inventory ?? "Inventory");
  const [categoriesText, setCategoriesText] = useState(listToLines(config?.itemCategories));
  const [saveError, setSaveError] = useState<string | null>(null);

  const accent = tenantCode ? accentForTenantCode(tenantCode) : "#2563eb";
  const locationsHref = tenantCode ? `/${tenantCode}/locations` : "#";

  useEffect(() => {
    setDisplayName(config?.name ?? tenantName ?? "");
    setItemLabel(terminology.item ?? "Item");
    setInventoryLabel(terminology.inventory ?? "Inventory");
    setCategoriesText(listToLines(config?.itemCategories));
  }, [
    config?.itemCategories,
    config?.name,
    tenantName,
    terminology.inventory,
    terminology.item,
  ]);

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      return updateTenantConfig(tenantId, {
        name: displayName.trim() || undefined,
        terminology: {
          ...(itemLabel.trim() ? { item: itemLabel.trim() } : {}),
          ...(inventoryLabel.trim() ? { inventory: inventoryLabel.trim() } : {}),
        },
        ...(activeTab === "catalog"
          ? {
              itemCategories: linesToList(categoriesText),
            }
          : {}),
      });
    },
    successMessage: activeTab === "catalog" ? "Catalog saved" : "Settings saved",
    onSuccess: (updated) => {
      setTenantConfig(updated);
      setSaveError(null);
      void queryClient.invalidateQueries({ queryKey: ["tenantConfig", tenantId] });
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  return (
    <div className="space-y-6">
      {tenantCode ? <EntityColorBadge code={tenantCode} className="mb-2" /> : null}
      <p className="text-sm text-muted">
        Settings for <span className="font-medium text-foreground">{tenantName}</span>.
      </p>
      <div className="flex gap-1 rounded-lg border border-border bg-[var(--color-surface-muted)] p-1">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h3 className="text-base font-semibold text-foreground">
          {SETTINGS_TABS.find((t) => t.id === activeTab)?.label}
        </h3>
        <p className="mt-1 mb-6 text-sm text-muted">
          Tenant configuration — branding, terminology, and notification preferences.
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (activeTab === "notifications") return;
            saveMutation.mutate();
          }}
        >
          {activeTab === "branding" && (
            <>
              <Input
                label="Entity display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">Entity color</span>
                <div className="flex items-center gap-3">
                  <span
                    className="h-10 w-10 rounded-lg border border-border shadow-sm"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                  />
                  <div>
                    <p className="font-mono text-sm text-foreground">{accent}</p>
                    <p className="text-xs text-muted">
                      Applied to charts, finance, reports, and navigation for this entity.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
          {activeTab === "terminology" && (
            <>
              <Input
                label="Item label"
                value={itemLabel}
                onChange={(e) => setItemLabel(e.target.value)}
              />
              <Input
                label="Inventory label"
                value={inventoryLabel}
                onChange={(e) => setInventoryLabel(e.target.value)}
              />
            </>
          )}
          {activeTab === "catalog" && (
            <>
              <div className="rounded-lg border border-border bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-muted">
                Branches, counters, and bin slots are managed on the{" "}
                <Link href={locationsHref} className="font-medium text-foreground underline">
                  Locations
                </Link>{" "}
                page.
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Item categories</label>
                <p className="text-xs text-muted">One category per line.</p>
                <textarea
                  value={categoriesText}
                  onChange={(e) => setCategoriesText(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-sm text-foreground"
                />
              </div>
            </>
          )}
          {activeTab === "notifications" && (
            <p className="text-sm text-muted">
              Notification preferences will be configurable in a future release.
            </p>
          )}
          {saveError ? <p className="text-sm text-error">{saveError}</p> : null}
          {activeTab !== "notifications" ? (
            <Button type="submit" size="sm" isLoading={saveMutation.isPending} loadingText="Saving…">
              Save changes
            </Button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
