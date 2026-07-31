"use client";

import {
  Hq6AddContactModal,
  type Hq6ContactType,
} from "@/components/hq6/Hq6AddContactModal";

/**
 * HQ6 “Add a new contact” — suppliers entry point
 * (no middle name; account details).
 * Contact type can be switched to Customers / Both inside the shared modal.
 */
export function Hq6AddSupplierModal({
  open,
  tenantId,
  onClose,
  onSaved,
  defaultType = "supplier",
}: {
  open: boolean;
  tenantId: string | null;
  onClose: () => void;
  onSaved?: (result?: {
    contactType: Hq6ContactType;
    customerId?: string;
    supplierId?: string;
  }) => void;
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
