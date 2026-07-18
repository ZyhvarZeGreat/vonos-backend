"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal, ModalHeader } from "@/components/atoms/Modal";
import { AddProductForm } from "@/components/organisms/AddProductForm";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useUiStore } from "@/stores/uiStore";

export function AddProductModal() {
  const activeModal = useUiStore((state) => state.activeModal);
  const productFlow = useUiStore((state) => state.productFlow);
  const closeModal = useUiStore((state) => state.closeModal);
  const tenantId = useTenantId();
  const { config: tenantConfig } = useRouteTenant();
  const queryClient = useQueryClient();
  const open = activeModal === "addProduct";
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (open) setFormKey((key) => key + 1);
  }, [open, productFlow]);

  const handleClose = () => {
    closeModal();
  };

  if (!open || !tenantId) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      panelClassName="max-w-6xl max-h-[92vh] flex flex-col"
    >
      <ModalHeader title="Add new product" onClose={handleClose} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
        <AddProductForm
          key={formKey}
          tenantId={tenantId}
          tenantConfig={tenantConfig}
          retailMode={productFlow === "menu-item"}
          variant="modal"
          onCancel={handleClose}
          onSuccess={async (_item, mode) => {
            await queryClient.invalidateQueries({ queryKey: ["items"] });
            await queryClient.invalidateQueries({ queryKey: ["catalog"] });
            await queryClient.invalidateQueries({ queryKey: ["catalog-meta"] });
            if (mode !== "saveAnother") {
              handleClose();
            }
          }}
        />
      </div>
    </Modal>
  );
}
