import { apiUrl } from "@/lib/api/client";

export type PublicTrackStep = {
  id: string;
  label: string;
  detail: string;
  status: "complete" | "current" | "upcoming";
  timestamp?: string;
};

export type PublicTrackResult = {
  name: string;
  registration: string;
  vehicle: string;
  service: string;
  location: string;
  locationCode: "VA" | "VP";
  status: string;
  statusLabel: string;
  /** Workshop only — payment is separate from this phase. */
  phase?: "active" | "completed";
  advisor: string | null;
  eta: string | null;
  reference: string;
  steps: PublicTrackStep[];
};

export async function lookupVehicleTrack(args: {
  name: string;
  registration: string;
}): Promise<PublicTrackResult> {
  const params = new URLSearchParams({
    name: args.name.trim(),
    registration: args.registration.trim(),
  });
  const response = await fetch(apiUrl(`/public/track?${params}`), {
    credentials: "omit",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    let message = "Could not find that vehicle.";
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === "string") message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(", ");
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return response.json() as Promise<PublicTrackResult>;
}

/** Save WhatsApp number for the matched plate — used for status notifies. */
export async function subscribeTrackWhatsApp(args: {
  name: string;
  registration: string;
  whatsapp: string;
}): Promise<{ ok: true; phone: string }> {
  const response = await fetch(apiUrl("/public/track/subscribe"), {
    method: "POST",
    credentials: "omit",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: args.name.trim(),
      registration: args.registration.trim(),
      whatsapp: args.whatsapp.trim(),
    }),
  });

  if (!response.ok) {
    let message = "Could not save WhatsApp number.";
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === "string") message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(", ");
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return response.json() as Promise<{ ok: true; phone: string }>;
}
