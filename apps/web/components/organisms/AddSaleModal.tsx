"use client";

import { useEffect, useState } from "react";
import { Modal, ModalHeader } from "@/components/atoms/Modal";
import { AddSaleForm } from "@/components/organisms/AddSaleForm";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { getTenantConfigById } from "@/lib/registries/tenantConfigs";
import { useUiStore } from "@/stores/uiStore";
import { useQueryClient } from "@tanstack/react-query";

export function AddSaleModal() {
  const activeModal = useUiStore((state) => state.activeModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const financeActionTenantId = useUiStore((state) => state.financeActionTenantId);
  const salePresetStatus = useUiStore((state) => state.salePresetStatus);
  const saleJobId = useUiStore((state) => state.saleJobId);
  const routeTenantId = useTenantId();
  const tenantId = financeActionTenantId ?? routeTenantId;
  const { config: routeConfig } = useRouteTenant();
  const tenantConfig =
    financeActionTenantId && financeActionTenantId !== routeTenantId
      ? getTenantConfigById(financeActionTenantId)
      : routeConfig;
  const queryClient = useQueryClient();
  const open = activeModal === "addSale";
  const presetStatus = salePresetStatus ?? "final";
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (open) setFormKey((key) => key + 1);
  }, [open, presetStatus, saleJobId]);

  const modalTitle =
    presetStatus === "draft"
      ? "Add Draft"
      : presetStatus === "quotation"
        ? "Add Quotation"
        : "Add Sale";

  const handleClose = () => {
    closeModal();
  };

  if (!open || !tenantId) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      panelClassName="max-w-5xl max-h-[92vh] flex flex-col"
    >
      <ModalHeader title={modalTitle} onClose={handleClose} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
        <AddSaleForm
          key={formKey}
          tenantId={tenantId}
          tenantConfig={tenantConfig}
          presetStatus={presetStatus}
          initialJobId={saleJobId}
          variant="modal"
          onCancel={handleClose}
          onSuccess={async () => {
            await queryClient.invalidateQueries({ queryKey: ["sales"] });
            await queryClient.invalidateQueries({ queryKey: ["items"] });
            await queryClient.invalidateQueries({ queryKey: ["catalog"] });
            await queryClient.invalidateQueries({ queryKey: ["jobs"] });
            await queryClient.invalidateQueries({ queryKey: ["job"] });
            await queryClient.invalidateQueries({ queryKey: ["ledgerTablePage"] });
            await queryClient.invalidateQueries({ queryKey: ["ledgerSummary"] });
            await queryClient.invalidateQueries({
              queryKey: ["adminFinanceSummary"],
            });
            await queryClient.invalidateQueries({
              queryKey: ["ledgerChartEntries"],
            });
            handleClose();
          }}
        />
      </div>
      {/* Actions are inside AddSaleForm so page and modal stay identical */}
    </Modal>
  );
}
