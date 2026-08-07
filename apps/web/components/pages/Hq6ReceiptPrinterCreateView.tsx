"use client";

/**
 * HQ6 Add Printer subpage — ui-walkthrough/67_printers/buttons/00_add-printer
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import {
  createReceiptPrinter,
  getInvoiceSettings,
} from "@/lib/api/invoiceSettings";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { announceRedirect } from "@/lib/utils/announceRedirect";
import { tenantListPath } from "@/lib/utils/tenantRoutes";

export function Hq6ReceiptPrinterCreateView() {
  const tenantId = useTenantId();
  const { tenantCode } = useRouteTenant();
  const router = useRouter();
  const queryClient = useQueryClient();
  const listHref = tenantCode
    ? tenantListPath(tenantCode, "receipt-printers")
    : "#";

  const [name, setName] = useState("");
  const [connectionType, setConnectionType] = useState("network");
  const [capability, setCapability] = useState("default");
  const [charsPerLine, setCharsPerLine] = useState("42");
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("9100");
  const [path, setPath] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["invoice-settings", tenantId],
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId),
  });

  const createMutation = useAppMutation({
    mutationFn: () => {
      const printerType =
        connectionType === "network" ? "network" : "browser";
      const connectionString =
        printerType === "network"
          ? [ipAddress.trim(), port.trim()].filter(Boolean).join(":") || null
          : path.trim() || null;
      return createReceiptPrinter({
        name: name.trim(),
        printerType,
        connectionString,
        isDefault: (settings?.printers.length ?? 0) === 0,
      });
    },
    successMessage: "Receipt printer added",
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["invoice-settings", tenantId],
      });
      // Navigation already happened on Save click (leave-first).
    },
  });

  const handleSave = () => {
    if (!name.trim() || createMutation.isPending) return;
    if (listHref !== "#") {
      announceRedirect("Saving & returning to printers…");
      router.push(listHref);
    }
    createMutation.mutate();
  };

  return (
    <Hq6FormShell title="Add Printer" subtitle="Manage your Printers">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="form-group block">
          <span className="mb-1 block text-sm font-medium">Printer Name:*</span>
          <input
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="form-group block">
          <span className="mb-1 block text-sm font-medium">
            Connection Type:*
          </span>
          <select
            className="form-control"
            value={connectionType}
            onChange={(e) => setConnectionType(e.target.value)}
          >
            <option value="network">Network</option>
            <option value="windows">windows</option>
            <option value="linux">Linux</option>
          </select>
        </label>
        <label className="form-group block">
          <span className="mb-1 block text-sm font-medium">
            Capability Profile:*
          </span>
          <select
            className="form-control"
            value={capability}
            onChange={(e) => setCapability(e.target.value)}
          >
            <option value="default">Default</option>
            <option value="simple">Simple</option>
            <option value="star">Star Branded</option>
            <option value="espon">Espon Tep</option>
            <option value="p822d">P822D</option>
          </select>
        </label>
        <label className="form-group block">
          <span className="mb-1 block text-sm font-medium">
            Characters per line:*
          </span>
          <input
            className="form-control"
            type="number"
            value={charsPerLine}
            onChange={(e) => setCharsPerLine(e.target.value)}
          />
        </label>
        {connectionType === "network" ? (
          <>
            <label className="form-group block">
              <span className="mb-1 block text-sm font-medium">
                IP Address:*
              </span>
              <input
                className="form-control"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
              />
            </label>
            <label className="form-group block">
              <span className="mb-1 block text-sm font-medium">Port:*</span>
              <input
                className="form-control"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </label>
          </>
        ) : (
          <label className="form-group block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">Path:*</span>
            <input
              className="form-control"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/dev/usb/lp0"
            />
          </label>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Hq6BusyButton
          className="hq6-btn-purple"
          busy={createMutation.isPending}
          busyLabel="Saving…"
          disabled={!name.trim()}
          onClick={handleSave}
        >
          Save
        </Hq6BusyButton>
        <Link href={listHref} className="btn btn-default">
          Cancel
        </Link>
      </div>
    </Hq6FormShell>
  );
}
