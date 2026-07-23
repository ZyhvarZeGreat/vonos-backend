"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Customer } from "@vonos/types";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { getCustomerGroups } from "@/lib/api/customerGroups";
import { getPaymentAccounts } from "@/lib/api/paymentAccounts";
import {
  getCustomerSummary,
  payCustomerDue,
  updateCustomer,
} from "@/lib/api/customers";
import {
  MODAL_RECORD_STALE_MS,
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { formatHq6Currency, formatHq6DateTime } from "@/lib/utils/hq6Format";
import { toast } from "@/stores/toastStore";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
  { value: "custom_pay_1", label: "POS 1" },
  { value: "custom_pay_2", label: "FCMB (Bank Transfer)" },
  { value: "custom_pay_3", label: "GTB (Bank Transfer)" },
  { value: "custom_pay_4", label: "Zenith (Bank Transfer)" },
  { value: "custom_pay_5", label: "POS 2" },
  { value: "custom_pay_6", label: "Discount" },
  { value: "custom_pay_7", label: "Exchange" },
] as const;

function nowPaidOnLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function paidOnToIso(value: string): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** HQ6 “Edit contact” — ui-table-rows/05 …/02_edit/modal */
export function Hq6ContactEditModal({
  open,
  customer,
  tenantId,
  onClose,
  onSaved,
}: {
  open: boolean;
  customer: Customer | null;
  tenantId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [contactKind, setContactKind] = useState<"individual" | "business">(
    "individual",
  );
  const [contactId, setContactId] = useState("");
  const [customerGroupId, setCustomerGroupId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [alternateNumber, setAlternateNumber] = useState("");
  const [landline, setLandline] = useState("");
  const [email, setEmail] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [payTerm, setPayTerm] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: groups = [] } = useQuery({
    queryKey: modalKeys.customerGroups(tenantId),
    queryFn: () => getCustomerGroups(tenantId!),
    enabled: Boolean(open && tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });

  useEffect(() => {
    if (!open || !customer) return;
    setContactKind("individual");
    setContactId(customer.contactId ?? "");
    setCustomerGroupId(customer.customerGroupId ?? "");
    setBusinessName(
      customer.businessName && customer.businessName !== customer.name
        ? customer.businessName
        : "",
    );
    setPrefix("");
    setFirstName(customer.name);
    setMiddleName("");
    setLastName("");
    setMobile(customer.phone ?? "");
    setAlternateNumber("");
    setLandline("");
    setEmail(customer.email ?? "");
    setTaxNumber(customer.taxNumber ?? "");
    setOpeningBalance(String(customer.openingBalance ?? 0));
    setPayTerm("");
    setCreditLimit("");
    setMoreOpen(false);
    setAddress1("");
    setAddress2("");
    setCity("");
    setState("");
  }, [customer, open]);

  const handleUpdate = async () => {
    if (!tenantId || !customer) return;
    const composed = [prefix, firstName, middleName, lastName]
      .map((p) => p.trim())
      .filter(Boolean)
      .join(" ");
    const name = composed || firstName.trim();
    if (!name) {
      toast.error("First Name is required");
      return;
    }
    if (!mobile.trim()) {
      toast.error("Mobile is required");
      return;
    }
    const balance = Number(openingBalance);
    if (Number.isNaN(balance)) {
      toast.error("Opening balance must be a number");
      return;
    }
    setSaving(true);
    try {
      await updateCustomer(tenantId, customer.id, {
        name,
        email: email.trim() || null,
        phone: mobile.trim() || null,
        customerGroupId: customerGroupId || null,
        openingBalance: balance,
      });
      toast.success("Contact updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title="Edit contact"
      size="xl"
      footer={
        <Hq6ModalSaveClose
          onSave={handleUpdate}
          onClose={onClose}
          saving={saving}
          saveLabel="Update"
        />
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Hq6Field label="Contact type" required>
            <select className="hq6-modal-input" value="customer" disabled>
              <option value="customer">Customers</option>
            </select>
          </Hq6Field>
          <div className="flex items-end gap-6 pb-1 text-sm text-[#111827]">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={contactKind === "individual"}
                onChange={() => setContactKind("individual")}
              />
              Individual
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={contactKind === "business"}
                onChange={() => setContactKind("business")}
              />
              Business
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Hq6Field label="Contact ID" hint={<span className="ml-1 text-xs font-normal text-[#6b7280]">Leave empty to autogenerate</span>}>
            <input
              className="hq6-modal-input"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Customer Group">
            <select
              className="hq6-modal-input"
              value={customerGroupId}
              onChange={(e) => setCustomerGroupId(e.target.value)}
            >
              <option value="">None</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Hq6Field>
        </div>

        {contactKind === "business" ? (
          <Hq6Field label="Business Name">
            <input
              className="hq6-modal-input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </Hq6Field>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-4">
          <Hq6Field label="Prefix">
            <input
              className="hq6-modal-input"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="First Name" required>
            <input
              className="hq6-modal-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Middle name">
            <input
              className="hq6-modal-input"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Last Name">
            <input
              className="hq6-modal-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </Hq6Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Hq6Field label="Mobile" required>
            <input
              className="hq6-modal-input"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Alternate contact number">
            <input
              className="hq6-modal-input"
              value={alternateNumber}
              onChange={(e) => setAlternateNumber(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Landline">
            <input
              className="hq6-modal-input"
              value={landline}
              onChange={(e) => setLandline(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Email">
            <input
              className="hq6-modal-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Hq6Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Hq6Field label="Tax number">
            <input
              className="hq6-modal-input"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Opening Balance">
            <input
              className="hq6-modal-input"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Pay term">
            <input
              className="hq6-modal-input"
              value={payTerm}
              onChange={(e) => setPayTerm(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Credit Limit">
            <input
              className="hq6-modal-input"
              value={creditLimit}
              placeholder="No Limit"
              onChange={(e) => setCreditLimit(e.target.value)}
            />
          </Hq6Field>
        </div>

        <button
          type="button"
          className="hq6-btn w-full border border-[#c4b5fd] bg-[#ede9fe] text-[#5b21b6]"
          onClick={() => setMoreOpen((v) => !v)}
        >
          More Informations {moreOpen ? "▴" : "▾"}
        </button>

        {moreOpen ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Hq6Field label="Address line 1">
              <input
                className="hq6-modal-input"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Address line 2">
              <input
                className="hq6-modal-input"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="City">
              <input
                className="hq6-modal-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="State">
              <input
                className="hq6-modal-input"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </Hq6Field>
          </div>
        ) : null}
      </div>
    </Hq6Modal>
  );
}

/** HQ6 “Add payment” — ui-table-rows/05 …/00_pay/modal */
export function Hq6PayContactModal({
  open,
  customer,
  tenantId,
  onClose,
  onPaid,
  contactLabel = "Customer",
}: {
  open: boolean;
  customer: Customer | null;
  tenantId: string | null;
  onClose: () => void;
  onPaid: () => void;
  contactLabel?: string;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(nowPaidOnLocal);
  const [saving, setSaving] = useState(false);

  const accountsQuery = useQuery({
    queryKey: modalKeys.paymentAccounts(tenantId),
    queryFn: () => getPaymentAccounts(tenantId!),
    enabled: Boolean(open && tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });
  const accounts = accountsQuery.data ?? [];

  const { data: summary } = useQuery({
    queryKey: ["customer-summary", tenantId, customer?.id, "pay-modal"],
    queryFn: () => getCustomerSummary(tenantId!, customer!.id),
    enabled: Boolean(
      open && tenantId && customer?.id && accountsQuery.isFetched,
    ),
    staleTime: MODAL_RECORD_STALE_MS,
  });

  const totals = useMemo(() => {
    const totalAmount = summary?.totalAmount ?? customer?.totalSell ?? 0;
    const totalPaid = summary?.totalPaid ?? customer?.totalSellPaid ?? 0;
    const totalDue = summary?.totalDue ?? customer?.totalSellDue ?? 0;
    const opening = customer?.openingBalance ?? 0;
    return { totalAmount, totalPaid, totalDue, opening };
  }, [customer, summary]);

  useEffect(() => {
    if (!open || !customer) return;
    setAmount(
      totals.totalDue > 0 ? totals.totalDue.toFixed(2) : "0.00",
    );
    setMethod("cash");
    setAccountId("");
    setNote("");
    setPaidOn(nowPaidOnLocal());
  }, [customer, open, totals.totalDue]);

  const handleSave = async () => {
    if (!tenantId || !customer) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a payment amount greater than zero");
      return;
    }
    setSaving(true);
    try {
      const result = await payCustomerDue(tenantId, customer.id, {
        amount: value,
        method,
        accountId: accountId || undefined,
        note: note.trim() || undefined,
        paidOn: paidOnToIso(paidOn),
      });
      toast.success(
        `Applied ${formatHq6Currency(result.amountApplied, result.currency)} — remaining due ${formatHq6Currency(result.remainingDue, result.currency)}`,
      );
      onPaid();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    customer?.businessName && customer.businessName !== customer.name
      ? `${customer.name} ${customer.contactId ?? ""}`.trim()
      : `${customer?.name ?? ""} ${customer?.contactId ?? ""}`.trim();

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title="Add payment"
      size="lg"
      footer={
        <Hq6ModalSaveClose
          onSave={handleSave}
          onClose={onClose}
          saving={saving}
          saveLabel="Save"
        />
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm text-[#374151]">
          <span className="font-semibold">{contactLabel} name:</span>{" "}
          {displayName || "—"}
        </div>
        <div className="rounded border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm text-[#374151]">
          <div>Total Sale: {formatHq6Currency(totals.totalAmount)}</div>
          <div>Total Paid: {formatHq6Currency(totals.totalPaid)}</div>
          <div>Total Sale Due: {formatHq6Currency(totals.totalDue)}</div>
          <div>Opening Balance: {formatHq6Currency(totals.opening)}</div>
          <div>Opening Balance Due: {formatHq6Currency(totals.opening)}</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Hq6Field label="Payment Method" required>
          <select
            className="hq6-modal-input"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Hq6Field>
        <Hq6Field label="Paid on" required>
          <input
            className="hq6-modal-input"
            type="datetime-local"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
          />
        </Hq6Field>
        <Hq6Field label="Amount" required>
          <input
            className="hq6-modal-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Hq6Field>
        <Hq6Field label="Attach Document">
          <input className="hq6-modal-input" type="file" disabled />
          <p className="mt-1 text-xs text-[#6b7280]">
            .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png
          </p>
        </Hq6Field>
        <Hq6Field label="Payment Account">
          <select
            className="hq6-modal-input"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">None</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Hq6Field>
        <div className="sm:col-span-2">
          <Hq6Field label="Payment Note">
            <textarea
              className="hq6-modal-input min-h-[88px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Hq6Field>
        </div>
      </div>
      {paidOn ? (
        <p className="mt-2 text-xs text-[#9ca3af]">
          Paying as of {formatHq6DateTime(paidOnToIso(paidOn))}
        </p>
      ) : null}
    </Hq6Modal>
  );
}
