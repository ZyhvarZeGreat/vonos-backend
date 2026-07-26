"use client";

/**
 * HQ6 Barcode sticker settings — list + localStorage persistence
 * (ui-walkthrough/66_barcodes). Create/edit are separate routes.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { tenantListPath } from "@/lib/utils/tenantRoutes";
import { toast } from "@/stores/toastStore";

export type BarcodeSettingRow = {
  id: string;
  name: string;
  description: string;
  isContinuous: boolean;
  topMargin: number;
  leftMargin: number;
  width: number;
  height: number;
  paperWidth: number;
  paperHeight: number;
  stickersInOneRow: number;
  rowDistance: number;
  colDistance: number;
  stickersPerSheet: number;
  isDefault: boolean;
};

const STORAGE_PREFIX = "vonos:hq6-barcode-settings:";

const DEFAULT_ROWS: BarcodeSettingRow[] = [
  {
    id: "first-test",
    name: "first test",
    description: "",
    isContinuous: false,
    topMargin: 0,
    leftMargin: 0,
    width: 1.5,
    height: 1,
    paperWidth: 8.5,
    paperHeight: 11,
    stickersInOneRow: 4,
    rowDistance: 0,
    colDistance: 0,
    stickersPerSheet: 20,
    isDefault: true,
  },
];

function emptyForm(): Omit<BarcodeSettingRow, "id" | "isDefault"> {
  return {
    name: "",
    description: "",
    isContinuous: false,
    topMargin: 0,
    leftMargin: 0,
    width: 1.5,
    height: 1,
    paperWidth: 8.5,
    paperHeight: 11,
    stickersInOneRow: 4,
    rowDistance: 0,
    colDistance: 0,
    stickersPerSheet: 20,
  };
}

export function loadBarcodeSettings(tenantId: string | null): BarcodeSettingRow[] {
  if (!tenantId || typeof window === "undefined") return DEFAULT_ROWS;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${tenantId}`);
    if (!raw) return DEFAULT_ROWS;
    const parsed = JSON.parse(raw) as BarcodeSettingRow[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ROWS;
  } catch {
    return DEFAULT_ROWS;
  }
}

export function saveBarcodeSettings(
  tenantId: string,
  rows: BarcodeSettingRow[],
) {
  window.localStorage.setItem(
    `${STORAGE_PREFIX}${tenantId}`,
    JSON.stringify(rows),
  );
}

export function Hq6BarcodeSettingsListView() {
  const tenantId = useTenantId();
  const { tenantCode } = useRouteTenant();
  const chrome = useHq6ListChrome("barcode-settings");
  const [rows, setRows] = useState<BarcodeSettingRow[]>(DEFAULT_ROWS);
  const [localSearch, setLocalSearch] = useState("");
  const [pageSize, setPageSize] = useState(HQ6_TABLE_PAGE_SIZE);

  useEffect(() => {
    setRows(loadBarcodeSettings(tenantId));
  }, [tenantId]);

  const persist = (next: BarcodeSettingRow[]) => {
    setRows(next);
    if (tenantId) saveBarcodeSettings(tenantId, next);
  };

  const filtered = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }, [localSearch, rows]);

  const base = tenantCode
    ? tenantListPath(tenantCode, "barcode-settings")
    : "/VA/barcode-settings";

  const columns: ColumnConfig<BarcodeSettingRow>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Sticker Sheet setting Name",
        render: (row) => (
          <span>
            {row.name}
            {row.isDefault ? (
              <span className="ml-2 rounded bg-[#dbeafe] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#1d4ed8]">
                Default
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: "description",
        header: "Sticker Sheet setting Description",
        render: (row) => row.description || "—",
      },
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <div className="hq6-location-actions">
            <Link
              href={`${base}/${row.id}/edit`}
              className="btn btn-xs btn-primary"
            >
              Edit
            </Link>
            <button
              type="button"
              className="btn btn-xs btn-danger"
              onClick={() => {
                persist(rows.filter((r) => r.id !== row.id));
                toast.success("Barcode setting removed");
              }}
            >
              Delete
            </button>
            <button
              type="button"
              className="btn btn-xs btn-success"
              disabled={row.isDefault}
              onClick={() => {
                persist(
                  rows.map((r) => ({ ...r, isDefault: r.id === row.id })),
                );
                toast.success("Default barcode setting updated");
              }}
            >
              Set as default
            </button>
          </div>
        ),
      },
    ],
    [base, rows],
  );

  return (
    <Hq6StandardListShell
      slug="barcode-settings"
      title="Barcodes"
      tabLabel="All your barcode settings"
      boxTitle="All your barcode settings"
      chrome={chrome}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      searchPlaceholder="Search..."
      addHref={`${base}/create`}
      addLabel="Add new setting"
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      columnOptions={columns
        .filter((c) => c.key !== "actions")
        .map((c) => ({ key: c.key, label: String(c.header) }))}
      pagination={{
        pageIndex: 0,
        pageSize,
        itemCount: filtered.length,
        totalItems: filtered.length,
        hasMore: false,
        canGoPrev: false,
        onPageSizeChange: setPageSize,
      }}
    >
      <DataTable<BarcodeSettingRow>
        displayMode="table"
        data={filtered.slice(0, pageSize > 0 ? pageSize : filtered.length)}
        columns={columns}
        emptyState={{ message: "No data available in table" }}
      />
    </Hq6StandardListShell>
  );
}

export function Hq6BarcodeSettingFormView({
  mode,
  settingId,
}: {
  mode: "create" | "edit";
  settingId?: string;
}) {
  const tenantId = useTenantId();
  const { tenantCode } = useRouteTenant();
  const router = useRouter();
  const listHref = tenantCode
    ? tenantListPath(tenantCode, "barcode-settings")
    : "/VA/barcode-settings";

  const [form, setForm] = useState(emptyForm);
  const [isDefault, setIsDefault] = useState(false);
  const [ready, setReady] = useState(mode === "create");

  useEffect(() => {
    if (mode !== "edit" || !settingId) return;
    const rows = loadBarcodeSettings(tenantId);
    const row = rows.find((r) => r.id === settingId);
    if (!row) {
      toast.error("Barcode setting not found");
      router.replace(listHref);
      return;
    }
    setForm({
      name: row.name,
      description: row.description,
      isContinuous: row.isContinuous,
      topMargin: row.topMargin,
      leftMargin: row.leftMargin,
      width: row.width,
      height: row.height,
      paperWidth: row.paperWidth,
      paperHeight: row.paperHeight,
      stickersInOneRow: row.stickersInOneRow,
      rowDistance: row.rowDistance,
      colDistance: row.colDistance,
      stickersPerSheet: row.stickersPerSheet,
    });
    setIsDefault(row.isDefault);
    setReady(true);
  }, [listHref, mode, router, settingId, tenantId]);

  const setNum =
    (key: keyof ReturnType<typeof emptyForm>) =>
    (value: string) => {
      const n = Number.parseFloat(value);
      setForm((prev) => ({
        ...prev,
        [key]: Number.isFinite(n) ? n : 0,
      }));
    };

  const save = () => {
    if (!tenantId) return;
    const name = form.name.trim();
    if (!name) {
      toast.error("Enter a sticker sheet setting name");
      return;
    }
    const rows = loadBarcodeSettings(tenantId);
    if (mode === "edit" && settingId) {
      const next = rows.map((r) =>
        r.id === settingId
          ? {
              ...r,
              ...form,
              name,
              isDefault: isDefault || r.isDefault,
            }
          : isDefault
            ? { ...r, isDefault: false }
            : r,
      );
      saveBarcodeSettings(tenantId, next);
      toast.success("Barcode setting updated");
    } else {
      const id = crypto.randomUUID();
      const makeDefault = isDefault || rows.length === 0;
      const next: BarcodeSettingRow[] = [
        {
          id,
          ...form,
          name,
          isDefault: makeDefault,
        },
        ...rows.map((r) =>
          makeDefault ? { ...r, isDefault: false } : r,
        ),
      ];
      saveBarcodeSettings(tenantId, next);
      toast.success("Barcode setting saved on this device");
    }
    router.push(listHref);
  };

  if (!ready) {
    return (
      <Hq6FormShell title="Edit barcode sticker setting">
        <p className="text-center text-[#777]">Loading…</p>
      </Hq6FormShell>
    );
  }

  return (
    <Hq6FormShell
      title={
        mode === "edit"
          ? "Edit barcode sticker setting"
          : "Add barcode sticker setting"
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="form-group block md:col-span-2">
          <span className="mb-1 block text-sm font-medium">
            Sticker Sheet setting Name:*
          </span>
          <input
            className="form-control"
            placeholder="Sticker Sheet setting Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </label>
        <label className="form-group block md:col-span-2">
          <span className="mb-1 block text-sm font-medium">
            Sticker Sheet setting Description
          </span>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Sticker Sheet setting Description"
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
          />
        </label>
        <label className="form-group flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            checked={form.isContinuous}
            onChange={(e) =>
              setForm((p) => ({ ...p, isContinuous: e.target.checked }))
            }
          />
          Continous feed or rolls
        </label>
        {(
          [
            ["topMargin", "Additional top margin (In Inches):*"],
            ["leftMargin", "Additional left margin (In Inches):*"],
            ["width", "Width of sticker (In Inches):*"],
            ["height", "Height of sticker (In Inches):*"],
            ["paperWidth", "Paper width (In Inches):*"],
            ["paperHeight", "Paper height (In Inches):*"],
            ["stickersInOneRow", "Stickers in one row:*"],
            ["rowDistance", "Distance between two rows (In Inches):*"],
            ["colDistance", "Distance between two columns (In Inches):*"],
            ["stickersPerSheet", "No. of Stickers per sheet:*"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="form-group block">
            <span className="mb-1 block text-sm font-medium">{label}</span>
            <input
              className="form-control"
              type="number"
              step="any"
              value={form[key]}
              onChange={(e) => setNum(key)(e.target.value)}
            />
          </label>
        ))}
        <label className="form-group flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Set as default
        </label>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="hq6-btn-purple" onClick={save}>
          Save
        </button>
        <Link href={listHref} className="btn btn-default">
          Cancel
        </Link>
      </div>
    </Hq6FormShell>
  );
}
