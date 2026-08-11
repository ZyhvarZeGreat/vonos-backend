"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Car, Search, X } from "lucide-react";
import type { Vehicle } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import type { JobDetail } from "@/lib/api/jobs";
import { linkJobVehicle } from "@/lib/api/jobs";
import { createVehicle, getVehicles } from "@/lib/api/vehicles";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { cn } from "@/lib/utils/cn";
import { tenantBasePath } from "@/lib/utils/tenantMount";

interface JobVehiclePanelProps {
  job: JobDetail;
  tenantId: string;
  tenantCode: string;
  onJobChange: (job: JobDetail) => void;
}

export function JobVehiclePanel({
  job,
  tenantId,
  tenantCode,
  onJobChange,
}: JobVehiclePanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const linkMutation = useAppMutation({
    mutationFn: (vehicleId: string | null) => linkJobVehicle(job.id, vehicleId),
    successMessage: (updated) =>
      updated.vehicle ? "Vehicle linked" : "Vehicle unlinked",
    optimistic: {
      keys: [["job", job.id], ["jobs"]],
      update: (_qc, vehicleId) => {
        if (vehicleId === null) {
          onJobChange({ ...job, vehicleId: null, vehicle: null });
        }
      },
    },
    onSuccess: (updated) => {
      onJobChange(updated);
    },
  });

  const vehicle = job.vehicle ?? null;

  return (
    <>
      <section className="rounded-lg border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Car className="h-5 w-5 text-[var(--color-brand-accent)]" />
            {vehicle ? (
              <div>
                <Link
                  href={`${tenantBasePath(tenantCode)}/vehicles/${vehicle.id}`}
                  className="font-medium text-foreground hover:text-[var(--color-brand-accent)] hover:underline"
                >
                  {vehicle.plateNumber}
                </Link>
                <p className="text-xs text-muted">
                  {[vehicle.make, vehicle.model, vehicle.year]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-foreground">No vehicle linked</p>
                <p className="text-xs text-muted">
                  Link a vehicle to build its service history.
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {vehicle ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={linkMutation.isPending}
                onClick={() => linkMutation.mutate(null)}
              >
                <X className="mr-1 h-4 w-4" />
                Unlink
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
              {vehicle ? "Change" : "Link vehicle"}
            </Button>
          </div>
        </div>
      </section>

      {pickerOpen ? (
        <VehiclePickerModal
          tenantId={tenantId}
          onClose={() => setPickerOpen(false)}
          onPick={(vehicleId) => {
            linkMutation.mutate(vehicleId);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

interface VehiclePickerModalProps {
  tenantId: string;
  onClose: () => void;
  onPick: (vehicleId: string) => void;
}

function VehiclePickerModal({ tenantId, onClose, onPick }: VehiclePickerModalProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    plateNumber: "",
    make: "",
    model: "",
    year: "",
    ownerName: "",
    ownerPhone: "",
  });
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    debounceRef.current = window.setTimeout(
      () => setDebounced(query.trim()),
      250,
    );
    return () => window.clearTimeout(debounceRef.current);
  }, [query]);

  const { data: vehicles = [], isFetching } = useQuery({
    queryKey: ["vehicle-picker", tenantId, debounced],
    queryFn: () => getVehicles(tenantId),
    enabled: Boolean(tenantId),
  });

  const filtered = useMemo(() => {
    const term = debounced.toLowerCase();
    if (!term) return vehicles.slice(0, 25);
    return vehicles
      .filter((v) =>
        [v.plateNumber, v.make, v.model, v.ownerName]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(term)),
      )
      .slice(0, 25);
  }, [vehicles, debounced]);

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const createMutation = useAppMutation({
    mutationFn: () =>
      createVehicle(tenantId, {
        plateNumber: form.plateNumber.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year ? Number(form.year) : null,
        ownerName: form.ownerName.trim(),
        ownerPhone: form.ownerPhone.trim() || null,
        vin: null,
      }),
    successMessage: "Vehicle registered",
    invalidateKeys: [["vehicles", tenantId]],
    onSuccess: (vehicle: Vehicle) => {
      onPick(vehicle.id);
    },
  });

  const canCreate =
    form.plateNumber.trim() &&
    form.make.trim() &&
    form.model.trim() &&
    form.ownerName.trim();

  return (
    <Modal open onClose={onClose} panelClassName="max-w-lg">
      <ModalHeader
        title={showCreate ? "Register vehicle" : "Link a vehicle"}
        subtitle={showCreate ? undefined : "Search existing vehicles"}
        onClose={onClose}
      />
      <div className="space-y-4 border-t border-border px-4 py-4">
        {showCreate ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Plate number"
              value={form.plateNumber}
              onChange={(e) => setField("plateNumber", e.target.value)}
            />
            <Input
              label="Owner name"
              value={form.ownerName}
              onChange={(e) => setField("ownerName", e.target.value)}
            />
            <Input
              label="Make"
              value={form.make}
              onChange={(e) => setField("make", e.target.value)}
            />
            <Input
              label="Model"
              value={form.model}
              onChange={(e) => setField("model", e.target.value)}
            />
            <Input
              label="Year"
              type="number"
              value={form.year}
              onChange={(e) => setField("year", e.target.value)}
            />
            <Input
              label="Owner phone"
              value={form.ownerPhone}
              onChange={(e) => setField("ownerPhone", e.target.value)}
            />
          </div>
        ) : (
          <>
            <div className="relative flex items-stretch">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search plate, make, model, owner…"
                  className="w-full rounded-l-lg rounded-r-none border border-r-0 border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--color-brand-primary)] focus:ring-1"
                />
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center rounded-r-lg border border-[#2563eb] bg-[#2563eb] px-3 text-sm font-semibold text-white hover:border-[#1d4ed8] hover:bg-[#1d4ed8]"
                aria-label="Search"
                onClick={() => setQuery((prev) => prev.trim())}
              >
                Search
              </button>
            </div>
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {isFetching ? (
                <li className="px-3 py-2 text-sm text-muted">Searching…</li>
              ) : filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted">No vehicles found.</li>
              ) : (
                filtered.map((vehicle) => (
                  <li key={vehicle.id}>
                    <button
                      type="button"
                      onClick={() => onPick(vehicle.id)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 rounded-lg border border-border px-3 py-2 text-left text-sm",
                        "hover:bg-[var(--color-surface-muted)]",
                      )}
                    >
                      <span className="font-medium text-foreground">
                        {vehicle.plateNumber}
                      </span>
                      <span className="text-xs text-muted">
                        {[vehicle.make, vehicle.model, vehicle.year]
                          .filter(Boolean)
                          .join(" · ")}
                        {vehicle.ownerName ? ` · ${vehicle.ownerName}` : ""}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </div>
      <ModalFooter>
        {showCreate ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Back to search
            </Button>
            <Button
              size="sm"
              disabled={!canCreate || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Register & link
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(true)}>
              Register new vehicle
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
