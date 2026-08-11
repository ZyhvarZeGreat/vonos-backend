"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Modal, ModalHeader } from "@/components/atoms/Modal";
import { AddSaleForm } from "@/components/organisms/AddSaleForm";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { getSaleInvoiceUrl } from "@/lib/api/sales";
import { getTenantConfigById } from "@/lib/registries/tenantConfigs";
import { ENTITY_LIST } from "@/lib/registries/tenants";
import { useUiStore } from "@/stores/uiStore";
import { tenantBasePath } from "@/lib/utils/tenantMount";

export function AddSaleModal() {
  const router = useRouter();
  const pathname = usePathname();
  const activeModal = useUiStore((state) => state.activeModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const financeActionTenantId = useUiStore((state) => state.financeActionTenantId);
  const salePresetStatus = useUiStore((state) => state.salePresetStatus);
  const saleJobId = useUiStore((state) => state.saleJobId);
  const routeTenantId = useTenantId();
  const tenantId = financeActionTenantId ?? routeTenantId;
  const { config: routeConfig, tenantCode } = useRouteTenant();
  const isHq6 = useIsVaHq6();
  const onAdmin = Boolean(pathname?.startsWith("/admin"));
  /** VAG finance bar: keep modal on Group admin (do not redirect into an entity app). */
  const stayInAdmin = onAdmin && Boolean(financeActionTenantId);
  const tenantConfig =
    financeActionTenantId && financeActionTenantId !== routeTenantId
      ? getTenantConfigById(financeActionTenantId)
      : routeConfig;
  const open = activeModal === "addSale";
  const presetStatus = salePresetStatus ?? "final";
  const [formKey, setFormKey] = useState(0);

  const entityLabel = useMemo(() => {
    if (!tenantId) return null;
    const hit = ENTITY_LIST.find((e) => e.tenantId === tenantId);
    return hit ? hit.name.replace(/^Vonos\s+/i, "") : null;
  }, [tenantId]);

  // HQ6 entity apps: Add Sale is a full page — except VAG admin in-place flow.
  useEffect(() => {
    if (!open || !isHq6 || stayInAdmin || !tenantCode) return;
    const slug =
      presetStatus === "draft"
        ? "add-draft"
        : presetStatus === "quotation"
          ? "add-quotation"
          : "add-sale";
    const params = new URLSearchParams();
    if (saleJobId) params.set("job", saleJobId);
    const qs = params.toString();
    closeModal();
    router.push(`${tenantBasePath(tenantCode)}/${slug}${qs ? `?${qs}` : ""}`);
  }, [
    closeModal,
    isHq6,
    open,
    presetStatus,
    router,
    saleJobId,
    stayInAdmin,
    tenantCode,
  ]);

  useEffect(() => {
    if (open) setFormKey((key) => key + 1);
  }, [open, presetStatus, saleJobId, tenantId]);

  const modalTitle =
    presetStatus === "draft"
      ? "Add Draft"
      : presetStatus === "quotation"
        ? "Add Quotation"
        : "Add Sale";

  const handleClose = () => {
    closeModal();
  };

  if (!open || !tenantId || (isHq6 && !stayInAdmin) || !tenantConfig) return null;

  const body = (
    <AddSaleForm
      key={formKey}
      tenantId={tenantId}
      tenantConfig={tenantConfig}
      presetStatus={presetStatus}
      initialJobId={saleJobId}
      variant="modal"
      onCancel={handleClose}
      onSuccess={async (sale, options) => {
        // Lists already invalidate via AddSaleForm invalidateKeys — don't block UX.
        handleClose();
        if (!options?.print) return;
        const path =
          sale.invoicePath?.trim() ||
          (await getSaleInvoiceUrl(tenantId, sale.id).then((r) => r.path).catch(() => null));
        if (!path) return;
        router.push(`${path}?print_on_load=true`);
      }}
    />
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      panelClassName="max-w-5xl max-h-[92vh] flex flex-col"
    >
      <ModalHeader
        title={modalTitle}
        subtitle={
          entityLabel ? `Posting for ${entityLabel}` : undefined
        }
        onClose={handleClose}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">{body}</div>
    </Modal>
  );
}
