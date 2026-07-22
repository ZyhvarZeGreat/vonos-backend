"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { toast } from "@/stores/toastStore";

/** HQ6 Open Cash Register — screenshots-spacing-catalog/27_pos__create */
export function Hq6PosOpenRegisterView() {
  const router = useRouter();
  const { tenantCode, config } = useRouteTenant();
  const [cashInHand, setCashInHand] = useState("");
  const [locationCode, setLocationCode] = useState("");

  const locations = config?.businessLocations ?? [];

  return (
    <Hq6FormShell title="Open Cash Register">
      <div className="hq6-card mx-auto max-w-xl space-y-5 p-6">
        <label className="hq6-field">
          <span>
            Cash in hand:<span className="text-[var(--hq6-danger)]">*</span>
          </span>
          <input
            type="number"
            placeholder="Enter amount"
            value={cashInHand}
            onChange={(e) => setCashInHand(e.target.value)}
          />
        </label>
        <label className="hq6-field">
          <span>Business Location:</span>
          <select
            value={locationCode}
            onChange={(e) => setLocationCode(e.target.value)}
          >
            <option value="">Select location</option>
            {locations.map((loc) => (
              <option key={loc.code} value={loc.code}>
                {loc.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end">
          <button
            type="button"
            className="hq6-btn hq6-btn-blue !rounded-md !h-9 px-4"
            onClick={() => {
              if (!cashInHand.trim()) {
                toast.error("Enter cash in hand amount");
                return;
              }
              toast.success("Cash register opened");
              router.push(`/${tenantCode}/pos`);
            }}
          >
            Open Register
          </button>
        </div>
      </div>
    </Hq6FormShell>
  );
}
