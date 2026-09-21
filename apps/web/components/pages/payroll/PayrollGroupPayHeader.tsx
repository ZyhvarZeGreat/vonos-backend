"use client";

import type { BusinessLocation } from "@vonos/types";
import { Hq6BoldStatusBadge } from "@/components/hq6/Hq6BoldStatusBadge";
import {
  businessLocationName,
  resolveBusinessLocation,
} from "@/lib/utils/locationLabels";

export type PayrollGroupPayHeaderProps = {
  groupName: string;
  entityName: string;
  entityCode?: string | null;
  locationCode?: string | null;
  businessLocations?: BusinessLocation[];
  businessAddress?: {
    landmark?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  status: string;
};

function addressLines(
  location: BusinessLocation | null,
  businessAddress?: PayrollGroupPayHeaderProps["businessAddress"],
): string[] {
  if (location) {
    const street = [location.landmark, location.city, location.state, location.zipCode]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", ");
    const lines: string[] = [];
    if (street) lines.push(street.toUpperCase());
    if (location.country?.trim()) lines.push(location.country.trim());
    return lines;
  }
  if (!businessAddress) return [];
  const street = [
    businessAddress.landmark,
    businessAddress.city,
    businessAddress.state,
    businessAddress.zipCode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  const lines: string[] = [];
  if (street) lines.push(street.toUpperCase());
  if (businessAddress.country?.trim()) lines.push(businessAddress.country.trim());
  return lines;
}

/** HQ6 / UPOS payroll add-payment letterhead — entity + location left, title center, meta right. */
export function PayrollGroupPayHeader({
  groupName,
  entityName,
  entityCode,
  locationCode,
  businessLocations,
  businessAddress,
  status,
}: PayrollGroupPayHeaderProps) {
  const location = resolveBusinessLocation(locationCode, businessLocations);
  const locationLabel =
    businessLocationName(locationCode, businessLocations) ??
    location?.name ??
    locationCode?.trim() ??
    entityCode?.trim() ??
    null;
  const lines = addressLines(location, businessAddress);

  return (
    <header className="hq6-payroll-group-pay-letterhead">
      <div className="hq6-payroll-group-pay-letterhead-col hq6-payroll-group-pay-letterhead-left">
        <p className="hq6-payroll-group-pay-entity">{entityName}</p>
        {locationLabel ? (
          <p className="hq6-payroll-group-pay-location">{locationLabel.toUpperCase()}</p>
        ) : null}
        {lines.map((line) => (
          <p key={line} className="hq6-payroll-group-pay-address">
            {line}
          </p>
        ))}
      </div>

      <div className="hq6-payroll-group-pay-letterhead-col hq6-payroll-group-pay-letterhead-center">
        <h2 className="hq6-payroll-group-pay-doc-title">{groupName}</h2>
      </div>

      <div className="hq6-payroll-group-pay-letterhead-col hq6-payroll-group-pay-letterhead-right">
        <p>
          <span className="hq6-payroll-group-pay-meta-label">Payroll group:</span>{" "}
          {groupName}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="hq6-payroll-group-pay-meta-label">Status:</span>
          <Hq6BoldStatusBadge status={status} kind="payroll" />
        </p>
      </div>
    </header>
  );
}
