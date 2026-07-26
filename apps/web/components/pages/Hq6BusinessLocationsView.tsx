"use client";

/**
 * HQ6 Business Locations — ui-audit/64_business-location
 * List + Add/Edit modal (Blade business_location/create.blade.php).
 */
import { useEffect, useMemo, useState } from "react";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import { updateTenantConfig } from "@/lib/api/tenants";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useTenantStore } from "@/stores/tenantStore";
import { toast } from "@/stores/toastStore";
import type { BusinessLocation } from "@vonos/types";

type LocationRow = {
  id: string;
  name: string;
  locationId: string;
  landmark: string;
  city: string;
  zipCode: string;
  state: string;
  country: string;
  priceGroup: string;
  invoiceScheme: string;
  invoiceLayoutPos: string;
  invoiceLayoutSale: string;
};

type LocationMeta = {
  landmark: string;
  city: string;
  zipCode: string;
  state: string;
  country: string;
};

const META_PREFIX = "vonos:hq6-location-meta:";

const DEFAULT_ENRICH: Record<string, LocationMeta> = {
  VS001: {
    landmark: "VONOS ROUNDBOUT",
    city: "ABUJA",
    zipCode: "901101",
    state: "FCM",
    country: "NIGERIA",
  },
  VS002: {
    landmark: "ARK GARDEN",
    city: "KUBWA",
    zipCode: "901101",
    state: "FCT",
    country: "Nigeria",
  },
};

function emptyForm() {
  return {
    name: "",
    locationId: "",
    landmark: "",
    city: "",
    zipCode: "",
    state: "",
    country: "Nigeria",
  };
}

