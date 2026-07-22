"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckSquare,
  FileText,
  Gift,
  Hourglass,
  Info,
  Mail,
  MapPin,
  Paperclip,
  Phone,
  ScrollText,
  Smartphone,
  UserRound,
  Wallet,
} from "lucide-react";
import type { ContactLedgerEntry } from "@vonos/types";
import { cn } from "@/lib/utils/cn";
import { formatHq6Currency, formatHq6Date } from "@/lib/utils/hq6Format";
import { toast } from "@/stores/toastStore";

export type Hq6ContactTab =
  | "ledger"
  | "purchases"
  | "stock_report"
  | "sales"
  | "documents"
  | "payments"
  | "rewards"
  | "activities";

export interface Hq6ContactSwitcherOption {
  id: string;
  label: string;
}

export interface Hq6ContactDetailModel {
  id: string;
  displayName: string;
  contactId?: string | null;
  typeLabel: string;
  address?: string | null;
  mobile?: string | null;
  taxNumber?: string | null;
  currency?: string;
  totalPurchase?: number;
  totalInvoice?: number;
  totalPaid?: number;
  balanceDue?: number;
}

const TAB_META: Array<{
  id: Hq6ContactTab;
  label: string;
  icon: ReactNode;
}> = [
  { id: "ledger", label: "Ledger", icon: <ScrollText className="h-3.5 w-3.5" /> },
  {
    id: "purchases",
    label: "Purchases",
    icon: <ArrowDownCircle className="h-3.5 w-3.5" />,
  },
  {
    id: "stock_report",
    label: "Stock Report",
    icon: <Hourglass className="h-3.5 w-3.5" />,
  },
  { id: "sales", label: "Sales", icon: <ArrowUpCircle className="h-3.5 w-3.5" /> },
  {
    id: "documents",
    label: "Documents & Note",
    icon: <Paperclip className="h-3.5 w-3.5" />,
  },
  { id: "payments", label: "Payments", icon: <Wallet className="h-3.5 w-3.5" /> },
  { id: "rewards", label: "Reward Points", icon: <Gift className="h-3.5 w-3.5" /> },
  {
    id: "activities",
    label: "Activities",
    icon: <CheckSquare className="h-3.5 w-3.5" />,
  },
];

const LEDGER_FORMATS = ["Format 1", "Format 2", "Format 3", "Format 4"] as const;

function yearRangeLabel(year = new Date().getFullYear()): string {
  return `01-01-${year} - 31-12-${year}`;
}

function yearRangeTo(year = new Date().getFullYear()): string {
  return `01-01-${year} To 31-12-${year}`;
}

/**
 * HQ6 “View Contact” subpage shell — matches Ultimate POS contact profile
 * (header, summary card, justified tabs, ledger layout).
 */
