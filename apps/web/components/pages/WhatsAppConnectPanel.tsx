"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getBaileysQr,
  getWhatsAppStatus,
  reconnectBaileys,
  testWhatsAppSend,
} from "@/lib/api/whatsapp";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils/cn";
import { VONOS_PHONE } from "@/lib/branding";

function channelLabel(channel: string): string {
  switch (channel) {
    case "baileys":
      return "MoovMart (linked WhatsApp)";
    case "unipile":
      return "Unipile (fallback)";
    case "cloud_api":
      return "Meta Cloud API";
    case "wa_me":
      return "Manual wa.me link";
    default:
      return channel;
  }
}

export function WhatsAppConnectPanel() {
  const role = useAuthStore((s) => s.role);
  const canManage = role === "admin" || role === "super_admin";
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState(VONOS_PHONE);

  const statusQuery = useQuery({
    queryKey: ["whatsapp", "status"],
    queryFn: getWhatsAppStatus,
    enabled: canManage,
    refetchInterval: (q) => {
      const b = q.state.data?.baileys;
      if (!b?.enabled) return false;
      return b.connected ? 15_000 : 3_000;
    },
  });

  const needsQr =
    canManage &&
    Boolean(statusQuery.data?.baileys.enabled) &&
    !statusQuery.data?.baileys.connected;

  const qrQuery = useQuery({
    queryKey: ["whatsapp", "baileys", "qr"],
    queryFn: getBaileysQr,
    enabled: needsQr,
    refetchInterval: (q) => {
      if (q.state.data?.connected) return false;
      return q.state.data?.qrDataUrl ? 8_000 : 2_500;
    },
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "status"] }),
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "baileys", "qr"] }),
    ]);
  };

  const reconnectMutation = useMutation({
    mutationFn: (clearSession: boolean) => reconnectBaileys(clearSession),
    onSuccess: async (_data, clearSession) => {
      toast.success(
        clearSession
          ? "Session cleared — scan the new QR"
          : "Reconnecting WhatsApp…",
      );
      await invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testMutation = useMutation({
    mutationFn: () => testWhatsAppSend({ phone: testPhone }),
    onSuccess: (result) => {
      if (result.sent) {
        toast.success(`Test sent via ${channelLabel(result.channel)}`);
        return;
      }
      toast.error(result.error || `Not sent (${channelLabel(result.channel)})`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canManage) {
    return (
      <div className="box box-solid hq6-notif-box tw-mb-4">
        <div className="box-header with-border">
          <h3 className="box-title">WhatsApp connection</h3>
        </div>
        <div className="box-body">
          <p className="help-block" style={{ margin: 0 }}>
            Only Admin can link the shop WhatsApp number for customer status
            notifies.
          </p>
        </div>
      </div>
    );
  }

  const baileys = statusQuery.data?.baileys;
  const channel = statusQuery.data?.channel;
  const connected = Boolean(baileys?.connected);
  const enabled = Boolean(baileys?.enabled);
  const qrDataUrl = qrQuery.data?.qrDataUrl ?? null;
  const hint =
    qrQuery.data?.hint ||
    (!enabled
      ? "Server needs WHATSAPP_PROVIDER=baileys (Railway / API .env)"
      : null);
  const busy =
    reconnectMutation.isPending ||
    testMutation.isPending ||
    statusQuery.isFetching;

  return (
    <div className="box box-solid hq6-notif-box tw-mb-4 hq6-whatsapp-connect">
      <div className="box-header with-border">
        <h3 className="box-title">WhatsApp connection</h3>
      </div>
      <div className="box-body">
        <p className="help-block">
          <strong>Primary:</strong> MoovMart-style linked WhatsApp (scan QR
          below). <strong>Fallback:</strong> Unipile / Meta if the link is
          offline. Scan with{" "}
          <strong>WhatsApp → Linked devices → Link a device</strong>.
        </p>

        <div className="hq6-wa-status-row">
          <span
            className={cn(
              "hq6-wa-pill",
              connected
                ? "hq6-wa-pill--ok"
                : enabled
                  ? "hq6-wa-pill--warn"
                  : "hq6-wa-pill--muted",
            )}
          >
            {!enabled
              ? "Baileys off"
              : connected
                ? "Connected"
                : "Not connected"}
          </span>
          {channel ? (
            <span className="hq6-wa-meta">
              Active channel: <strong>{channelLabel(channel)}</strong>
            </span>
          ) : null}
          {statusQuery.data?.unipile ? (
            <span className="hq6-wa-meta">Unipile ready as fallback</span>
          ) : null}
          {statusQuery.data?.metaCloud ? (
            <span className="hq6-wa-meta">Meta Cloud configured</span>
          ) : null}
        </div>

        {statusQuery.isError ? (
          <p className="text-danger" style={{ marginTop: 8 }}>
            {(statusQuery.error as Error)?.message ||
              "Could not load WhatsApp status"}
          </p>
        ) : null}

        {baileys?.lastError ? (
          <p className="help-block text-danger" style={{ marginTop: 8 }}>
            Last error: {baileys.lastError}
          </p>
        ) : null}

        {hint && !connected ? (
          <p className="help-block" style={{ marginTop: 8 }}>
            {hint}
          </p>
        ) : null}

        {enabled && !connected ? (
          <div className="hq6-wa-qr-wrap">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="WhatsApp link QR code"
                width={280}
                height={280}
                className="hq6-wa-qr"
              />
            ) : (
              <div className="hq6-wa-qr hq6-wa-qr--placeholder">
                {qrQuery.isFetching || qrQuery.isLoading
                  ? "Waiting for QR…"
                  : "QR not ready yet — tap Refresh"}
              </div>
            )}
            <ol className="hq6-wa-steps">
              <li>Open WhatsApp on the business phone</li>
              <li>Settings → Linked devices → Link a device</li>
              <li>Scan this QR code</li>
            </ol>
          </div>
        ) : null}

        {connected ? (
          <p className="help-block" style={{ marginTop: 8, marginBottom: 0 }}>
            Session saved on the API server. Job status notifies will send over
            this link when enabled on the job.
          </p>
        ) : null}

        <div className="hq6-wa-actions">
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-sm"
            disabled={busy}
            onClick={() => void invalidate()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-sm tw-dw-btn-primary tw-text-white"
            disabled={busy || !enabled}
            onClick={() => reconnectMutation.mutate(false)}
          >
            Reconnect
          </button>
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-sm tw-dw-btn-outline"
            disabled={busy || !enabled}
            onClick={() => {
              if (
                !window.confirm(
                  "Clear the saved WhatsApp session and show a fresh QR? The phone will need to scan again.",
                )
              ) {
                return;
              }
              reconnectMutation.mutate(true);
            }}
          >
            Clear session &amp; re-link
          </button>
        </div>

        <div className="hq6-wa-test">
          <label className="hq6-form-label">
            <span>Test send (your phone)</span>
            <div className="hq6-wa-test-row">
              <input
                className="form-control"
                placeholder="0803…"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="tw-dw-btn tw-dw-btn-sm tw-dw-btn-primary tw-text-white"
                disabled={busy || !testPhone.trim()}
                onClick={() => testMutation.mutate()}
              >
                Send test
              </button>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