function loadMeta(tenantId: string): Record<string, LocationMeta> {
  try {
    const raw = localStorage.getItem(`${META_PREFIX}${tenantId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LocationMeta>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveMeta(tenantId: string, meta: Record<string, LocationMeta>) {
  localStorage.setItem(`${META_PREFIX}${tenantId}`, JSON.stringify(meta));
}

export function Hq6BusinessLocationsView() {
  const { tenantId, config } = useRouteTenant();
  const setTenantConfig = useTenantStore((s) => s.setTenantConfig);
  const chrome = useHq6ListChrome("locations");
  const [localSearch, setLocalSearch] = useState("");
  const [pageSize, setPageSize] = useState(HQ6_TABLE_PAGE_SIZE);
  const [meta, setMeta] = useState<Record<string, LocationMeta>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deactivateTarget, setDeactivateTarget] = useState<LocationRow | null>(
    null,
  );

  useEffect(() => {
    if (!tenantId) return;
    setMeta(loadMeta(tenantId));
  }, [tenantId]);

  const branches = config?.businessLocations ?? [];

  const saveBranches = useAppMutation({
    mutationFn: async (next: BusinessLocation[]) => {
      if (!tenantId) throw new Error("No tenant");
      return updateTenantConfig(tenantId, { businessLocations: next });
    },
    successMessage: "Business locations updated",
    invalidateKeys: [["tenantConfig", tenantId]],
    onSuccess: (updated) => {
      setTenantConfig(updated);
    },
  });

  const rows = useMemo<LocationRow[]>(() => {
    return branches.map((loc) => {
      const key = loc.code;
      const enrich =
        meta[key] ??
        DEFAULT_ENRICH[key] ??
        DEFAULT_ENRICH[key.replace(/^VS/i, "")] ??
        ({
          landmark: "",
          city: "",
          zipCode: "",
          state: "",
          country: "Nigeria",
        } satisfies LocationMeta);
      const locationId = loc.code.replace(/^VS/i, "") || loc.code;
      return {
        id: loc.code,
        name: loc.name.toUpperCase(),
        locationId,
        landmark: enrich.landmark,
        city: enrich.city,
        zipCode: enrich.zipCode,
        state: enrich.state,
        country: enrich.country,
        priceGroup: "Default",
        invoiceScheme: "Default",
        invoiceLayoutPos: "Default",
        invoiceLayoutSale: "Default",
      };
    });
  }, [branches, meta]);

  const filtered = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.locationId.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q),
    );
  }, [localSearch, rows]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row: LocationRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      locationId: row.locationId,
      landmark: row.landmark,
      city: row.city,
      zipCode: row.zipCode,
      state: row.state,
      country: row.country,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!tenantId) return;
    const name = form.name.trim();
    const code = (form.locationId.trim() || name.slice(0, 8)).toUpperCase();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    if (!form.city.trim() || !form.zipCode.trim() || !form.state.trim() || !form.country.trim()) {
      toast.error("City, Zip Code, State and Country are required");
      return;
    }

    const nextMeta: LocationMeta = {
      landmark: form.landmark.trim(),
      city: form.city.trim(),
      zipCode: form.zipCode.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
    };

    if (editing) {
      const nextBranches = branches.map((b) =>
        b.code === editing.id ? { code: editing.id, name } : b,
      );
      const nextMetaMap = { ...meta, [editing.id]: nextMeta };
      setMeta(nextMetaMap);
      saveMeta(tenantId, nextMetaMap);
      saveBranches.mutate(nextBranches);
    } else {
      const storageCode = code.startsWith("VS") ? code : `VS${code}`;
      if (branches.some((b) => b.code.toLowerCase() === storageCode.toLowerCase())) {
        toast.error("A location with this ID already exists");
        return;
      }
      const nextBranches = [...branches, { code: storageCode, name }];
      const nextMetaMap = { ...meta, [storageCode]: nextMeta };
      setMeta(nextMetaMap);
      saveMeta(tenantId, nextMetaMap);
      saveBranches.mutate(nextBranches);
    }
    setModalOpen(false);
  };

  const columns: ColumnConfig<LocationRow>[] = useMemo(
    () => [
      { key: "name", header: "Name", render: (row) => row.name },
      { key: "locationId", header: "Location ID", render: (row) => row.locationId },
      { key: "landmark", header: "Landmark", render: (row) => row.landmark },
      { key: "city", header: "City", render: (row) => row.city },
      { key: "zipCode", header: "Zip Code", render: (row) => row.zipCode },
      { key: "state", header: "State", render: (row) => row.state },
      { key: "country", header: "Country", render: (row) => row.country },
      { key: "priceGroup", header: "Price Group", render: (row) => row.priceGroup },
      {
        key: "invoiceScheme",
        header: "Invoice scheme",
        render: (row) => row.invoiceScheme,
      },
      {
        key: "invoiceLayoutPos",
        header: "Invoice layout for POS",
        render: (row) => row.invoiceLayoutPos,
      },
      {
        key: "invoiceLayoutSale",
        header: "Invoice layout for sale",
        render: (row) => row.invoiceLayoutSale,
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
              onClick={() => openEdit(row)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn-xs btn-success"
              onClick={() => openEdit(row)}
            >
              Settings
            </button>
            <button
              type="button"
              className="btn btn-xs btn-danger"
              onClick={() => setDeactivateTarget(row)}
            >
              Deactivate Location
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <Hq6StandardListShell
      slug="locations"
      title="Business Locations"
      tabLabel="All your business locations"
      boxTitle="All your business locations"
      chrome={chrome}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      searchPlaceholder="Search..."
      onAdd={openAdd}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      freezeFirstColumn={false}
      columnOptions={columns
        .filter((c) => c.key !== "actions")
        .map((c) => ({ key: c.key, label: String(c.header) }))}
      pagination={{
        pageIndex: 0,
        pageSize,
        itemCount: filtered.length,
        hasMore: false,
        canGoPrev: false,
        onPrev: () => undefined,
        onNext: () => undefined,
        onPageSizeChange: setPageSize,
        totalItems: filtered.length,
      }}
      modals={
        <>
          <Hq6Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={editing ? "Edit business location" : "Add a new business location"}
            size="lg"
            footer={
              <Hq6ModalSaveClose
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                saving={saveBranches.isPending}
              />
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Hq6Field label="Name:" required className="sm:col-span-2">
                <input
                  className="hq6-modal-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Name"
                />
              </Hq6Field>
              <Hq6Field label="Location ID:">
                <input
                  className="hq6-modal-input"
                  value={form.locationId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, locationId: e.target.value }))
                  }
                  placeholder="Location ID"
                  disabled={Boolean(editing)}
                />
              </Hq6Field>
              <Hq6Field label="Landmark:">
                <input
                  className="hq6-modal-input"
                  value={form.landmark}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, landmark: e.target.value }))
                  }
                  placeholder="Landmark"
                />
              </Hq6Field>
              <Hq6Field label="City:" required>
                <input
                  className="hq6-modal-input"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="City"
                />
              </Hq6Field>
              <Hq6Field label="Zip Code:" required>
                <input
                  className="hq6-modal-input"
                  value={form.zipCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, zipCode: e.target.value }))
                  }
                  placeholder="Zip Code"
                />
              </Hq6Field>
              <Hq6Field label="State:" required>
                <input
                  className="hq6-modal-input"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  placeholder="State"
                />
              </Hq6Field>
              <Hq6Field label="Country:" required>
                <input
                  className="hq6-modal-input"
                  value={form.country}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, country: e.target.value }))
                  }
                  placeholder="Country"
                />
              </Hq6Field>
            </div>
          </Hq6Modal>
          <Hq6ConfirmModal
            open={Boolean(deactivateTarget)}
            title="Deactivate location?"
            message={`Deactivate “${deactivateTarget?.name ?? ""}”?`}
            confirmLabel="Deactivate"
            danger
            onClose={() => setDeactivateTarget(null)}
            onConfirm={() => {
              if (!deactivateTarget) return;
              saveBranches.mutate(
                branches.filter((b) => b.code !== deactivateTarget.id),
              );
              setDeactivateTarget(null);
            }}
          />
        </>
      }
    >
      <DataTable<LocationRow>
        displayMode="table"
        data={filtered.slice(0, pageSize > 0 ? pageSize : filtered.length)}
        columns={columns}
        emptyState={{ message: "No data available in table" }}
      />
    </Hq6StandardListShell>
  );
}
