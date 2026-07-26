"use client";

/**
 * HQ6 Notification Templates — ui-audit/62_notification-templates
 * Three boxes: Notifications / Customer / Supplier, each with tabs + template fields.
 */
import { useEffect, useMemo, useState } from "react";
import { Hq6PageHeader } from "@/components/hq6/Hq6Chrome";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/stores/toastStore";

type TemplateFields = {
  emailSubject: string;
  cc: string;
  bcc: string;
  emailBody: string;
  smsBody: string;
  whatsappText: string;
  autoEmail: boolean;
  autoSms: boolean;
  autoWhatsapp: boolean;
};

const EMPTY: TemplateFields = {
  emailSubject: "",
  cc: "",
  bcc: "",
  emailBody: "",
  smsBody: "",
  whatsappText: "",
  autoEmail: false,
  autoSms: false,
  autoWhatsapp: false,
};

type TemplateDef = {
  id: string;
  label: string;
  tags: string[];
};

const NOTIFICATION_TABS: TemplateDef[] = [
  {
    id: "cn_send_ledger",
    label: "Send Ledger",
    tags: [
      "{business_name}",
      "{business_logo}",
      "{balance_due}",
      "{contact_name}",
      "{contact_custom_field_1}",
      "{contact_custom_field_2}",
      "{contact_custom_field_3}",
      "{contact_custom_field_4}",
      "{contact_custom_field_5}",
      "{contact_custom_field_6}",
      "{contact_custom_field_7}",
      "{contact_custom_field_8}",
      "{contact_custom_field_9}",
      "{contact_custom_field_10}",
    ],
  },
];

const CUSTOMER_TABS: TemplateDef[] = [
  {
    id: "cn_new_sale",
    label: "New Sale",
    tags: ["{business_name}", "{invoice_number}", "{total_amount}", "{paid_amount}"],
  },
  {
    id: "cn_payment_received",
    label: "Payment Received",
    tags: ["{business_name}", "{invoice_number}", "{received_amount}", "{contact_name}"],
  },
  {
    id: "cn_payment_reminder",
    label: "Payment Remider",
    tags: ["{business_name}", "{invoice_number}", "{due_amount}", "{contact_name}"],
  },
  {
    id: "cn_new_booking",
    label: "New Booking",
    tags: ["{business_name}", "{booking_number}", "{contact_name}"],
  },
  {
    id: "cn_new_quotation",
    label: "New Quotation",
    tags: ["{business_name}", "{invoice_number}", "{total_amount}", "{contact_name}"],
  },
];

const SUPPLIER_TABS: TemplateDef[] = [
  {
    id: "cn_new_order",
    label: "New Order",
    tags: ["{business_name}", "{order_number}", "{contact_name}"],
  },
  {
    id: "cn_payment_paid",
    label: "Payment Paid",
    tags: ["{business_name}", "{payment_ref}", "{paid_amount}", "{contact_name}"],
  },
  {
    id: "cn_items_received",
    label: "Items Received",
    tags: ["{business_name}", "{purchase_ref}", "{contact_name}"],
  },
  {
    id: "cn_items_pending",
    label: "Items Pending",
    tags: ["{business_name}", "{purchase_ref}", "{contact_name}"],
  },
  {
    id: "cn_purchase_order",
    label: "Purchase Order",
    tags: ["{business_name}", "{order_number}", "{contact_name}"],
  },
];

const STORAGE_PREFIX = "vonos:hq6-notification-templates:";

function loadStore(tenantCode: string): Record<string, TemplateFields> {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tenantCode}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, TemplateFields>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStore(tenantCode: string, data: Record<string, TemplateFields>) {
  localStorage.setItem(`${STORAGE_PREFIX}${tenantCode}`, JSON.stringify(data));
}

