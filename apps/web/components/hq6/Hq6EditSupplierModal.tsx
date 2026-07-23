"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupplierListRow } from "@vonos/types";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { updateSupplier } from "@/lib/api/suppliers";
import { getUsers } from "@/lib/api/users";
import { TYPEAHEAD_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import {
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { toast } from "@/stores/toastStore";

type ContactKind = "individual" | "business";

function formFromSupplier(supplier: SupplierListRow) {
  // Suppliers are business contacts in HQ6; name is the company name.
  const businessName = (supplier.businessName ?? supplier.name).trim();
  const contactName = supplier.contactName?.trim() ?? "";

  return {
    contactKind: "business" as ContactKind,
    contactId: supplier.contactId?.trim() ?? "",
    businessName,
    prefix: "",
    firstName: contactName,
    middleName: "",
    lastName: "",
    mobile: supplier.phone ?? "",
    alternateNumber: "",
    landline: "",
    email: supplier.email ?? "",
    dateOfBirth: "",
    assignedToUserId: supplier.assignedToUserId ?? "",
    taxNumber: supplier.taxNumber ?? "",
    openingBalance: String(supplier.openingBalance ?? 0),
    payTerm: supplier.payTerm ?? "",
    creditLimit: "",
    address1: supplier.address ?? "",
    address2: "",
    city: "",
    state: "",
  };
}

type EditForm = ReturnType<typeof formFromSupplier>;

/**
 * HQ6 “Edit contact” — suppliers (Ultimate POS contacts modal).
 */
export function Hq6EditSupplierModal({
  open,
  supplier,
  tenantId,
  onClose,
  onSaved,
}: {
  open: boolean;
  supplier: SupplierListRow | null;
  tenantId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EditForm | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: modalKeys.usersFilter(tenantId),
    queryFn: () => getUsers(tenantId!, { limit: TYPEAHEAD_PAGE_SIZE }),
    enabled: Boolean(open && tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });

  useEffect(() => {
    if (!open || !supplier) {
      setForm(null);
      setMoreOpen(false);
      return;
    }
    setForm(formFromSupplier(supplier));
    setMoreOpen(false);
  }, [open, supplier]);

  const setField = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleUpdate = async () => {
    if (!tenantId || !supplier || !form) return;
    const composed = [
      form.prefix,
      form.firstName,
      form.middleName,
      form.lastName,
    ]
      .map((p) => p.trim())
      .filter(Boolean)
      .join(" ");
    const business = form.businessName.trim();
    const name =
      form.contactKind === "business"
        ? business || composed
        : composed || form.firstName.trim();
    if (!name) {
      toast.error(
        form.contactKind === "business"
          ? "Business Name is required"
          : "First Name is required",
      );
      return;
    }
    if (!form.mobile.trim()) {
      toast.error("Mobile is required");
      return;
    }
    const balance = Number(form.openingBalance);
    if (Number.isNaN(balance)) {
      toast.error("Opening balance must be a number");
      return;
    }
    const address = [form.address1, form.address2, form.city, form.state]
      .map((p) => p.trim())
      .filter(Boolean)
      .join(", ");

    setSaving(true);
    try {
      await updateSupplier(supplier.id, {
        name,
        contactName: composed || undefined,
        email: form.email.trim() || undefined,
        phone: form.mobile.trim() || undefined,
        address: address || undefined,
        taxNumber: form.taxNumber.trim() || null,
        openingBalance: balance,
        assignedToUserId: form.assignedToUserId || undefined,
        notes:
          [
            form.contactId.trim()
              ? `Contact ID: ${form.contactId.trim()}`
              : "",
            form.alternateNumber.trim()
              ? `Alt: ${form.alternateNumber.trim()}`
              : "",
            form.landline.trim() ? `Landline: ${form.landline.trim()}` : "",
            form.dateOfBirth.trim()
              ? `DOB: ${form.dateOfBirth.trim()}`
              : "",
            form.payTerm.trim() ? `Pay term: ${form.payTerm.trim()}` : "",
            form.creditLimit.trim()
              ? `Credit limit: ${form.creditLimit.trim()}`
              : "",
          ]
            .filter(Boolean)
            .join(" | ") || undefined,
      });
      toast.success("Supplier updated");
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update supplier",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Hq6Modal
      open={open && Boolean(supplier)}
      onClose={onClose}
      title="Edit contact"
      size="xl"
      footer={
        <Hq6ModalSaveClose
          onSave={handleUpdate}
          onClose={onClose}
          saving={saving}
          saveLabel="Update"
          saveDisabled={!form}
        />
      }
    >
      {!form ? (
        <p className="py-6 text-center text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <Hq6Field label="Contact type" required>
              <select className="hq6-modal-input" value="supplier" disabled>
                <option value="supplier">Suppliers</option>
              </select>
            </Hq6Field>
            <div className="flex items-end gap-6 pb-1 text-sm text-[#111827]">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={form.contactKind === "individual"}
                  onChange={() => setField("contactKind", "individual")}
                />
                Individual
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={form.contactKind === "business"}
                  onChange={() => setField("contactKind", "business")}
                />
                Business
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Hq6Field
              label="Contact ID"
              hint={
                <span className="ml-1 text-xs font-normal text-[#6b7280]">
                  Leave empty to autogenerate
                </span>
              }
            >
              <input
                className="hq6-modal-input"
                value={form.contactId}
                onChange={(e) => setField("contactId", e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Prefix">
              <input
                className="hq6-modal-input"
                placeholder="Mr / Mrs / Miss"
                value={form.prefix}
                onChange={(e) => setField("prefix", e.target.value)}
              />
            </Hq6Field>
            <Hq6Field
              label="First Name"
              required={form.contactKind === "individual"}
            >
              <input
                className="hq6-modal-input"
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Middle name">
              <input
                className="hq6-modal-input"
                value={form.middleName}
                onChange={(e) => setField("middleName", e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Last Name">
              <input
                className="hq6-modal-input"
                placeholder="Last Name"
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
              />
            </Hq6Field>
          </div>

          {form.contactKind === "business" ? (
            <Hq6Field label="Business Name" required>
              <input
                className="hq6-modal-input"
                value={form.businessName}
                onChange={(e) => setField("businessName", e.target.value)}
              />
            </Hq6Field>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Hq6Field label="Mobile" required>
              <input
                className="hq6-modal-input"
                placeholder="Mobile"
                value={form.mobile}
                onChange={(e) => setField("mobile", e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Alternate contact number">
              <input
                className="hq6-modal-input"
                placeholder="Alternate contact number"
                value={form.alternateNumber}
                onChange={(e) => setField("alternateNumber", e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Landline">
              <input
                className="hq6-modal-input"
                placeholder="Landline"
                value={form.landline}
                onChange={(e) => setField("landline", e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Email">
              <input
                className="hq6-modal-input"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Date of birth">
              <input
                className="hq6-modal-input"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Assigned to">
              <select
                className="hq6-modal-input"
                value={form.assignedToUserId}
                onChange={(e) => setField("assignedToUserId", e.target.value)}
              >
                <option value="">None</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
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
              <Hq6Field label="Tax number">
                <input
                  className="hq6-modal-input"
                  value={form.taxNumber}
                  onChange={(e) => setField("taxNumber", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Opening Balance">
                <input
                  className="hq6-modal-input"
                  value={form.openingBalance}
                  onChange={(e) => setField("openingBalance", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Pay term">
                <input
                  className="hq6-modal-input"
                  value={form.payTerm}
                  onChange={(e) => setField("payTerm", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Credit Limit">
                <input
                  className="hq6-modal-input"
                  placeholder="No Limit"
                  value={form.creditLimit}
                  onChange={(e) => setField("creditLimit", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Address line 1">
                <input
                  className="hq6-modal-input"
                  value={form.address1}
                  onChange={(e) => setField("address1", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Address line 2">
                <input
                  className="hq6-modal-input"
                  value={form.address2}
                  onChange={(e) => setField("address2", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="City">
                <input
                  className="hq6-modal-input"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="State">
                <input
                  className="hq6-modal-input"
                  value={form.state}
                  onChange={(e) => setField("state", e.target.value)}
                />
              </Hq6Field>
            </div>
          ) : null}
        </div>
      )}
    </Hq6Modal>
  );
}
