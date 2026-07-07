"use client";

import { useMemo, useState } from "react";
import { StatusPill } from "@/components/atoms/StatusPill";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getAppointmentsPage } from "@/lib/api/appointments";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import {
  filterByDateField,
  filterBySearch,
  uniqueFieldOptions,
} from "@/lib/utils/listFilters";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

export function AppointmentsCalendarView() {
  const { goToDetail } = useRecordNavigation("appointments");
  const tenantId = useTenantId();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [statusFilter, setStatusFilter] = useState("");
  const [stylistFilter, setStylistFilter] = useState("");

  const {
    items: appointments,
    hasMore,
    pageIndex,
    pageSize,
    canGoPrev,
    goNext,
    goPrev,
    setPageSize,
    isLoading,
    error,
  } = useServerListPage({
    queryKey: ["appointments", tenantId],
    enabled: Boolean(tenantId),
    search,
    defaultPageSize: 50,
    fetchPage: (cursor, limit) => getAppointmentsPage(tenantId!, cursor, limit),
  });

  const stylists = useMemo(
    () => [...new Set(appointments.map((a) => a.stylistName))].sort(),
    [appointments],
  );

  const timeSlots = useMemo(() => {
    const hours = new Set<string>();
    for (const appt of appointments) {
      const date = new Date(appt.startTime);
      if (!Number.isNaN(date.getTime())) {
        hours.add(`${date.getHours()}:00`);
      }
    }
    return [...hours].sort((a, b) => Number(a.split(":")[0]) - Number(b.split(":")[0]));
  }, [appointments]);

  const filtered = useMemo(() => {
    let rows = filterByDateField(appointments, bounds, "startTime");
    if (statusFilter) rows = rows.filter((a) => a.status === statusFilter);
    if (stylistFilter) rows = rows.filter((a) => a.stylistName === stylistFilter);
    return filterBySearch(rows, search, ["customerName", "serviceName", "stylistName"]);
  }, [appointments, bounds, search, statusFilter, stylistFilter]);

  const statusOptions = useMemo(
    () => uniqueFieldOptions(appointments, "status"),
    [appointments],
  );
  const stylistOptions = useMemo(
    () => uniqueFieldOptions(appointments, "stylistName"),
    [appointments],
  );

  return (
    <ListPageShell
      tabs={[{ id: "calendar", label: "Calendar" }]}
      activeTab="calendar"
      onTabChange={() => {}}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search appointments..."
      showImport={false}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      filterDropdowns={[
        {
          id: "status",
          label: "Status",
          value: statusFilter,
          onChange: setStatusFilter,
          options: statusOptions,
        },
        {
          id: "stylist",
          label: "Stylist",
          value: stylistFilter,
          onChange: setStylistFilter,
          options: stylistOptions,
        },
      ]}
    >
      {error ? (
        <p className="p-4 text-sm text-error">Failed to load appointments.</p>
      ) : isLoading ? (
        <p className="p-4 text-sm text-muted">Loading appointments…</p>
      ) : stylists.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted">No appointments scheduled yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-[var(--color-surface-muted)]">
                  <th className="px-4 py-3 text-left font-medium text-muted">Time</th>
                  {stylists.map((stylist) => (
                    <th key={stylist} className="px-4 py-3 text-left font-medium text-foreground">
                      {stylist}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-muted">{slot}</td>
                    {stylists.map((stylist) => {
                      const appt = filtered.find((a) => {
                        if (a.stylistName !== stylist) return false;
                        const date = new Date(a.startTime);
                        return `${date.getHours()}:00` === slot;
                      });
                      return (
                        <td key={stylist} className="px-4 py-3 align-top">
                          {appt ? (
                            <button
                              type="button"
                              onClick={() => goToDetail(appt.id)}
                              className="w-full rounded-lg border border-border bg-[var(--color-surface-muted)] p-3 text-left transition-colors hover:border-[var(--color-brand-primary)]"
                            >
                              <p className="font-medium text-foreground">{appt.customerName}</p>
                              <p className="mt-0.5 text-xs text-muted">{appt.serviceName}</p>
                              <div className="mt-2">
                                <StatusPill status={appt.status} vocabulary="appointmentStatus" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {appointments.length > 0 || canGoPrev ? (
            <CursorPaginationBar
              pageIndex={pageIndex}
              pageSize={pageSize}
              itemCount={appointments.length}
              hasMore={hasMore}
              canGoPrev={canGoPrev}
              onPrev={goPrev}
              onNext={goNext}
              onPageSizeChange={setPageSize}
            />
          ) : null}
        </div>
      )}
    </ListPageShell>
  );
}

export function StylistScheduleView() {
  return (
    <div className="max-w-2xl space-y-6 rounded-xl border border-border bg-card p-6 shadow-card">
      <div>
        <h3 className="text-base font-semibold text-foreground">Stylist Availability</h3>
        <p className="mt-1 text-sm text-muted">
          Configure bookable time slots per stylist. Affects appointment calendar.
        </p>
      </div>
      <p className="text-sm text-muted">
        Stylist schedules are not yet stored in the platform database.
      </p>
    </div>
  );
}
