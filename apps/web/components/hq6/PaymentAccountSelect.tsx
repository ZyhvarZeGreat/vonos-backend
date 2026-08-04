"use client";

import { useCallback, useEffect, useState } from "react";
import { AsyncMenuSelect } from "@/components/molecules/AsyncMenuSelect";
import { getPaymentAccountsForPicker } from "@/lib/api/paymentAccounts";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

type Option = { value: string; label: string };

type Props = {
  value: string;
  onChange: (accountId: string) => void;
  disabled?: boolean;
  id?: string;
  emptyLabel?: string;
};

/**
 * Searchable payment-account picker for Add/Edit Payment flows.
 * Open cash tills and bank accounts (same set as your Payment Accounts list).
 */
export function PaymentAccountSelect({
  value,
  onChange,
  disabled,
  id,
  emptyLabel = "Please Select",
}: Props) {
  const tenantId = useTenantId();
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>();

  useEffect(() => {
    if (!tenantId || !value) {
      setSelectedLabel(undefined);
      return;
    }
    let cancelled = false;
    void getPaymentAccountsForPicker(tenantId).then((accounts) => {
      if (cancelled) return;
      const match = accounts.find((a) => a.id === value);
      setSelectedLabel(match?.name);
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId, value]);

  const loadOptions = useCallback(
    async (query: string): Promise<Option[]> => {
      if (!tenantId) return [{ value: "", label: emptyLabel }];
      const accounts = await getPaymentAccountsForPicker(tenantId, {
        search: query || undefined,
      });
      return [
        { value: "", label: emptyLabel },
        ...accounts.map((a) => ({
          value: a.id,
          label: a.accountNumber ? `${a.name} (${a.accountNumber})` : a.name,
        })),
      ];
    },
    [emptyLabel, tenantId],
  );

  return (
    <AsyncMenuSelect
      id={id}
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      loadOptions={loadOptions}
      debounceMs={0}
      disabled={disabled}
      placeholder={emptyLabel}
      emptyMessage="No matching payment accounts"
      prefetchKey={tenantId}
    />
  );
}
