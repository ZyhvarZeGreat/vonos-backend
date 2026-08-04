"use client";

/**
 * HQ6 Tax Rates — ui-audit/68_tax-rates
 * Two boxes: "All your tax rates" + "Tax groups ( Combination of multiple taxes )"
 * Add/Edit open Hq6Modal (localStorage until tax API exists).
 */
import { matchSearchRows } from "@/lib/utils/listClientSearch";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6PageHeader } from "@/components/hq6/Hq6Chrome";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { UposDataTablesShell } from "@/components/upos/UposDataTablesShell";
import { UposGradientActionButton } from "@/components/upos/UposNavTabs";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { toast } from "@/stores/toastStore";

type TaxRateRow = {
  id: string;
  name: string;
  rate: number;
  forTaxGroupOnly: boolean;
};

type TaxGroupRow = {
  id: string;
  name: string;
  rateIds: string[];
};

const RATES_PREFIX = "vonos:hq6-tax-rates:";
const GROUPS_PREFIX = "vonos:hq6-tax-groups:";

const DEFAULT_RATES: TaxRateRow[] = [
  { id: "vat", name: "VAT", rate: 7.5, forTaxGroupOnly: false },
  { id: "wht-vat", name: "WHT/VAT", rate: 15.5, forTaxGroupOnly: false },
];

