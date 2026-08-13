"use client";

import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";

import { paymentAmountSchema } from "@/lib/validation/schemas";
import { parseForm } from "@/lib/validation/parseForm";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Customer, CustomerContactDetails } from "@vonos/types";
import {
  CONTACT_CUSTOM_FIELD_KEYS,
  CONTACT_CUSTOM_FIELD_LABELS,
  parseCustomerContactDetails,
} from "@vonos/types";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { PaymentAccountSelect } from "@/components/hq6/PaymentAccountSelect";
import { getCustomerGroups } from "@/lib/api/customerGroups";
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
import { dismissFirstWrite } from "@/lib/utils/dismissFirstWrite";
import { patchEntityInQueries } from "@/lib/query/optimistic";
import { formatHq6Currency, formatHq6DateTime } from "@/lib/utils/hq6Format";
import { HQ6_PAYMENT_METHOD_OPTIONS } from "@/lib/utils/hq6PaymentMethods";
import {
  firstValidationError,
  sanitizeContactLastNameInput,
  sanitizePersonNameInput,
  validateContactLastName,
  validateEmail,
  validatePersonName,
  validatePhone,
} from "@/lib/utils/formValidation";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { isJobCentricTenant } from "@/lib/utils/isHq6Tenant";
import { toast } from "@/stores/toastStore";

const PAYMENT_METHODS = HQ6_PAYMENT_METHOD_OPTIONS;

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

type CustomFieldState = Record<
  (typeof CONTACT_CUSTOM_FIELD_KEYS)[number],
  string
>;

