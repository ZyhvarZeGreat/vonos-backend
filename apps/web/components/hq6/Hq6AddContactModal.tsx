"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { AsyncMenuSelect } from "@/components/molecules/AsyncMenuSelect";
import { createCustomer, clearCustomerOptionCache } from "@/lib/api/customers";
import { getCustomerGroups } from "@/lib/api/customerGroups";
import { createSupplier, clearSupplierOptionCache } from "@/lib/api/suppliers";
import { getEmployees, getDesignations } from "@/lib/api/hrm";
import { getUsers } from "@/lib/api/users";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
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
  sanitizeContactLastNameInput,
  sanitizePersonNameInput,
} from "@/lib/utils/formValidation";
import { isJobCentricTenant } from "@/lib/utils/isHq6Tenant";
import { contactFormSchema } from "@/lib/validation/schemas";
import type {
  Customer,
  CustomerContactDetails,
  SupplierListRow,
} from "@vonos/types";
import {
  CONTACT_CUSTOM_FIELD_KEYS,
  CONTACT_CUSTOM_FIELD_LABELS,
} from "@vonos/types";
import { toast } from "@/stores/toastStore";

export type Hq6ContactType = "customer" | "supplier" | "both";

function emptyCustomFields(): Record<
  (typeof CONTACT_CUSTOM_FIELD_KEYS)[number],
  string
> {
  return {
    customField1: "",
    customField2: "",
    customField3: "",
    customField4: "",
    customField5: "",
    customField6: "",
    customField7: "",
    customField8: "",
    customField9: "",
    customField10: "",
  };
}

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
    // Customer-side: the HRM worker responsible for this contact.
    assignedToEmployeeId: "",
    assignedToEmployeeName: "",
    assignedDesignationId: "",
    taxNumber: "",
    openingBalance: "",
    payTermNumber: "",
    payTermType: "" as "" | "days" | "months",
    creditLimit: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    landmark: "",
    streetName: "",
    buildingNumber: "",
    additionalNumber: "",
    shippingAddress: "",
    ...emptyCustomFields(),
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

function buildContactDetails(form: FormState): CustomerContactDetails {
  const payTermRaw = form.payTermNumber.trim();
  const payTermNumber =
    payTermRaw === "" ? null : Number.parseInt(payTermRaw, 10);
  const creditRaw = form.creditLimit.trim();
  const creditLimit =
    creditRaw === "" ? null : Number.parseFloat(creditRaw);

  const custom: Partial<CustomerContactDetails> = {};
  for (const key of CONTACT_CUSTOM_FIELD_KEYS) {
    const value = form[key].trim();
    custom[key] = value || null;
  }

  return {
    contactKind: form.contactKind,
    contactId: form.contactId.trim() || null,
    businessName:
      form.contactKind === "business"
        ? form.businessName.trim() || null
        : null,
    prefix: form.prefix.trim() || null,
    firstName: form.firstName.trim() || null,
    middleName: form.middleName.trim() || null,
    lastName: form.lastName.trim() || null,
    alternateNumber: form.alternateNumber.trim() || null,
    landline: form.landline.trim() || null,
    payTermNumber:
      payTermNumber != null && Number.isFinite(payTermNumber)
        ? payTermNumber
        : null,
    payTermType: form.payTermType || null,
    creditLimit:
      creditLimit != null && Number.isFinite(creditLimit) ? creditLimit : null,
    addressLine1: form.address1.trim() || null,
    addressLine2: form.address2.trim() || null,
    city: form.city.trim() || null,
    state: form.state.trim() || null,
    country: form.country.trim() || null,
    zipCode: form.zipCode.trim() || null,
    landmark: form.landmark.trim() || null,
    streetName: form.streetName.trim() || null,
    buildingNumber: form.buildingNumber.trim() || null,
    additionalNumber: form.additionalNumber.trim() || null,
    shippingAddress: form.shippingAddress.trim() || null,
    ...custom,
  };
}

