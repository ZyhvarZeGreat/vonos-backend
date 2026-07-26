"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { toast } from "@/stores/toastStore";

/**
 * Ultimate POS — cash_register/create.blade.php (Open Cash Register).
 * ui-audit/27_pos__create
 */
export function Hq6PosOpenRegisterView() {
  const router = useRouter();
  const { tenantCode, config } = useRouteTenant();
  const [cashInHand, setCashInHand] = useState("");
  const [locationCode, setLocationCode] = useState("");

  const locations = config?.businessLocations ?? [];

  return (
    <div className="hq6-page hq6-open-register-page">
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          Open Cash Register
        </h1>
      </section>

      <section className="content">
        <div className="box box-solid tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
          <div className="box-body">
            <br />
            <br />
            <br />
            <div className="row">
              <div className="col-sm-8 col-sm-offset-2">
                <div className="form-group">
                  <label htmlFor="cash_in_hand">
                    Cash in hand:<span className="req">*</span>
                  </label>
                  <input
                    id="cash_in_hand"
                    type="text"
                    className="form-control input_number"
                    placeholder="Enter amount"
                    value={cashInHand}
                    onChange={(e) => setCashInHand(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="clearfix" />
              <div className="col-sm-8 col-sm-offset-2">
                <div className="form-group">
                  <label htmlFor="location_id">Business Location:</label>
                  <select
                    id="location_id"
                    className="form-control"
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
                </div>
              </div>
              <div className="col-sm-8 col-sm-offset-2">
                <button
                  type="button"
                  className="tw-dw-btn tw-dw-btn-primary tw-text-white pull-right"
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
            <br />
            <br />
            <br />
          </div>
        </div>
      </section>

      <p className="hq6-footer">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()}{" "}
        All rights reserved.
      </p>
    </div>
  );
}
