"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import type { HrmSettings } from "@vonos/types";
import { defaultHrmSettings, mergeHrmSettings } from "@vonos/types";
import { updateTenantConfig } from "@/lib/api/tenants";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { cn } from "@/lib/utils/cn";
import { useTenantStore } from "@/stores/tenantStore";

const HRM_SETTINGS_NAV = [
  { id: "leave", label: "Leave" },
  { id: "payroll", label: "Payroll" },
  { id: "attendance", label: "Attendance" },
  { id: "salesTargets", label: "Sales Targets" },
  { id: "essentials", label: "Essentials" },
] as const;

type HrmSettingsNavId = (typeof HRM_SETTINGS_NAV)[number]["id"];

function InfoHint({ title }: { title?: string }) {
  return (
    <Info
      className="inline h-3.5 w-3.5 shrink-0 text-[var(--hq6-blue)]"
      aria-label={title ?? "More information"}
    />
  );
}

function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-semibold text-[#333]">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-[#777]">{hint}</span> : null}
    </label>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
  info,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  info?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-[#333]">
      <input
        type="checkbox"
        className="size-4 accent-[#3c8dbc]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="inline-flex items-center gap-1">
        {label}
        {info ? <InfoHint /> : null}
      </span>
    </label>
  );
}

export function HrmSettingsView() {
  const { tenantId } = useRouteTenant();
  const config = useTenantStore((s) => s.tenantConfig);
  const setTenantConfig = useTenantStore((s) => s.setTenantConfig);
  const [nav, setNav] = useState<HrmSettingsNavId>("leave");
  const [draft, setDraft] = useState<HrmSettings>(() =>
    mergeHrmSettings(undefined, config?.hrmSettings),
  );

  useEffect(() => {
    setDraft(mergeHrmSettings(undefined, config?.hrmSettings));
  }, [config?.hrmSettings]);

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      return updateTenantConfig(tenantId, { hrmSettings: draft });
    },
    successMessage: "HRM settings updated",
    invalidateKeys: [["tenantConfig", tenantId]],
    onSuccess: (updated) => {
      setTenantConfig(updated);
    },
  });

  const leave = draft.leave ?? defaultHrmSettings().leave!;
  const payroll = draft.payroll ?? defaultHrmSettings().payroll!;
  const attendance = draft.attendance ?? defaultHrmSettings().attendance!;
  const salesTargets = draft.salesTargets ?? defaultHrmSettings().salesTargets!;
  const essentials = draft.essentials ?? defaultHrmSettings().essentials!;

  return (
    <div className="hq6-page space-y-3">
      <section className="hq6-content-header">
        <h1>Essentials and HRM Settings</h1>
      </section>

      <div className="hq6-biz-settings-shell overflow-hidden rounded border border-[#d2d6de] bg-white">
        <div className="hq6-biz-settings-body flex min-h-[28rem] flex-col md:flex-row">
          <nav
            className="hq6-biz-settings-nav flex w-full shrink-0 flex-col border-b border-[#d2d6de] bg-[#fafafa] md:w-[13.5rem] md:border-b-0 md:border-r"
            aria-label="HRM settings sections"
          >
            {HRM_SETTINGS_NAV.map((item) => {
              const active = nav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setNav(item.id)}
                  className={cn(
                    "hq6-biz-settings-tab flex w-full items-center justify-start gap-1.5 border-0 border-b border-[#d2d6de] px-3 py-[0.65rem] text-left text-[13px] font-medium",
                    active
                      ? "hq6-biz-settings-tab-active bg-[#3c8dbc] text-white"
                      : "bg-white text-[#444] hover:bg-[#f4f4f4]",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 flex-1 space-y-4 p-4 md:p-5">
            {nav === "leave" ? (
              <>
                <Field label="Leave Reference No. prefix:">
                  <input
                    className="hq6-modal-input w-full"
                    placeholder="Leave Reference No. prefix"
                    value={leave.leaveRefNoPrefix ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        leave: { ...leave, leaveRefNoPrefix: e.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Leave Instructions:">
                  <textarea
                    className="hq6-modal-input min-h-[12rem] w-full resize-y"
                    value={leave.leaveInstructions ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        leave: { ...leave, leaveInstructions: e.target.value },
                      }))
                    }
                  />
                </Field>
              </>
            ) : null}

            {nav === "payroll" ? (
              <Field label="Payroll Reference No. prefix:">
                <input
                  className="hq6-modal-input w-full"
                  value={payroll.payrollRefNoPrefix ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      payroll: { ...payroll, payrollRefNoPrefix: e.target.value },
                    }))
                  }
                />
              </Field>
            ) : null}

            {nav === "attendance" ? (
              <div className="space-y-4">
                <CheckRow
                  label="Is location required?"
                  checked={Boolean(attendance.isLocationRequired)}
                  onChange={(v) =>
                    setDraft((prev) => ({
                      ...prev,
                      attendance: { ...attendance, isLocationRequired: v },
                    }))
                  }
                />
                <p className="text-sm font-semibold text-[#333]">Grace Time:</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Grace before checkin:"
                    hint="(in minute) this time will not counted as overtime"
                  >
                    <input
                      type="number"
                      className="hq6-modal-input w-full"
                      value={attendance.graceBeforeCheckin ?? "5"}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          attendance: {
                            ...attendance,
                            graceBeforeCheckin: e.target.value,
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field
                    label="Grace after checkin:"
                    hint="(in minute) this time will not counted as late"
                  >
                    <input
                      type="number"
                      className="hq6-modal-input w-full"
                      value={attendance.graceAfterCheckin ?? "5"}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          attendance: {
                            ...attendance,
                            graceAfterCheckin: e.target.value,
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field
                    label="Grace before checkout:"
                    hint="(in minute) this time will not counted as early left"
                  >
                    <input
                      type="number"
                      className="hq6-modal-input w-full"
                      value={attendance.graceBeforeCheckout ?? "5"}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          attendance: {
                            ...attendance,
                            graceBeforeCheckout: e.target.value,
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field
                    label="Grace after checkout:"
                    hint="(in minute) this time will not counted as overtime"
                  >
                    <input
                      type="number"
                      className="hq6-modal-input w-full"
                      value={attendance.graceAfterCheckout ?? "5"}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          attendance: {
                            ...attendance,
                            graceAfterCheckout: e.target.value,
                          },
                        }))
                      }
                    />
                  </Field>
                </div>
                <p className="flex items-start gap-2 text-xs text-[#777]">
                  <InfoHint />
                  <span>
                    &quot;Allow users to enter their own attendance&quot; setting has been
                    moved to role.
                  </span>
                </p>
              </div>
            ) : null}

            {nav === "salesTargets" ? (
              <CheckRow
                label="Calculate Sales Target Commission without Tax"
                checked={Boolean(salesTargets.calculateCommissionWithoutTax)}
                onChange={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    salesTargets: {
                      ...salesTargets,
                      calculateCommissionWithoutTax: v,
                    },
                  }))
                }
                info
              />
            ) : null}

            {nav === "essentials" ? (
              <Field label="Todos ID Prefix:">
                <input
                  className="hq6-modal-input w-full"
                  placeholder="Todos ID Prefix"
                  value={essentials.todosIdPrefix ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      essentials: {
                        ...essentials,
                        todosIdPrefix: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end border-t border-[#d2d6de] bg-white px-4 py-4">
          <button
            type="button"
            className="min-w-[8rem] rounded bg-[#dd4b39] px-8 py-2.5 text-[15px] font-semibold text-white hover:bg-[#c23321] disabled:opacity-70"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Updating…" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