function TemplateEditor({
  def,
  value,
  onChange,
}: {
  def: TemplateDef;
  value: TemplateFields;
  onChange: (next: TemplateFields) => void;
}) {
  const set = <K extends keyof TemplateFields>(key: K, v: TemplateFields[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="hq6-notif-pane" id={def.id}>
      <p className="help-block hq6-notif-tags">
        <strong>Available Tags:</strong> {def.tags.join(", ")}
      </p>
      <div className="hq6-notif-grid">
        <label className="hq6-form-label">
          <span>Email Subject:</span>
          <input
            className="form-control"
            value={value.emailSubject}
            onChange={(e) => set("emailSubject", e.target.value)}
          />
        </label>
        <label className="hq6-form-label">
          <span>CC:</span>
          <input
            className="form-control"
            value={value.cc}
            onChange={(e) => set("cc", e.target.value)}
          />
        </label>
        <label className="hq6-form-label">
          <span>BCC:</span>
          <input
            className="form-control"
            value={value.bcc}
            onChange={(e) => set("bcc", e.target.value)}
          />
        </label>
      </div>
      <label className="hq6-form-label">
        <span>Email Body:</span>
        <textarea
          className="form-control hq6-notif-body"
          rows={8}
          value={value.emailBody}
          onChange={(e) => set("emailBody", e.target.value)}
        />
      </label>
      <label className="hq6-form-label">
        <span>SMS Body:</span>
        <textarea
          className="form-control"
          rows={3}
          value={value.smsBody}
          onChange={(e) => set("smsBody", e.target.value)}
        />
      </label>
      <label className="hq6-form-label">
        <span>Whatsapp Text:</span>
        <textarea
          className="form-control"
          rows={3}
          value={value.whatsappText}
          onChange={(e) => set("whatsappText", e.target.value)}
        />
      </label>
      <div className="hq6-notif-autos">
        <label className="hq6-icheck">
          <input
            type="checkbox"
            checked={value.autoEmail}
            onChange={(e) => set("autoEmail", e.target.checked)}
          />{" "}
          Auto Send Email
        </label>
        <label className="hq6-icheck">
          <input
            type="checkbox"
            checked={value.autoSms}
            onChange={(e) => set("autoSms", e.target.checked)}
          />{" "}
          Auto Send SMS
        </label>
        <label className="hq6-icheck">
          <input
            type="checkbox"
            checked={value.autoWhatsapp}
            onChange={(e) => set("autoWhatsapp", e.target.checked)}
          />{" "}
          Auto send Whatsapp notification
        </label>
      </div>
    </div>
  );
}

function TemplateBox({
  title,
  tabs,
  activeId,
  onSelect,
  store,
  onChange,
}: {
  title: string;
  tabs: TemplateDef[];
  activeId: string;
  onSelect: (id: string) => void;
  store: Record<string, TemplateFields>;
  onChange: (id: string, next: TemplateFields) => void;
}) {
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]!;
  const value = store[active.id] ?? EMPTY;

  return (
    <div className="box box-solid hq6-notif-box tw-mb-4">
      <div className="box-header with-border">
        <h3 className="box-title">{title}</h3>
      </div>
      <div className="box-body">
        <ul className="nav nav-tabs" role="tablist">
          {tabs.map((tab) => (
            <li
              key={tab.id}
              className={cn(tab.id === active.id && "active")}
              role="presentation"
            >
              <a
                href={`#${tab.id}`}
                role="tab"
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(tab.id);
                }}
              >
                {tab.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="tab-content" style={{ paddingTop: 12 }}>
          <TemplateEditor
            def={active}
            value={value}
            onChange={(next) => onChange(active.id, next)}
          />
        </div>
      </div>
    </div>
  );
}

export function Hq6NotificationTemplatesView() {
  const { tenantCode } = useRouteTenant();
  const [store, setStore] = useState<Record<string, TemplateFields>>({});
  const [notifTab, setNotifTab] = useState(NOTIFICATION_TABS[0]!.id);
  const [customerTab, setCustomerTab] = useState(CUSTOMER_TABS[0]!.id);
  const [supplierTab, setSupplierTab] = useState(SUPPLIER_TABS[0]!.id);

  useEffect(() => {
    if (!tenantCode) return;
    setStore(loadStore(tenantCode));
  }, [tenantCode]);

  const dirtyCount = useMemo(() => Object.keys(store).length, [store]);

  const update = (id: string, next: TemplateFields) => {
    setStore((prev) => ({ ...prev, [id]: next }));
  };

  const handleSave = () => {
    if (!tenantCode) return;
    saveStore(tenantCode, store);
    toast.success("Notification templates saved on this device");
  };

  return (
    <div className="hq6-page hq6-notification-templates">
      <Hq6PageHeader title="Notification Templates" />
      <section className="content">
        <TemplateBox
          title="Notifications:"
          tabs={NOTIFICATION_TABS}
          activeId={notifTab}
          onSelect={setNotifTab}
          store={store}
          onChange={update}
        />
        <TemplateBox
          title="Customer Notifications:"
          tabs={CUSTOMER_TABS}
          activeId={customerTab}
          onSelect={setCustomerTab}
          store={store}
          onChange={update}
        />
        <TemplateBox
          title="Supplier Notifications:"
          tabs={SUPPLIER_TABS}
          activeId={supplierTab}
          onSelect={setSupplierTab}
          store={store}
          onChange={update}
        />

        <div className="text-center" style={{ marginBottom: 24 }}>
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-primary tw-text-white"
            onClick={handleSave}
            disabled={!tenantCode}
          >
            Save{dirtyCount ? "" : ""}
          </button>
        </div>
      </section>
      <p className="hq6-footer">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()}{" "}
        All rights reserved.
      </p>
    </div>
  );
}