function composeFullAddress(form: FormState): string {
  return [
    form.address1,
    form.address2,
    form.streetName,
    form.buildingNumber,
    form.landmark,
    form.city,
    form.state,
    form.country,
    form.zipCode,
  ]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
}

function buildSupplierNotes(form: FormState): string | null {
  return (
    [
      form.contactId.trim() ? `Contact ID: ${form.contactId.trim()}` : "",
      form.alternateNumber.trim()
        ? `Alt: ${form.alternateNumber.trim()}`
        : "",
      form.landline.trim() ? `Landline: ${form.landline.trim()}` : "",
      form.payTermNumber.trim()
        ? `Pay term: ${form.payTermNumber.trim()} ${form.payTermType || ""}`.trim()
        : "",
      form.creditLimit.trim()
        ? `Credit limit: ${form.creditLimit.trim()}`
        : "",
      form.shippingAddress.trim()
        ? `Shipping: ${form.shippingAddress.trim()}`
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
  const { tenantCode } = useRouteTenant();
  const [form, setForm] = useState(() => resetAddContactForm(defaultType));
  const [moreOpen, setMoreOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isCustomerSide =
    form.contactType === "customer" || form.contactType === "both";
  const isSupplierSide =
    form.contactType === "supplier" || form.contactType === "both";
  const showMiddleName = form.contactType === "customer";

  // Job-centric tenants use the vehicle registration number as the Contact ID.
  const isAutomotive = isJobCentricTenant(tenantCode);
  const contactIdLabel = isAutomotive
    ? "Vehicle Registration No."
    : "Contact ID";
  const contactIdPlaceholder = isAutomotive ? "e.g. ABC-123-XY" : "Contact ID";
  // Required whenever a customer is being created (the plate-as-id rule);
  // supplier-only contacts keep it optional.
  const contactIdRequired = isCustomerSide;

  const { data: users = [] } = useQuery({
    queryKey: modalKeys.usersFilter(tenantId),
    queryFn: () => getUsers(tenantId!),
    enabled: Boolean(open && tenantId && isSupplierSide),
    staleTime: MODAL_REF_STALE_MS,
  });

  // Worker (HRM employee) assignment for the customer side — the full roster,
  // searchable and filterable by staff category (designation).
  const { data: designations = [] } = useQuery({
    queryKey: ["designations", tenantId, "assign-filter"],
    queryFn: () => getDesignations(tenantId!),
    enabled: Boolean(open && tenantId && isCustomerSide),
    staleTime: MODAL_REF_STALE_MS,
  });

  const employeeNameById = useRef<Map<string, string>>(new Map());
  const loadEmployeeOptions = useCallback(
    async (query: string) => {
      const rows = await getEmployees(tenantId!, query || undefined, {
        designationId: form.assignedDesignationId || undefined,
      });
      for (const row of rows) employeeNameById.current.set(row.id, row.name);
      return [
        { value: "", label: "None" },
        ...rows.map((row) => ({
          value: row.id,
          label: row.designationName
            ? `${row.name} · ${row.designationName}`
            : row.name,
        })),
      ];
    },
    [tenantId, form.assignedDesignationId],
  );

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
    setMoreOpen(true);
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
    const isWalkIn = name.trim().toLowerCase() === "walk-in customer";
    if (contactIdRequired && !isWalkIn && !form.contactId.trim()) {
      toast.error(`${contactIdLabel} is required`);
      return;
    }
    const balance = Number(form.openingBalance);
    if (Number.isNaN(balance)) {
      toast.error("Opening balance must be a number");
      return;
    }
    if (form.creditLimit.trim() && Number.isNaN(Number(form.creditLimit))) {
      toast.error("Credit limit must be a number");
      return;
    }
    if (
      form.payTermNumber.trim() &&
      Number.isNaN(Number.parseInt(form.payTermNumber, 10))
    ) {
      toast.error("Pay term must be a number");
      return;
    }

    const personName = composePersonName(form, showMiddleName);
    const business = form.businessName.trim();
    const address = composeFullAddress(form);
    const details: CustomerContactDetails = {
      ...buildContactDetails(form),
      assignedToEmployeeId: form.assignedToEmployeeId || null,
      assignedToEmployeeName: form.assignedToEmployeeName || null,
    };
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
          // Keep the committed row visible — invalidate can briefly race and
          // drop newly-added contact fields before the refetch lands.
          invalidate: false,
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
              details,
            } satisfies Customer);
          },
          commit: (qc, data) => {
            removeEntityFromQueries(qc, ["customers"], tempId);
            prependEntityInQueries(qc, ["customers"], data);
            clearCustomerOptionCache();
            void qc.invalidateQueries({ queryKey: ["customers"] });
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
            details,
          });
          customerId = created.id;
          opt.onSuccess(created, undefined);
        } catch (err) {
          opt.onError(err, undefined, ctx);
          throw err;
        } finally {
          void opt.onSettled();
        }
      }

      if (isSupplierSide) {
        const notes = buildSupplierNotes(form);
        const tempId = optimisticTempId("supplier");
        const opt = withOptimistic<SupplierListRow, void>(queryClient, {
          keys: [["suppliers"]],
          invalidate: false,
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
            clearSupplierOptionCache();
            void qc.invalidateQueries({ queryKey: ["suppliers"] });
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
          void opt.onSettled();
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
            label={contactIdLabel}
            required={contactIdRequired}
            hint={
              contactIdRequired ? (
                isAutomotive ? (
                  <span className="ml-1 text-xs font-normal text-[#6b7280]">
                    Used as the customer ID
                  </span>
                ) : null
              ) : (
                <span className="ml-1 text-xs font-normal text-[#6b7280]">
                  Leave empty to autogenerate
                </span>
              )
            }
          >
            <input
              className="hq6-modal-input"
              placeholder={contactIdPlaceholder}
              value={form.contactId}
              onChange={(e) =>
                setField(
                  "contactId",
                  isAutomotive
                    ? e.target.value.toUpperCase()
                    : e.target.value,
                )
              }
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
              placeholder="Name or plate / reg. no."
              onChange={(e) =>
                setField(
                  "lastName",
                  sanitizeContactLastNameInput(e.target.value),
                )
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

        {isAutomotive && isCustomerSide ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Hq6Field label="Car Model & Year">
              <input
                className="hq6-modal-input"
                placeholder="e.g. COROLLA 2009"
                value={form.customField3}
                onChange={(e) => setField("customField3", e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Milage">
              <input
                className="hq6-modal-input"
                placeholder="Milage"
                value={form.customField1}
                onChange={(e) => setField("customField1", e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="VIN Number">
              <input
                className="hq6-modal-input"
                placeholder="VIN Number"
                value={form.customField2}
                onChange={(e) => setField("customField2", e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Customer Location">
              <input
                className="hq6-modal-input"
                placeholder="Customer Location"
                value={form.customField4}
                onChange={(e) => setField("customField4", e.target.value)}
              />
            </Hq6Field>
          </div>
        ) : null}

        {isCustomerSide ? (
          <Hq6Field label="Assigned to">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,10rem)_1fr]">
              <select
                className="hq6-modal-input"
                aria-label="Filter workers by category"
                value={form.assignedDesignationId}
                onChange={(e) =>
                  setField("assignedDesignationId", e.target.value)
                }
              >
                <option value="">All categories</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <AsyncMenuSelect
                value={form.assignedToEmployeeId}
                selectedLabel={form.assignedToEmployeeName || "None"}
                placeholder="Search workers…"
                emptyMessage="No workers found"
                loadOptions={loadEmployeeOptions}
                onChange={(id) =>
                  setForm((prev) => ({
                    ...prev,
                    assignedToEmployeeId: id,
                    assignedToEmployeeName: id
                      ? employeeNameById.current.get(id) ??
                        prev.assignedToEmployeeName
                      : "",
                  }))
                }
              />
            </div>
          </Hq6Field>
        ) : (
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
        )}

        <button
          type="button"
          className="hq6-btn w-full border border-[#c4b5fd] bg-[#ede9fe] text-[#5b21b6]"
          onClick={() => setMoreOpen((v) => !v)}
        >
          More Informations {moreOpen ? "▴" : "▾"}
        </button>

        {moreOpen ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Hq6Field label="Tax number">
                <input
                  className="hq6-modal-input"
                  placeholder="Tax number"
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
                <div className="flex gap-2">
                  <input
                    className="hq6-modal-input min-w-0 flex-1"
                    inputMode="numeric"
                    placeholder=""
                    value={form.payTermNumber}
                    onChange={(e) => setField("payTermNumber", e.target.value)}
                  />
                  <select
                    className="hq6-modal-input w-[9rem] shrink-0"
                    value={form.payTermType}
                    onChange={(e) =>
                      setField(
                        "payTermType",
                        e.target.value as FormState["payTermType"],
                      )
                    }
                  >
                    <option value="">Please Select</option>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </Hq6Field>
              <Hq6Field
                label="Credit Limit"
                hint={
                  <span className="ml-1 text-xs font-normal text-[#6b7280]">
                    Keep blank for no limit
                  </span>
                }
              >
                <input
                  className="hq6-modal-input"
                  placeholder="Keep blank for no limit"
                  value={form.creditLimit}
                  onChange={(e) => setField("creditLimit", e.target.value)}
                />
              </Hq6Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Hq6Field label="Address line 1">
                <input
                  className="hq6-modal-input"
                  placeholder="Address line 1"
                  value={form.address1}
                  onChange={(e) => setField("address1", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Address line 2">
                <input
                  className="hq6-modal-input"
                  placeholder="Address line 2"
                  value={form.address2}
                  onChange={(e) => setField("address2", e.target.value)}
                />
              </Hq6Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Hq6Field label="City">
                <input
                  className="hq6-modal-input"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="State">
                <input
                  className="hq6-modal-input"
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => setField("state", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Country">
                <input
                  className="hq6-modal-input"
                  placeholder="Country"
                  value={form.country}
                  onChange={(e) => setField("country", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Zip Code">
                <input
                  className="hq6-modal-input"
                  placeholder="Zip/Postal Code"
                  value={form.zipCode}
                  onChange={(e) => setField("zipCode", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Landmark">
                <input
                  className="hq6-modal-input"
                  placeholder="Landmark"
                  value={form.landmark}
                  onChange={(e) => setField("landmark", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Street name">
                <input
                  className="hq6-modal-input"
                  placeholder="Street name"
                  value={form.streetName}
                  onChange={(e) => setField("streetName", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Building number">
                <input
                  className="hq6-modal-input"
                  placeholder="Building number"
                  value={form.buildingNumber}
                  onChange={(e) => setField("buildingNumber", e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Additional number">
                <input
                  className="hq6-modal-input"
                  placeholder="Additional number"
                  value={form.additionalNumber}
                  onChange={(e) =>
                    setField("additionalNumber", e.target.value)
                  }
                />
              </Hq6Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CONTACT_CUSTOM_FIELD_KEYS.filter(
                (key) =>
                  !(
                    isAutomotive &&
                    isCustomerSide &&
                    (key === "customField1" ||
                      key === "customField2" ||
                      key === "customField3" ||
                      key === "customField4")
                  ),
              ).map((key) => {
                const index = CONTACT_CUSTOM_FIELD_KEYS.indexOf(key);
                return (
                  <Hq6Field
                    key={key}
                    label={CONTACT_CUSTOM_FIELD_LABELS[index]!}
                  >
                    <input
                      className="hq6-modal-input"
                      placeholder={CONTACT_CUSTOM_FIELD_LABELS[index]}
                      value={form[key]}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                  </Hq6Field>
                );
              })}
            </div>

            <Hq6Field label="Shipping Address">
              <input
                className="hq6-modal-input"
                placeholder="Search address"
                value={form.shippingAddress}
                onChange={(e) => setField("shippingAddress", e.target.value)}
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