function emptyCustomFieldState(): CustomFieldState {
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
  onSaved: (updated: Customer) => void;
}) {
  const { tenantCode } = useRouteTenant();
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
  const [openingBalance, setOpeningBalance] = useState("");
  const [payTermNumber, setPayTermNumber] = useState("");
  const [payTermType, setPayTermType] = useState<"" | "days" | "months">("");
  const [creditLimit, setCreditLimit] = useState("");
  const [moreOpen, setMoreOpen] = useState(true);
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [streetName, setStreetName] = useState("");
  const [buildingNumber, setBuildingNumber] = useState("");
  const [additionalNumber, setAdditionalNumber] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [customFields, setCustomFields] = useState(emptyCustomFieldState);
  const [saving, setSaving] = useState(false);

  const { data: groups = [] } = useQuery({
    queryKey: modalKeys.customerGroups(tenantId),
    queryFn: () => getCustomerGroups(tenantId!),
    enabled: Boolean(open && tenantId),
    staleTime: MODAL_REF_STALE_MS,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!open || !customer) return;
    const details = parseCustomerContactDetails(customer.details);
    const looksBusiness =
      details.contactKind === "business" ||
      Boolean(
        details.businessName &&
          details.businessName.trim() &&
          details.businessName !== customer.name,
      );
    setContactKind(looksBusiness ? "business" : "individual");
    setContactId(details.contactId ?? customer.contactId ?? "");
    setCustomerGroupId(customer.customerGroupId ?? "");
    setBusinessName(
      details.businessName ??
        (looksBusiness ? (customer.businessName ?? "") : ""),
    );
    setPrefix(details.prefix ?? "");
    setFirstName(details.firstName ?? customer.name);
    setMiddleName(details.middleName ?? "");
    setLastName(details.lastName ?? "");
    setMobile(customer.phone ?? "");
    setAlternateNumber(details.alternateNumber ?? "");
    setLandline(details.landline ?? "");
    setEmail(customer.email ?? "");
    setTaxNumber(customer.taxNumber ?? "");
    setOpeningBalance(
      customer.openingBalance ? String(customer.openingBalance) : "",
    );
    setPayTermNumber(
      details.payTermNumber != null ? String(details.payTermNumber) : "",
    );
    setPayTermType(details.payTermType ?? "");
    setCreditLimit(
      details.creditLimit != null ? String(details.creditLimit) : "",
    );
    setMoreOpen(true);
    setAddress1(details.addressLine1 ?? "");
    setAddress2(details.addressLine2 ?? "");
    setCity(details.city ?? "");
    setState(details.state ?? "");
    setCountry(details.country ?? "");
    setZipCode(details.zipCode ?? "");
    setLandmark(details.landmark ?? "");
    setStreetName(details.streetName ?? "");
    setBuildingNumber(details.buildingNumber ?? "");
    setAdditionalNumber(details.additionalNumber ?? "");
    setShippingAddress(details.shippingAddress ?? "");
    const nextCustoms = emptyCustomFieldState();
    for (const key of CONTACT_CUSTOM_FIELD_KEYS) {
      nextCustoms[key] = details[key] ?? "";
    }
    setCustomFields(nextCustoms);
  }, [customer, open]);

  // Job-centric tenants use the vehicle registration as the (required) Contact ID.
  const isAutomotive = isJobCentricTenant(tenantCode);
  const contactIdLabel = isAutomotive
    ? "Vehicle Registration No."
    : "Contact ID";

  const handleUpdate = async () => {
    if (!tenantId || !customer) return;
    if (contactKind === "business" && !businessName.trim()) {
      toast.error("Business Name is required");
      return;
    }
    const isWalkIn =
      (customer?.name ?? "").trim().toLowerCase() === "walk-in customer";
    if (!isWalkIn && !contactId.trim()) {
      toast.error(`${contactIdLabel} is required`);
      return;
    }
    const composed = [prefix, firstName, middleName, lastName]
      .map((p) => p.trim())
      .filter(Boolean)
      .join(" ");
    const personName = composed || firstName.trim();
    const name =
      contactKind === "business"
        ? businessName.trim() || personName
        : personName;
    const validationError = firstValidationError(
      contactKind === "individual"
        ? validatePersonName(firstName, "First name")
        : null,
      validatePersonName(prefix, "Prefix", { required: false }),
      validatePersonName(middleName, "Middle name", { required: false }),
      validateContactLastName(lastName, { required: false }),
      !name
        ? contactKind === "business"
          ? "Business Name is required"
          : "First Name is required"
        : null,
      validatePhone(mobile, { required: true, label: "Mobile" }),
      validatePhone(alternateNumber, {
        required: false,
        label: "Alternate number",
      }),
      validatePhone(landline, { required: false, label: "Landline" }),
      validateEmail(email, { required: false }),
    );
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const balance = Number(openingBalance);
    if (Number.isNaN(balance)) {
      toast.error("Opening balance must be a number");
      return;
    }
    if (creditLimit.trim() && Number.isNaN(Number(creditLimit))) {
      toast.error("Credit limit must be a number");
      return;
    }

    const payTermRaw = payTermNumber.trim();
    const payTermParsed =
      payTermRaw === "" ? null : Number.parseInt(payTermRaw, 10);
    const creditRaw = creditLimit.trim();
    const creditParsed =
      creditRaw === "" ? null : Number.parseFloat(creditRaw);

    const custom: Partial<CustomerContactDetails> = {};
    for (const key of CONTACT_CUSTOM_FIELD_KEYS) {
      const value = customFields[key].trim();
      custom[key] = value || null;
    }

    const details: CustomerContactDetails = {
      contactKind,
      contactId: contactId.trim() || null,
      businessName:
        contactKind === "business" ? businessName.trim() || null : null,
      prefix: prefix.trim() || null,
      firstName: firstName.trim() || null,
      middleName: middleName.trim() || null,
      lastName: lastName.trim() || null,
      alternateNumber: alternateNumber.trim() || null,
      landline: landline.trim() || null,
      payTermNumber:
        payTermParsed != null && Number.isFinite(payTermParsed)
          ? payTermParsed
          : null,
      payTermType: payTermType || null,
      creditLimit:
        creditParsed != null && Number.isFinite(creditParsed)
          ? creditParsed
          : null,
      addressLine1: address1.trim() || null,
      addressLine2: address2.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      country: country.trim() || null,
      zipCode: zipCode.trim() || null,
      landmark: landmark.trim() || null,
      streetName: streetName.trim() || null,
      buildingNumber: buildingNumber.trim() || null,
      additionalNumber: additionalNumber.trim() || null,
      shippingAddress: shippingAddress.trim() || null,
      ...custom,
    };

    setSaving(true);
    const optimistic: Customer = {
      ...customer,
      name,
      email: email.trim() || null,
      phone: mobile.trim() || null,
      customerGroupId:
        contactKind === "individual" ? customerGroupId || null : null,
      openingBalance: balance,
      taxNumber: taxNumber.trim() || null,
      contactId: contactId.trim() || customer.contactId,
      businessName:
        contactKind === "business"
          ? businessName.trim() || null
          : customer.businessName,
      details,
    };
    void dismissFirstWrite({
      dismiss: () => {
        onSaved(optimistic);
        onClose();
        setSaving(false);
      },
      write: () =>
        updateCustomer(tenantId, customer.id, {
          name,
          email: email.trim() || null,
          phone: mobile.trim() || null,
          customerGroupId:
            contactKind === "individual" ? customerGroupId || null : null,
          openingBalance: balance,
          taxNumber: taxNumber.trim() || null,
          details,
        }),
      label: "Updating contact",
      successMessage: "Contact updated",
      onSuccess: (updated) => {
        onSaved(updated);
      },
    });
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
        <div className="grid gap-3 sm:grid-cols-2 sm:items-center">
          <Hq6Field label="Contact type" required>
            <select className="hq6-modal-input" value="customer" disabled>
              <option value="customer">Customers</option>
            </select>
          </Hq6Field>
          <div className="flex items-center justify-center gap-6 self-center text-sm text-[#111827]">
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
                onChange={() => {
                  setContactKind("business");
                  setCustomerGroupId("");
                  setMoreOpen(true);
                }}
              />
              Business
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Hq6Field
            label={contactIdLabel}
            required
            hint={
              isAutomotive ? (
                <span className="ml-1 text-xs font-normal text-[#6b7280]">
                  Used as the customer ID
                </span>
              ) : null
            }
          >
            <input
              className="hq6-modal-input"
              value={contactId}
              placeholder={isAutomotive ? "e.g. ABC-123-XY" : "Contact ID"}
              onChange={(e) =>
                setContactId(
                  isAutomotive ? e.target.value.toUpperCase() : e.target.value,
                )
              }
            />
          </Hq6Field>
          {contactKind === "individual" ? (
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
          ) : (
            <div />
          )}
        </div>

        {contactKind === "business" ? (
          <Hq6Field label="Business Name" required>
            <input
              className="hq6-modal-input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business Name"
            />
          </Hq6Field>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-4">
          <Hq6Field label="Prefix">
            <input
              className="hq6-modal-input"
              value={prefix}
              onChange={(e) =>
                setPrefix(sanitizePersonNameInput(e.target.value))
              }
            />
          </Hq6Field>
          <Hq6Field label="First Name" required>
            <input
              className="hq6-modal-input"
              value={firstName}
              onChange={(e) =>
                setFirstName(sanitizePersonNameInput(e.target.value))
              }
            />
          </Hq6Field>
          <Hq6Field label="Middle name">
            <input
              className="hq6-modal-input"
              value={middleName}
              onChange={(e) =>
                setMiddleName(sanitizePersonNameInput(e.target.value))
              }
            />
          </Hq6Field>
          <Hq6Field label="Last Name">
            <input
              className="hq6-modal-input"
              value={lastName}
              placeholder="Name or plate / reg. no."
              onChange={(e) =>
                setLastName(sanitizeContactLastNameInput(e.target.value))
              }
            />
          </Hq6Field>
        </div>

        {isAutomotive ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Hq6Field label="Car Model & Year">
              <input
                className="hq6-modal-input"
                placeholder="e.g. COROLLA 2009"
                value={customFields.customField3}
                onChange={(e) =>
                  setCustomFields((prev) => ({
                    ...prev,
                    customField3: e.target.value,
                  }))
                }
              />
            </Hq6Field>
            <Hq6Field label="Milage">
              <input
                className="hq6-modal-input"
                placeholder="Milage"
                value={customFields.customField1}
                onChange={(e) =>
                  setCustomFields((prev) => ({
                    ...prev,
                    customField1: e.target.value,
                  }))
                }
              />
            </Hq6Field>
            <Hq6Field label="VIN Number">
              <input
                className="hq6-modal-input"
                placeholder="VIN Number"
                value={customFields.customField2}
                onChange={(e) =>
                  setCustomFields((prev) => ({
                    ...prev,
                    customField2: e.target.value,
                  }))
                }
              />
            </Hq6Field>
            <Hq6Field label="Customer Location">
              <input
                className="hq6-modal-input"
                placeholder="Customer Location"
                value={customFields.customField4}
                onChange={(e) =>
                  setCustomFields((prev) => ({
                    ...prev,
                    customField4: e.target.value,
                  }))
                }
              />
            </Hq6Field>
          </div>
        ) : null}

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

        <button
          type="button"
          className="hq6-btn w-full border border-[#c4b5fd] bg-[#ede9fe] text-[#5b21b6]"
          onClick={() => setMoreOpen((v) => !v)}
        >
          More Informations {moreOpen ? "▴" : "▾"}
        </button>

        {moreOpen ? (
          <div className="space-y-3">
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
                <div className="flex gap-2">
                  <input
                    className="hq6-modal-input min-w-0 flex-1"
                    inputMode="numeric"
                    value={payTermNumber}
                    onChange={(e) => setPayTermNumber(e.target.value)}
                  />
                  <select
                    className="hq6-modal-input w-[9rem] shrink-0"
                    value={payTermType}
                    onChange={(e) =>
                      setPayTermType(
                        e.target.value as "" | "days" | "months",
                      )
                    }
                  >
                    <option value="">Please Select</option>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </Hq6Field>
              <Hq6Field label="Credit Limit">
                <input
                  className="hq6-modal-input"
                  value={creditLimit}
                  placeholder="Keep blank for no limit"
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
              </Hq6Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Hq6Field label="Address line 1">
                <input
                  className="hq6-modal-input"
                  placeholder="Address line 1"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Address line 2">
                <input
                  className="hq6-modal-input"
                  placeholder="Address line 2"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                />
              </Hq6Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Hq6Field label="City">
                <input
                  className="hq6-modal-input"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="State">
                <input
                  className="hq6-modal-input"
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Country">
                <input
                  className="hq6-modal-input"
                  placeholder="Country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Zip Code">
                <input
                  className="hq6-modal-input"
                  placeholder="Zip/Postal Code"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Landmark">
                <input
                  className="hq6-modal-input"
                  placeholder="Landmark"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Street name">
                <input
                  className="hq6-modal-input"
                  placeholder="Street name"
                  value={streetName}
                  onChange={(e) => setStreetName(e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Building number">
                <input
                  className="hq6-modal-input"
                  placeholder="Building number"
                  value={buildingNumber}
                  onChange={(e) => setBuildingNumber(e.target.value)}
                />
              </Hq6Field>
              <Hq6Field label="Additional number">
                <input
                  className="hq6-modal-input"
                  placeholder="Additional number"
                  value={additionalNumber}
                  onChange={(e) => setAdditionalNumber(e.target.value)}
                />
              </Hq6Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CONTACT_CUSTOM_FIELD_KEYS.filter(
                (key) =>
                  !isAutomotive ||
                  (key !== "customField1" &&
                    key !== "customField2" &&
                    key !== "customField3" &&
                    key !== "customField4"),
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
                      value={customFields[key]}
                      onChange={(e) =>
                        setCustomFields((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  </Hq6Field>
                );
              })}
            </div>

            <Hq6Field label="Shipping Address">
              <input
                className="hq6-modal-input"
                placeholder="Search address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
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
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(nowPaidOnLocal);

  const { data: summary } = useQuery({
    queryKey: ["customer-summary", tenantId, customer?.id, "pay-modal"],
    queryFn: () => getCustomerSummary(tenantId!, customer!.id),
    enabled: Boolean(open && tenantId && customer?.id),
    staleTime: MODAL_RECORD_STALE_MS,
    placeholderData: (prev) => prev,
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
    setAmount(totals.totalDue > 0 ? totals.totalDue.toFixed(2) : "");
    setMethod("cash");
    setAccountId("");
    setNote("");
    setPaidOn(nowPaidOnLocal());
    // Reset only when the modal opens for this customer — not when totals refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- totals snapshotted on open
  }, [open, customer?.id]);

  const handleSave = async () => {
    if (!tenantId || !customer) return;
    const valid = parseForm(paymentAmountSchema, { amount });
    if (!valid) return;
    if (!accountId.trim()) {
      toast.error(
        "Select a Payment Account so this payment posts to the account book",
      );
      return;
    }
    const value = Number(valid.amount);
    const customerId = customer.id;
    const apply = Math.min(
      value,
      totals.totalDue > 0 ? totals.totalDue : value,
    );
    const nextPaid = (totals.totalPaid ?? 0) + apply;
    const remaining = Math.max(0, totals.totalDue - apply);
    patchEntityInQueries(queryClient, ["customers"], customerId, {
      totalSellPaid: nextPaid,
      totalSellDue: remaining,
    });
    await dismissFirstWrite({
      dismiss: onClose,
      label: "Recording payment",
      write: () =>
        payCustomerDue(tenantId, customerId, {
          amount: value,
          method,
          accountId,
          note: note.trim() || undefined,
          paidOn: paidOnToIso(paidOn),
        }),
      successMessage: (result) =>
        `Applied ${formatHq6Currency(result.amountApplied, result.currency)} — remaining due ${formatHq6Currency(result.remainingDue, result.currency)}`,
      errorMessage: "Payment failed",
      onSuccess: (result) => {
        patchEntityInQueries(queryClient, ["customers"], customerId, {
          totalSellPaid: Math.max(
            0,
            (totals.totalAmount ?? 0) - Number(result.remainingDue ?? 0),
          ),
          totalSellDue: Math.max(0, Number(result.remainingDue ?? 0)),
        });
        onPaid();
      },
    });
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
          saving={false}
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
                <Hq6DateTimeInput
                  className="hq6-modal-input"
            value={paidOn}
            onChange={(v) => setPaidOn(v)}
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
        <Hq6Field label="Payment Account" required>
          <PaymentAccountSelect
            value={accountId}
            onChange={setAccountId}
            emptyLabel="Please Select"
          />
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
