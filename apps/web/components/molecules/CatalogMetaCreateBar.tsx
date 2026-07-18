"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  CreateBrandInput,
  CreateProductCategoryInput,
  CreateProductUnitInput,
  CreateSellingPriceGroupInput,
  CreateWarrantyInput,
} from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Select } from "@/components/atoms/Select";
import {
  createCatalogMeta,
  type CatalogMetaKind,
} from "@/lib/api/catalogMeta";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

const KIND_SINGULAR: Record<CatalogMetaKind, string> = {
  categories: "Category",
  brands: "Brand",
  units: "Unit",
  warranties: "Warranty",
  "price-groups": "Price group",
};

export function CatalogMetaCreateBar({ kind }: { kind: CatalogMetaKind }) {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [description, setDescription] = useState("");
  const [shortName, setShortName] = useState("");
  const [allowDecimal, setAllowDecimal] = useState(false);
  const [duration, setDuration] = useState("12");
  const [durationType, setDurationType] = useState<"days" | "months" | "years">(
    "months",
  );

  const singular = KIND_SINGULAR[kind];

  const createMutation = useAppMutation({
    successMessage: `${singular} added`,
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name is required");

      if (kind === "categories") {
        const body: CreateProductCategoryInput = {
          name: trimmed,
          shortCode: shortCode.trim() || undefined,
          description: description.trim() || undefined,
        };
        return createCatalogMeta(tenantId, kind, body);
      }
      if (kind === "brands") {
        const body: CreateBrandInput = {
          name: trimmed,
          description: description.trim() || undefined,
        };
        return createCatalogMeta(tenantId, kind, body);
      }
      if (kind === "units") {
        const body: CreateProductUnitInput = {
          name: trimmed,
          shortName: shortName.trim() || trimmed.slice(0, 8),
          allowDecimal,
        };
        return createCatalogMeta(tenantId, kind, body);
      }
      if (kind === "warranties") {
        const body: CreateWarrantyInput = {
          name: trimmed,
          duration: Number(duration),
          durationType,
          description: description.trim() || undefined,
        };
        return createCatalogMeta(tenantId, kind, body);
      }
      const body: CreateSellingPriceGroupInput = {
        name: trimmed,
        description: description.trim() || undefined,
      };
      return createCatalogMeta(tenantId, kind, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalog-meta", tenantId] });
      setName("");
      setShortCode("");
      setDescription("");
      setShortName("");
      setAllowDecimal(false);
      setDuration("12");
      setDurationType("months");
    },
  });

  const canSubmit =
    Boolean(tenantId) &&
    name.trim().length > 0 &&
    (kind !== "units" || shortName.trim().length > 0 || name.trim().length > 0) &&
    (kind !== "warranties" || Number(duration) > 0);

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-4">
      <div className="min-w-[12rem] flex-1">
        <label className="mb-1 block text-xs font-medium text-muted">
          New {singular.toLowerCase()} name
        </label>
        <input
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit && !createMutation.isPending) {
              createMutation.mutate();
            }
          }}
        />
      </div>

      {kind === "categories" ? (
        <div className="w-32">
          <label className="mb-1 block text-xs font-medium text-muted">Code</label>
          <input
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value)}
          />
        </div>
      ) : null}

      {kind === "units" ? (
        <>
          <div className="w-28">
            <label className="mb-1 block text-xs font-medium text-muted">
              Short name
            </label>
            <input
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="pc"
            />
          </div>
          <label className="mb-2 flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={allowDecimal}
              onChange={(e) => setAllowDecimal(e.target.checked)}
            />
            Allow decimal
          </label>
        </>
      ) : null}

      {kind === "warranties" ? (
        <>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-muted">
              Duration
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div className="w-32">
            <Select
              label="Unit"
              value={durationType}
              onChange={(e) =>
                setDurationType(e.target.value as "days" | "months" | "years")
              }
              options={[
                { value: "days", label: "Days" },
                { value: "months", label: "Months" },
                { value: "years", label: "Years" },
              ]}
            />
          </div>
        </>
      ) : null}

      {kind === "brands" ||
      kind === "warranties" ||
      kind === "price-groups" ||
      kind === "categories" ? (
        <div className="min-w-[10rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">
            Description
          </label>
          <input
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      ) : null}

      <Button
        onClick={() => createMutation.mutate()}
        disabled={!canSubmit || createMutation.isPending}
      >
        Add {singular}
      </Button>
    </div>
  );
}
