import { apiFetch } from "@/lib/api/client";
import { throwApiError } from "@/lib/api/parseApiError";

export type WhatsAppChannel = "baileys" | "unipile" | "cloud_api" | "wa_me";

export type BaileysStatus = {
  enabled: boolean;
  connected: boolean;
  hasQr: boolean;
  authDir: string;
  lastError: string | null;
};

export type WhatsAppStatusResponse = {
  channel: WhatsAppChannel;
  unipile: boolean;
  metaCloud: boolean;
  baileys: BaileysStatus;
};

export type BaileysQrResponse = BaileysStatus & {
  qrDataUrl: string | null;
  hint?: string;
};

export type WhatsAppTestResult = {
  sent: boolean;
  channel: WhatsAppChannel | "skipped";
  waMeUrl: string | null;
  toE164: string | null;
  error?: string;
  providerMessageId?: string;
};

/** Toast helper after create/update contact or vehicle with a new phone. */
export function describeWhatsAppNotify(wa: WhatsAppTestResult): {
  ok: boolean;
  message: string;
} {
  if (wa.sent) {
    return {
      ok: true,
      message: `WhatsApp welcome sent via ${wa.channel}${
        wa.toE164 ? ` → ${wa.toE164}` : ""
      }`,
    };
  }
  if (wa.error) {
    return { ok: false, message: `WhatsApp: ${wa.error}` };
  }
  if (wa.channel === "wa_me" && wa.waMeUrl) {
    return {
      ok: false,
      message: "WhatsApp not connected — use Notification Templates to link, or open wa.me",
    };
  }
  return { ok: false, message: "WhatsApp welcome was not sent" };
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatusResponse> {
  const response = await apiFetch("/whatsapp/status");
  if (!response.ok) {
    return throwApiError(response, "Failed to load WhatsApp status");
  }
  return response.json();
}

export async function getBaileysQr(): Promise<BaileysQrResponse> {
  const response = await apiFetch("/whatsapp/baileys/qr");
  if (!response.ok) {
    return throwApiError(response, "Failed to load WhatsApp QR");
  }
  return response.json();
}

export async function reconnectBaileys(
  clearSession = false,
): Promise<BaileysStatus> {
  const response = await apiFetch("/whatsapp/baileys/reconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clearSession }),
  });
  if (!response.ok) {
    return throwApiError(response, "Failed to reconnect WhatsApp");
  }
  return response.json();
}

export async function testWhatsAppSend(args: {
  phone: string;
  message?: string;
}): Promise<WhatsAppTestResult> {
  const response = await apiFetch("/whatsapp/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: args.phone.trim(),
      ...(args.message?.trim() ? { message: args.message.trim() } : {}),
    }),
  });
  if (!response.ok) {
    return throwApiError(response, "WhatsApp test send failed");
  }
  return response.json();
}
