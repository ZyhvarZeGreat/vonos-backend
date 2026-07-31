"use client";

import {
  Hq6AddContactModal,
  type Hq6ContactType,
} from "@/components/hq6/Hq6AddContactModal";

/**
 * HQ6 “Add a new contact” — customers entry point
 * (Individual → Customer Group; Business → Business Name + More Informations).
 * Contact type can be switched to Suppliers / Both inside the shared modal.
 */
export function Hq6AddCustomerModal({
  open,
  tenantId,
  onClose,
  onSaved,
  defaultType = "customer",
}: {
  open: boolean;
  tenantId: string | null;
  onClose: () => void;
  onSaved?: () => void;
  defaultType?: Hq6ContactType;
}) {
  return (
    <Hq6AddContactModal
      open={open}
      tenantId={tenantId}
      defaultType={defaultType}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
