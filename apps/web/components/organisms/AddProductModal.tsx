"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal, ModalHeader } from "@/components/atoms/Modal";
import { AddProductForm } from "@/components/organisms/AddProductForm";
import { getItem } from "@/lib/api/items";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useUiStore } from "@/stores/uiStore";

export function AddProductModal() {
  const router = useRouter();
  const activeModal = useUiStore((state) => state.activeModal);
  const productFlow = useUiStore((state) => state.productFlow);
  const duplicateFromId = useUiStore((state) => state.productDuplicateFromId);
  const closeModal = useUiStore((state) => state.closeModal);
  const tenantId = useTenantId();
  const { config: tenantConfig, tenantCode } = useRouteTenant();
  const isHq6 = useIsVaHq6();
  const queryClient = useQueryClient();
  const open = activeModal === "addProduct";
  const [formKey, setFormKey] = useState(0);

  // HQ6: Add / Duplicate Product are full pages (`/products/create`), not modals.
  useEffect(() => {
    if (!open || !isHq6 || !tenantCode) return;
    const qs = duplicateFromId ? `?d=${duplicateFromId}` : "";
    closeModal();
    router.push(`/${tenantCode}/add-product${qs}`);
  }, [closeModal, duplicateFromId, isHq6, open, router, tenantCode]);

  const { data: duplicateFrom } = useQuery({
    queryKey: ["item", "duplicate", duplicateFromId],
    queryFn: () => getItem(duplicateFromId!),
    enabled: Boolean(open && duplicateFromId && !isHq6),
  });

  useEffect(() => {
    if (open) setFormKey((key) => key + 1);
  }, [open, productFlow, duplicateFromId, duplicateFrom?.id]);

  const handleClose = () => {
    closeModal();
  };

  if (!open || !tenantId || isHq6) return null;

  const body = (
    <AddProductForm
      key={formKey}
      tenantId={tenantId}
      tenantConfig={tenantConfig}
      retailMode={productFlow === "menu-item"}
      variant="modal"
      duplicateFrom={duplicateFromId ? duplicateFrom ?? null : null}
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
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      panelClassName="max-w-6xl max-h-[92vh] flex flex-col"
    >
      <ModalHeader
        title={duplicateFromId ? "Duplicate product" : "Add new product"}
        onClose={handleClose}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">{body}</div>
    </Modal>
  );
}