export function Hq6ContactDetailShell({
  contact,
  activeTab,
  onTabChange,
  switcherOptions,
  onSwitchContact,
  businessName = "Vonos Autos HQ",
  businessAddress = ["ARK GARDEN, KUBWA, FCT", "Nigeria, 901101"],
  ledger = [],
  ledgerLoading = false,
  salesPanel,
  purchasesPanel,
  stockReportPanel,
  documentsPanel,
}: {
  contact: Hq6ContactDetailModel;
  activeTab: Hq6ContactTab;
  onTabChange: (tab: Hq6ContactTab) => void;
  switcherOptions?: Hq6ContactSwitcherOption[];
  onSwitchContact?: (id: string) => void;
  businessName?: string;
  businessAddress?: string[];
  ledger?: ContactLedgerEntry[];
  ledgerLoading?: boolean;
  salesPanel?: ReactNode;
  purchasesPanel?: ReactNode;
  stockReportPanel?: ReactNode;
  documentsPanel?: ReactNode;
}) {
  const [ledgerFormat, setLedgerFormat] =
    useState<(typeof LEDGER_FORMATS)[number]>("Format 1");
  const [locationFilter, setLocationFilter] = useState("");
  const year = new Date().getFullYear();
  const rangeLabel = yearRangeLabel(year);
  const currency = contact.currency ?? "NGN";

  const switcherLabel = useMemo(() => {
    const idPart = contact.contactId ? ` - (${contact.contactId})` : "";
    return `${contact.displayName}${idPart}`;
  }, [contact.contactId, contact.displayName]);

  const money = (n: number | undefined) =>
    formatHq6Currency(n ?? 0, currency);

  return (
    <div className="hq6-contact-page">
      <div className="hq6-contact-topbar">
        <h1 className="hq6-contact-title">View Contact</h1>
        <select
          className="hq6-contact-switcher"
          value={contact.id}
          onChange={(e) => onSwitchContact?.(e.target.value)}
          aria-label="Select contact"
        >
          {(switcherOptions?.length
            ? switcherOptions
            : [{ id: contact.id, label: switcherLabel }]
          ).map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <section className="hq6-contact-summary">
        <div className="hq6-contact-summary-grid">
          <div>
            <h2 className="hq6-contact-profile-name">
              <UserRound className="h-5 w-5 shrink-0 text-[#3c8dbc]" />
              <span>{contact.displayName}</span>
              <small>{contact.typeLabel}</small>
            </h2>
            <div className="hq6-contact-meta-block">
              <div className="hq6-contact-meta-label">
                <MapPin className="h-3.5 w-3.5" /> Address
              </div>
              <p>{contact.address?.trim() || contact.displayName || "—"}</p>
            </div>
            <div className="hq6-contact-meta-block">
              <div className="hq6-contact-meta-label">
                <Smartphone className="h-3.5 w-3.5" /> Mobile
              </div>
              <p>{contact.mobile?.trim() || "NIL"}</p>
            </div>
          </div>
          <div>
            <div className="hq6-contact-meta-block">
              <div className="hq6-contact-meta-label">
                <Info className="h-3.5 w-3.5" /> Tax number
              </div>
              <p>{contact.taxNumber?.trim() || ""}</p>
            </div>
          </div>
        </div>
        <div className="hq6-contact-summary-actions">
          <button
            type="button"
            className="hq6-btn hq6-btn-purple"
            onClick={() => toast.info("Add Discount will use the discounts API next.")}
          >
            Add Discount
          </button>
        </div>
      </section>

      <div className="hq6-contact-tabs-card">
        <nav className="hq6-contact-tabs" aria-label="Contact sections">
          {TAB_META.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "hq6-contact-tab",
                activeTab === tab.id && "hq6-contact-tab-active",
              )}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="hq6-contact-tab-body">
          {activeTab === "ledger" ? (
            <LedgerPanel
              contact={contact}
              businessName={businessName}
              businessAddress={businessAddress}
              ledger={ledger}
              ledgerLoading={ledgerLoading}
              ledgerFormat={ledgerFormat}
              onLedgerFormatChange={setLedgerFormat}
              locationFilter={locationFilter}
              onLocationFilterChange={setLocationFilter}
              rangeLabel={rangeLabel}
              yearRangeTo={yearRangeTo(year)}
              money={money}
            />
          ) : null}

          {activeTab === "sales" ? (
            salesPanel ?? <EmptyTab message="No sales recorded for this contact." />
          ) : null}
          {activeTab === "purchases" ? (
            purchasesPanel ?? (
              <EmptyTab message="No purchases recorded for this contact." />
            )
          ) : null}
          {activeTab === "stock_report" ? (
            stockReportPanel ?? (
              <EmptyTab message="No supplier stock report for this contact." />
            )
          ) : null}
          {activeTab === "documents" ? (
            documentsPanel ?? (
              <EmptyTab message="Document attachments for contacts are not stored yet." />
            )
          ) : null}
          {activeTab === "payments" ? (
            <EmptyTab message="Payment history will appear here." />
          ) : null}
          {activeTab === "rewards" ? (
            <EmptyTab message="Reward points are not enabled yet." />
          ) : null}
          {activeTab === "activities" ? (
            <EmptyTab message="No activities logged for this contact." />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return <p className="hq6-contact-empty">{message}</p>;
}

function LedgerPanel({
  contact,
  businessName,
  businessAddress,
  ledger,
  ledgerLoading,
  ledgerFormat,
  onLedgerFormatChange,
  locationFilter,
  onLocationFilterChange,
  rangeLabel,
  yearRangeTo,
  money,
}: {
  contact: Hq6ContactDetailModel;
  businessName: string;
  businessAddress: string[];
  ledger: ContactLedgerEntry[];
  ledgerLoading: boolean;
  ledgerFormat: (typeof LEDGER_FORMATS)[number];
  onLedgerFormatChange: (v: (typeof LEDGER_FORMATS)[number]) => void;
  locationFilter: string;
  onLocationFilterChange: (v: string) => void;
  rangeLabel: string;
  yearRangeTo: string;
  money: (n: number | undefined) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="hq6-contact-ledger-toolbar">
        <label className="hq6-contact-field">
          <span className="sr-only">Date range</span>
          <input className="hq6-modal-input" readOnly value={rangeLabel} />
        </label>
        <div className="hq6-contact-format-group" role="group" aria-label="Ledger format">
          {LEDGER_FORMATS.map((fmt) => (
            <button
              key={fmt}
              type="button"
              className={cn(
                "hq6-contact-format-btn",
                ledgerFormat === fmt && "hq6-contact-format-btn-active",
              )}
              onClick={() => onLedgerFormatChange(fmt)}
            >
              {fmt}
            </button>
          ))}
        </div>
        <label className="hq6-contact-field min-w-[10rem]">
          <span className="sr-only">Business Location</span>
          <select
            className="hq6-modal-input"
            value={locationFilter}
            onChange={(e) => onLocationFilterChange(e.target.value)}
          >
            <option value="">All locations</option>
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2 text-[#6b7280]">
          <button
            type="button"
            className="hq6-contact-icon-btn"
            title="Export PDF"
            onClick={() => toast.info("PDF export coming soon")}
          >
            <FileText className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="hq6-contact-icon-btn"
            title="Email ledger"
            onClick={() => toast.info("Email ledger coming soon")}
          >
            <Mail className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="hq6-contact-ledger-mid">
        <div className="hq6-contact-to-box">
          <div className="hq6-contact-to-head">To:</div>
          <div className="hq6-contact-to-body">
            <div className="font-semibold">{contact.displayName}</div>
            <div>{contact.address?.trim() || contact.displayName}</div>
            <div className="mt-1 flex items-center gap-1 text-[#6b7280]">
              <Phone className="h-3.5 w-3.5" />
              Mobile: {contact.mobile?.trim() || "NIL"}
            </div>
          </div>
        </div>

        <div className="hq6-contact-biz-block">
          <div className="font-semibold text-[#111827]">{businessName}</div>
          {businessAddress.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>

        <div className="hq6-contact-account-summary">
          <div className="hq6-contact-account-head">Account Summary</div>
          <div className="hq6-contact-account-body">
            <div className="hq6-contact-account-range">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {yearRangeTo}
            </div>
            <SummaryRow label="Total Purchase" value={money(contact.totalPurchase)} />
            <SummaryRow label="Total invoice" value={money(contact.totalInvoice)} />
            <SummaryRow label="Total paid" value={money(contact.totalPaid)} />
            <div className="hq6-contact-account-divider">Overall Summary</div>
            <SummaryRow label="Total Purchase" value={money(contact.totalPurchase)} />
            <SummaryRow label="Total invoice" value={money(contact.totalInvoice)} />
            <SummaryRow label="Total paid" value={money(contact.totalPaid)} />
            <SummaryRow
              label="Balance due"
              value={money(contact.balanceDue)}
              strong
            />
          </div>
        </div>
      </div>

      <p className="hq6-contact-ledger-caption">
        Showing all invoices and payments between {rangeLabel.replace(" - ", " and ")}
      </p>

      <div className="hq6-contact-ledger-table-wrap">
        <table className="hq6-contact-ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference No</th>
              <th>Type</th>
              <th>Location</th>
              <th>Payment Status</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Payment Method</th>
              <th>Others</th>
            </tr>
          </thead>
          <tbody>
            {ledgerLoading ? (
              <tr>
                <td colSpan={9} className="text-center text-[#6b7280]">
                  Loading ledger…
                </td>
              </tr>
            ) : ledger.length === 0 ? (
              <tr>
                <td colSpan={9} className="h-16" />
              </tr>
            ) : (
              ledger.map((row) => {
                const isCredit =
                  /payment|credit|paid/i.test(row.type) || row.amount < 0;
                const abs = Math.abs(row.amount);
                return (
                  <tr key={row.id}>
                    <td>{formatHq6Date(row.date)}</td>
                    <td>{row.reference ?? "—"}</td>
                    <td>{row.type}</td>
                    <td>—</td>
                    <td>—</td>
                    <td>{isCredit ? "" : money(abs)}</td>
                    <td>{isCredit ? money(abs) : ""}</td>
                    <td>—</td>
                    <td>{row.description}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={cn("hq6-contact-summary-row", strong && "font-semibold")}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function parseHq6ContactTab(raw: string | null): Hq6ContactTab {
  switch (raw) {
    case "purchase":
    case "purchases":
      return "purchases";
    case "stock_report":
      return "stock_report";
    case "sales":
      return "sales";
    case "documents":
    case "documents_and_notes":
      return "documents";
    case "payments":
      return "payments";
    case "rewards":
    case "reward_points":
      return "rewards";
    case "activities":
      return "activities";
    case "ledger":
    case null:
    case "":
    case "profile":
    case "view":
      return "ledger";
    default:
      return "ledger";
  }
}

export function hq6ContactTabQuery(tab: Hq6ContactTab): string {
  if (tab === "ledger") return "";
  if (tab === "documents") return "documents_and_notes";
  if (tab === "purchases") return "purchase";
  if (tab === "rewards") return "reward_points";
  return tab;
}