function loadRates(tenantId: string | null): TaxRateRow[] {
  if (!tenantId || typeof window === "undefined") return DEFAULT_RATES;
  try {
    const raw = window.localStorage.getItem(`${RATES_PREFIX}${tenantId}`);
    if (!raw) return DEFAULT_RATES;
    const parsed = JSON.parse(raw) as TaxRateRow[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_RATES;
    return parsed.map((row) => ({
      ...row,
      forTaxGroupOnly: Boolean(row.forTaxGroupOnly),
    }));
  } catch {
    return DEFAULT_RATES;
  }
}

function saveRates(tenantId: string, rows: TaxRateRow[]) {
  window.localStorage.setItem(`${RATES_PREFIX}${tenantId}`, JSON.stringify(rows));
}

function loadGroups(tenantId: string | null): TaxGroupRow[] {
  if (!tenantId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${GROUPS_PREFIX}${tenantId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TaxGroupRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGroups(tenantId: string, rows: TaxGroupRow[]) {
  window.localStorage.setItem(`${GROUPS_PREFIX}${tenantId}`, JSON.stringify(rows));
}

export function Hq6TaxRatesView() {
  const tenantId = useTenantId();
  const [rates, setRates] = useState<TaxRateRow[]>(DEFAULT_RATES);
  const [groups, setGroups] = useState<TaxGroupRow[]>([]);
  const [rateSearch, setRateSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [ratePageSize, setRatePageSize] = useState(HQ6_TABLE_PAGE_SIZE);
  const [groupPageSize, setGroupPageSize] = useState(HQ6_TABLE_PAGE_SIZE);

  const [rateModal, setRateModal] = useState<"add" | "edit" | null>(null);
  const [editingRate, setEditingRate] = useState<TaxRateRow | null>(null);
  const [rateName, setRateName] = useState("");
  const [rateAmount, setRateAmount] = useState("");
  const [forTaxGroupOnly, setForTaxGroupOnly] = useState(false);

  const [groupModal, setGroupModal] = useState<"add" | "edit" | null>(null);
  const [editingGroup, setEditingGroup] = useState<TaxGroupRow | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupRateIds, setGroupRateIds] = useState<string[]>([]);

  useEffect(() => {
    setRates(loadRates(tenantId));
    setGroups(loadGroups(tenantId));
  }, [tenantId]);

  const persistRates = (next: TaxRateRow[]) => {
    setRates(next);
    if (tenantId) saveRates(tenantId, next);
  };

  const persistGroups = (next: TaxGroupRow[]) => {
    setGroups(next);
    if (tenantId) saveGroups(tenantId, next);
  };

  const rateById = useMemo(() => {
    const map = new Map(rates.map((r) => [r.id, r]));
    return map;
  }, [rates]);

  const filteredRates = useMemo(
    () => matchSearchRows(rates, rateSearch, ["name"]),
    [rateSearch, rates],
  );

  const filteredGroups = useMemo(
    () => matchSearchRows(groups, groupSearch, ["name"]),
    [groupSearch, groups],
  );

  const openAddRate = () => {
    setEditingRate(null);
    setRateName("");
    setRateAmount("");
    setForTaxGroupOnly(false);
    setRateModal("add");
  };

  const openEditRate = (row: TaxRateRow) => {
    setEditingRate(row);
    setRateName(row.name);
    setRateAmount(String(row.rate));
    setForTaxGroupOnly(row.forTaxGroupOnly);
    setRateModal("edit");
  };

  const openAddGroup = () => {
    setEditingGroup(null);
    setGroupName("");
    setGroupRateIds([]);
    setGroupModal("add");
  };

  const openEditGroup = (row: TaxGroupRow) => {
    setEditingGroup(row);
    setGroupName(row.name);
    setGroupRateIds([...row.rateIds]);
    setGroupModal("edit");
  };

  const saveRate = () => {
    const name = rateName.trim();
    const rate = Number.parseFloat(rateAmount);
    if (!name) {
      toast.error("Enter a name");
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      toast.error("Enter a valid tax rate %");
      return;
    }
    if (rateModal === "edit" && editingRate) {
      persistRates(
        rates.map((r) =>
          r.id === editingRate.id
            ? { ...r, name, rate, forTaxGroupOnly }
            : r,
        ),
      );
      toast.success("Tax rate updated");
    } else {
      persistRates([
        {
          id: crypto.randomUUID(),
          name,
          rate,
          forTaxGroupOnly,
        },
        ...rates,
      ]);
      toast.success("Tax rate saved on this device");
    }
    setRateModal(null);
  };

  const saveGroup = () => {
    const name = groupName.trim();
    if (!name) {
      toast.error("Enter a name");
      return;
    }
    if (groupRateIds.length === 0) {
      toast.error("Select at least one sub tax");
      return;
    }
    if (groupModal === "edit" && editingGroup) {
      persistGroups(
        groups.map((g) =>
          g.id === editingGroup.id
            ? { ...g, name, rateIds: groupRateIds }
            : g,
        ),
      );
      toast.success("Tax group updated");
    } else {
      persistGroups([
        { id: crypto.randomUUID(), name, rateIds: groupRateIds },
        ...groups,
      ]);
      toast.success("Tax group saved on this device");
    }
    setGroupModal(null);
  };

  const groupRateTotal = (rateIds: string[]) =>
    rateIds.reduce((sum, id) => sum + (rateById.get(id)?.rate ?? 0), 0);

  const groupSubTaxesLabel = (rateIds: string[]) =>
    rateIds
      .map((id) => rateById.get(id)?.name)
      .filter(Boolean)
      .join(", ") || "—";

  const rateColumns: ColumnConfig<TaxRateRow>[] = [
    { key: "name", header: "Name", render: (row) => row.name },
    {
      key: "rate",
      header: "Tax Rate %",
      render: (row) => row.rate.toFixed(2),
    },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (row) => (
        <div className="hq6-location-actions">
          <button
            type="button"
            className="btn btn-xs btn-primary"
            onClick={() => openEditRate(row)}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-xs btn-danger"
            onClick={() => {
              persistRates(rates.filter((r) => r.id !== row.id));
              persistGroups(
                groups.map((g) => ({
                  ...g,
                  rateIds: g.rateIds.filter((id) => id !== row.id),
                })),
              );
              toast.success("Tax rate removed");
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const groupColumns: ColumnConfig<TaxGroupRow>[] = [
    { key: "name", header: "Name", render: (row) => row.name },
    {
      key: "rate",
      header: "Tax Rate %",
      render: (row) => groupRateTotal(row.rateIds).toFixed(2),
    },
    {
      key: "subTaxes",
      header: "Sub taxes",
      render: (row) => groupSubTaxesLabel(row.rateIds),
    },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (row) => (
        <button
          type="button"
          className="btn btn-xs btn-primary"
          onClick={() => openEditGroup(row)}
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div className="hq6-page hq6-tax-rates">
      <Hq6PageHeader title="Tax Rates" subtitle="Manage your tax rates" />
      <section className="content space-y-4">
        <TaxBox
          title="All your tax rates"
          searchValue={rateSearch}
          onSearchChange={setRateSearch}
          pageSize={ratePageSize}
          onPageSizeChange={setRatePageSize}
          itemCount={filteredRates.length}
          onAdd={openAddRate}
        >
          <DataTable<TaxRateRow>
            displayMode="table"
            data={filteredRates.slice(
              0,
              ratePageSize > 0 ? ratePageSize : filteredRates.length,
            )}
            columns={rateColumns}
            emptyState={{ message: "No data available in table" }}
          />
        </TaxBox>

        <TaxBox
          title="Tax groups ( Combination of multiple taxes )"
          searchValue={groupSearch}
          onSearchChange={setGroupSearch}
          pageSize={groupPageSize}
          onPageSizeChange={setGroupPageSize}
          itemCount={filteredGroups.length}
          onAdd={openAddGroup}
        >
          <DataTable<TaxGroupRow>
            displayMode="table"
            data={filteredGroups.slice(
              0,
              groupPageSize > 0 ? groupPageSize : filteredGroups.length,
            )}
            columns={groupColumns}
            emptyState={{ message: "No data available in table" }}
          />
        </TaxBox>
      </section>
      <p className="hq6-footer">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()}{" "}
        All rights reserved.
      </p>

      <Hq6Modal
        open={rateModal != null}
        onClose={() => setRateModal(null)}
        title={rateModal === "edit" ? "Edit Tax Rate" : "Add Tax Rate"}
        footer={
          <Hq6ModalSaveClose
            onClose={() => setRateModal(null)}
            onSave={saveRate}
          />
        }
      >
        <Hq6Field label="Name" required>
          <input
            className="hq6-modal-input"
            placeholder="Name"
            value={rateName}
            onChange={(e) => setRateName(e.target.value)}
          />
        </Hq6Field>
        <Hq6Field label="Tax Rate %" required>
          <input
            className="hq6-modal-input"
            inputMode="decimal"
            value={rateAmount}
            onChange={(e) => setRateAmount(e.target.value)}
          />
        </Hq6Field>
        <label className="hq6-modal-check mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={forTaxGroupOnly}
            onChange={(e) => setForTaxGroupOnly(e.target.checked)}
          />
          For tax group only
        </label>
      </Hq6Modal>

      <Hq6Modal
        open={groupModal != null}
        onClose={() => setGroupModal(null)}
        title={groupModal === "edit" ? "Edit Tax Rate" : "Add Tax Rate"}
        footer={
          <Hq6ModalSaveClose
            onClose={() => setGroupModal(null)}
            onSave={saveGroup}
          />
        }
      >
        <Hq6Field label="Name" required>
          <input
            className="hq6-modal-input"
            placeholder="Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </Hq6Field>
        <Hq6Field label="Sub taxes" required>
          <select
            className="hq6-modal-input"
            multiple
            size={Math.min(6, Math.max(3, rates.length || 3))}
            value={groupRateIds}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map(
                (o) => o.value,
              );
              setGroupRateIds(selected);
            }}
          >
            {rates.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.rate.toFixed(2)}%)
              </option>
            ))}
          </select>
        </Hq6Field>
        {groupRateIds.length > 0 ? (
          <p className="mt-2 text-sm text-[#777]">
            Combined rate: {groupRateTotal(groupRateIds).toFixed(2)}%
          </p>
        ) : null}
      </Hq6Modal>
    </div>
  );
}

function TaxBox({
  title,
  searchValue,
  onSearchChange,
  pageSize,
  onPageSizeChange,
  itemCount,
  onAdd,
  children,
}: {
  title: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  pageSize: number;
  onPageSizeChange: (n: number) => void;
  itemCount: number;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <div className="box box-solid tw-mb-4">
      <div className="box-header with-border">
        <h3 className="box-title">{title}</h3>
        <div className="box-tools">
          <UposGradientActionButton label="Add" onClick={onAdd} />
        </div>
      </div>
      <div className="box-body">
        <UposDataTablesShell
          tableId={`hq6_tax_${title.slice(0, 12)}`}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder="Search..."
          pageIndex={0}
          itemCount={itemCount}
          totalItems={itemCount}
          hasMore={false}
          canGoPrev={false}
          showPagination
        >
          <div className="hq6-table-wrap">{children}</div>
        </UposDataTablesShell>
      </div>
    </div>
  );
}
