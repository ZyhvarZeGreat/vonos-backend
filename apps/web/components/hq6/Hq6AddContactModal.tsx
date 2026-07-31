"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { createCustomer } from "@/lib/api/customers";
import { getCustomerGroups } from "@/lib/api/customerGroups";
import { createSupplier } from "@/lib/api/suppliers";
import { getUsers } from "@/lib/api/users";
import { TYPEAHEAD_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { withOptimistic } from "@/lib/hooks/useAppMutation";
import {
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import {
  optimisticTempId,
  prependEntityInQueries,
  removeEntityFromQueries,
} from "@/lib/query/optimistic";
import {
  sanitizePersonNameInput,
} from "@/lib/utils/formValidation";
import { contactFormSchema } from "@/lib/validation/schemas";
import type { Customer, SupplierListRow } from "@vonos/types";
import { toast } from "@/stores/toastStore";

export type Hq6ContactType = "customer" | "supplier" | "both";

function resetAddContactForm(defaultType: Hq6ContactType) {
  return {
    contactType: defaultType as Hq6ContactType,
    contactKind: "individual" as "individual" | "business",
    contactId: "",
    customerGroupId: "",
    businessName: "",
    prefix: "",
    firstName: "",
    middleName: "",
    lastName: "",
    mobile: "",
    alternateNumber: "",
    landline: "",
    email: "",
    assignedToUserId: "",
    taxNumber: "",
    openingBalance: "0",
    payTerm: "",
    creditLimit: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    bankCode: "",
  };
}

type FormState = ReturnType<typeof resetAddContactForm>;

function composePersonName(form: FormState, includeMiddle: boolean): string {
  const parts = includeMiddle
    ? [form.prefix, form.firstName, form.middleName, form.lastName]
    : [form.prefix, form.firstName, form.lastName];
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" ");
}

function resolveDisplayName(form: FormState, includeMiddle: boolean): string {
  const composed = composePersonName(form, includeMiddle);
  const business = form.businessName.trim();
  if (form.contactKind === "business") {
    return business || composed;
  }
  return composed || form.firstName.trim();
}

function buildSupplierNotes(form: FormState): string | null {
  return (
    [
      form.contactId.trim() ? `Contact ID: ${form.contactId.trim()}` : "",
      form.alternateNumber.trim()
        ? `Alt: ${form.alternateNumber.trim()}`
        : "",
      form.landline.trim() ? `Landline: ${form.landline.trim()}` : "",
      form.payTerm.trim() ? `Pay term: ${form.payTerm.trim()}` : "",
      form.creditLimit.trim()
        ? `Credit limit: ${form.creditLimit.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join(" | ") || null
  );
}

/**
 * HQ6 “Add a new contact” — Customers / Suppliers / Both.
 * Suppliers (and Both) omit middle name and include account details.
 */
export type Hq6ContactSavedResult = {
  contactType: Hq6ContactType;
  customerId?: string;
  supplierId?: string;
};

export function Hq6AddContactModal({
  open,
  tenantId,
  defaultType = "customer",
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string | null;
  defaultType?: Hq6ContactType;
  onClose: () => void;
  onSaved?: (result?: Hq6ContactSavedResult) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => resetAddContactForm(defaultType));
  const [moreOpen, setMoreOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isCustomerSide =
    form.contactType === "customer" || form.contactType === "both";
  const isSupplierSide =
    form.contactType === "supplier" || form.contactType === "both";
  const showMiddleName = form.contactType === "customer";

  const { data: users = [] } = useQuery({
    queryKey: modalKeys.usersFilter(tenantId),
    queryFn: () => getUsers(tenantId!, { limit: TYPEAHEAD_PAGE_SIZE }),
    enabled: Boolean(open && tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });

  const { data: groups = [] } = useQuery({
    queryKey: modalKeys.customerGroups(tenantId),
    queryFn: () => getCustomerGroups(tenantId!),
    enabled: Boolean(open && tenantId && isCustomerSide),
    staleTime: MODAL_REF_STALE_MS,
  });

  useEffect(() => {
    if (!open) return;
    setDismissed(false);
    setForm(resetAddContactForm(defaultType));
    setMoreOpen(false);
  }, [open, defaultType]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!tenantId) return;

    const name = resolveDisplayName(form, showMiddleName);
    const parsed = contactFormSchema.safeParse({
      prefix: form.prefix,
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      mobile: form.mobile,
      alternateNumber: form.alternateNumber,
      landline: form.landline,
      email: form.email,
    });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Please check the form.";
      toast.error(
        form.contactKind === "business" && !form.businessName.trim()
          ? "Business Name is required"
          : msg,
      );
      return;
    }
    if (form.contactKind === "business" && !form.businessName.trim()) {
      toast.error("Business Name is required");
      return;
    }
    if (!name) {
      toast.error(
        form.contactKind === "business"
          ? "Business Name is required"
          : "First Name is required",
      );
      return;
    }
    const balance = Number(form.openingBalance);
    if (Number.isNaN(balance)) {
      toast.error("Opening balance must be a number");
      return;
    }

    const personName = composePersonName(form, showMiddleName);
    const business = form.businessName.trim();
    const address = [form.address1, form.address2, form.city, form.state]
      .map((p) => p.trim())
      .filter(Boolean)
      .join(", ");
    const now = new Date().toISOString();

    setSaving(true);
    setDismissed(true);

    let customerId: string | undefined;
    let supplierId: string | undefined;

    try {
      if (isCustomerSide) {
        const tempId = optimisticTempId("customer");
        const opt = withOptimistic<Customer, void>(queryClient, {
          keys: [["customers"]],
          update: (qc) => {
            prependEntityInQueries(qc, ["customers"], {
              id: tempId,
              tenantId,
              name,
              email: form.email.trim() || null,
              phone: form.mobile.trim() || null,
              customerGroupId:
                form.contactKind === "individual"
                  ? form.customerGroupId || null
                  : null,
              customerGroupName: null,
              assignedToUserId: form.assignedToUserId || null,
              assignedToName: null,
              openingBalance: balance,
              totalSpend: 0,
              visitCount: 0,
              createdAt: now,
              updatedAt: now,
              contactId: form.contactId.trim() || null,
              businessName:
                form.contactKind === "business" ? business || name : null,
              taxNumber: form.taxNumber.trim() || null,
              status: "active",
            } satisfies Customer);
          },
          commit: (qc, data) => {
            removeEntityFromQueries(qc, ["customers"], tempId);
            prependEntityInQueries(qc, ["customers"], data);
          },
        });
        const ctx = await opt.onMutate(undefined);
        try {
          const created = await createCustomer(tenantId, {
            name,
            email: form.email.trim() || undefined,
            phone: form.mobile.trim() || undefined,
            customerGroupId:
              form.contactKind === "individual"
                ? form.customerGroupId || undefined
                : undefined,
            assignedToUserId: form.assignedToUserId || undefined,
            openingBalance: balance,
            taxNumber: form.taxNumber.trim() || null,
          });
          customerId = created.id;
          opt.onSuccess(created, undefined);
        } catch (err) {
          opt.onError(err, undefined, ctx);
          throw err;
        } finally {
          await opt.onSettled();
        }
      }

      if (isSupplierSide) {
        const notes = buildSupplierNotes(form);
        const tempId = optimisticTempId("supplier");
        const opt = withOptimistic<SupplierListRow, void>(queryClient, {
          keys: [["suppliers"]],
          update: (qc) => {
            prependEntityInQueries(qc, ["suppliers"], {
              id: tempId,
              tenantId,
              name,
              contactName: personName || null,
              email: form.email.trim() || null,
              phone: form.mobile.trim() || null,
              address: address || null,
              locationCode: null,
              notes,
              taxNumber: form.taxNumber.trim() || null,
              accountHolderName: form.accountHolderName.trim() || null,
              bankName: form.bankName.trim() || null,
              bankCode: form.bankCode.trim() || null,
              bankAccountNo: form.accountNumber.trim() || null,
              openingBalance: balance,
              assignedToUserId: form.assignedToUserId || null,
              createdAt: now,
              updatedAt: now,
              category: "",
              leadTimeDays: 0,
              location: "",
              rating: 0,
            } satisfies SupplierListRow);
          },
          commit: (qc, data) => {
            removeEntityFromQueries(qc, ["suppliers"], tempId);
            prependEntityInQueries(qc, ["suppliers"], data);
          },
        });
        const ctx = await opt.onMutate(undefined);
        try {
          const created = await createSupplier({
            name,
            contactName: personName || undefined,
            email: form.email.trim() || undefined,
            phone: form.mobile.trim() || undefined,
            address: address || undefined,
            taxNumber: form.taxNumber.trim() || null,
            openingBalance: balance,
            assignedToUserId: form.assignedToUserId || undefined,
            notes: notes ?? undefined,
            accountHolderName: form.accountHolderName.trim() || null,
            bankName: form.bankName.trim() || null,
            bankCode: form.bankCode.trim() || null,
            bankAccountNo: form.accountNumber.trim() || null,
          });
          supplierId = created.id;
          opt.onSuccess(created, undefined);
        } catch (err) {
          opt.onError(err, undefined, ctx);
          throw err;
        } finally {
          await opt.onSettled();
        }
      }

      const label =
        form.contactType === "both"
          ? "Contact added as customer and supplier"
          : form.contactType === "supplier"
            ? "Supplier added"
            : "Customer added";
      toast.success(label);
      onSaved?.({
        contactType: form.contactType,
        customerId,
        supplierId,
      });
      onClose();
    } catch (err) {
      setDismissed(false);
      toast.error(
        err instanceof Error ? err.message : "Failed to add contact",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Hq6Modal
      open={open && !dismissed}
      onClose={onClose}
      title="Add a new contact"
      size="xl"
      footer={
        <Hq6ModalSaveClose
          onSave={handleSave}
          onClose={onClose}
          saving={saving}
          saveLabel="Save"
        />
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
          <Hq6Field label="Contact type" required>
            <select
              className="hq6-modal-input"
              value={form.contactType}
              onChange={(e) => {
                const next = e.target.value as Hq6ContactType;
                setField("contactType", next);
                if (next !== "customer") {
                  setField("middleName", "");
                }
              }}
            >
              <option value="customer">Customers</option>
              <option value="supplier">Suppliers</option>
              <option value="both">Suppliers and Customers</option>
            </select>
          </Hq6Field>
          <div className="flex items-center justify-center gap-6 self-center text-sm text-[#111827]">
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
                onChange={() => {
                  setField("contactKind", "business");
                  setField("customerGroupId", "");
                  setMoreOpen(true);
                }}
              />
              Business
            </label>
          </div>
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
              placeholder="Contact ID"
              value={form.contactId}
              onChange={(e) => setField("contactId", e.target.value)}
            />
          </Hq6Field>
        </div>

        {isCustomerSide && form.contactKind === "individual" ? (
          <Hq6Field label="Customer Group">
            <select
              className="hq6-modal-input"
              value={form.customerGroupId}
              onChange={(e) => setField("customerGroupId", e.target.value)}
            >
              <option value="">None</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Hq6Field>
        ) : null}

        {form.contactKind === "business" ? (
          <Hq6Field label="Business Name" required>
            <input
              className="hq6-modal-input"
              placeholder="Business Name"
              value={form.businessName}
              onChange={(e) => setField("businessName", e.target.value)}
            />
          </Hq6Field>
        ) : null}

        <div
          className={`grid gap-3 ${showMiddleName ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
        >
          <Hq6Field label="Prefix">
            <input
              className="hq6-modal-input"
              value={form.prefix}
              onChange={(e) =>
                setField("prefix", sanitizePersonNameInput(e.target.value))
              }
            />
          </Hq6Field>
          <Hq6Field
            label="First Name"
            required={form.contactKind === "individual"}
          >
            <input
              className="hq6-modal-input"
              value={form.firstName}
              onChange={(e) =>
                setField("firstName", sanitizePersonNameInput(e.target.value))
              }
            />
          </Hq6Field>
          {showMiddleName ? (
            <Hq6Field label="Middle name">
              <input
                className="hq6-modal-input"
                value={form.middleName}
                onChange={(e) =>
                  setField(
                    "middleName",
                    sanitizePersonNameInput(e.target.value),
                  )
                }
              />
            </Hq6Field>
          ) : null}
          <Hq6Field label="Last Name">
            <input
              className="hq6-modal-input"
              value={form.lastName}
              onChange={(e) =>
                setField("lastName", sanitizePersonNameInput(e.target.value))
              }
            />
          </Hq6Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>

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
                placeholder={
                  isCustomerSide ? "Keep blank for no limit" : "No Limit"
                }
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

        {isSupplierSide ? (
          <div className="space-y-3 border-t border-[#e5e7eb] pt-4">
            <h5 className="text-sm font-semibold text-[#111827]">
              Account Details
            </h5>
            <div className="grid gap-3 sm:grid-cols-2">
              <Hq6Field label="Account Name">
                <input
                  className="hq6-modal-input"
                  value={form.accountHolderName}
                  onChange={(e) =>
                    setField("accountHolderName", e.target.value)
                  }
                />
              </Hq6Field>
              <Hq6Field label="Account Number">
                <input
                  className="hq6-modal-input"
                  value={form.accountNumber}
                  onChange={(e) => setField("accountNumber", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Bank Name">
                <input
                  className="hq6-modal-input"
                  value={form.bankName}
                  onChange={(e) => setField("bankName", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Bank Identifier Code">
                <input
                  className="hq6-modal-input"
                  value={form.bankCode}
                  onChange={(e) => setField("bankCode", e.target.value)}
                />
              </Hq6Field>
            </div>
          </div>
        ) : null}
      </div>
    </Hq6Modal>
  );
}
