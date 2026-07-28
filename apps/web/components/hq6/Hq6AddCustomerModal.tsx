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
import type { Customer } from "@vonos/types";
import { toast } from "@/stores/toastStore";

function resetAddCustomerForm() {
  return {
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
  };
}

/**
 * HQ6 “Add a new contact” — customers (Individual → Customer Group;
 * Business → Business Name + More Informations).
 */
export function Hq6AddCustomerModal({
  open,
  tenantId,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(resetAddCustomerForm);
  const [moreOpen, setMoreOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: modalKeys.usersFilter(tenantId),
    queryFn: () => getUsers(tenantId!, { limit: TYPEAHEAD_PAGE_SIZE }),
    enabled: Boolean(open && tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });

  const { data: groups = [] } = useQuery({
    queryKey: modalKeys.customerGroups(tenantId),
    queryFn: () => getCustomerGroups(tenantId!),
    enabled: Boolean(open && tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });

  useEffect(() => {
    if (!open) return;
    setDismissed(false);
    setForm(resetAddCustomerForm());
    setMoreOpen(false);
  }, [open]);

  const setField = <K extends keyof ReturnType<typeof resetAddCustomerForm>>(
    key: K,
    value: ReturnType<typeof resetAddCustomerForm>[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!tenantId) return;
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

    setSaving(true);
    const now = new Date().toISOString();
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
        setDismissed(true);
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
      opt.onSuccess(created, undefined);
      toast.success("Customer added");
      onSaved?.();
      onClose();
    } catch (err) {
      opt.onError(err, undefined, ctx);
      setDismissed(false);
      toast.error(
        err instanceof Error ? err.message : "Failed to add customer",
      );
    } finally {
      await opt.onSettled();
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
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-end">
          <Hq6Field label="Contact type" required>
            <select className="hq6-modal-input" value="customers" disabled>
              <option value="customers">Customers</option>
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

        {form.contactKind === "individual" ? (
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
        ) : (
          <Hq6Field label="Business Name" required>
            <input
              className="hq6-modal-input"
              placeholder="Business Name"
              value={form.businessName}
              onChange={(e) => setField("businessName", e.target.value)}
            />
          </Hq6Field>
        )}

        <div className="grid gap-3 sm:grid-cols-4">
          <Hq6Field label="Prefix">
            <input
              className="hq6-modal-input"
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
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
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
                placeholder="Keep blank for no limit"
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
    </Hq6Modal>
  );
}
