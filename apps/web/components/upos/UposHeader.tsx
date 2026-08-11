"use client";

/**
 * Ultimate POS header — converted from layouts/partials/header.blade.php
 * + header-notifications. Matches HQ6 home screenshot icon row:
 * tools(+) | calculator | fullscreen | POS | date | bell | user
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/api/auth";
import { getNotifications, markNotificationRead } from "@/lib/api/notifications";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { TenantSwitcher } from "@/components/molecules/TenantSwitcher";
import { AdminEntitySwitcher } from "@/components/molecules/AdminEntitySwitcher";
import {
  Hq6GlobalChromeModals,
  type Hq6GlobalModalId,
} from "@/components/hq6/Hq6GlobalChromeModals";
import { formatApiError } from "@/lib/utils/formatApiError";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils/cn";
import { tenantBasePath } from "@/lib/utils/tenantMount";

export interface UposHeaderProps {
  tenantCode: string;
  tenantName?: string;
  userName?: string;
  onToggleMobile: () => void;
  onToggleCollapse: () => void;
  /** VAG admin header: entity switcher, no POS / profit shortcuts. */
  variant?: "tenant" | "admin";
}

const btnClass =
  "tw-inline-flex tw-items-center tw-justify-center tw-text-sm tw-font-medium tw-text-white tw-transition-all tw-duration-200 theme-btn-bg tw-p-1.5 tw-rounded-lg tw-ring-1 hover:tw-text-white tw-ring-white/10";

function formatHq6Date(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function toggleFullscreen() {
  if (typeof document === "undefined") return;
  if (!document.fullscreenElement) {
    void document.documentElement.requestFullscreen?.();
  } else {
    void document.exitFullscreen?.();
  }
}

export function UposHeader({
  tenantCode,
  tenantName,
  userName,
  onToggleMobile,
  onToggleCollapse,
  variant = "tenant",
}: UposHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const authName = useAuthStore((s) => s.name);
  const displayName = userName ?? authName ?? "User";
  const isAdminHeader = variant === "admin";
  const showTenantTools = !isAdminHeader;
  const setNotifications = useUiStore((s) => s.setNotifications);
  const notifications = useUiStore((s) => s.notifications);
  const unreadCount = (Array.isArray(notifications) ? notifications : []).filter(
    (n) => !n.read,
  ).length;

  const [userOpen, setUserOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hq6GlobalModal, setHq6GlobalModal] = useState<Hq6GlobalModalId>(null);
  const userRef = useRef<HTMLDetailsElement>(null);
  const toolsRef = useRef<HTMLDetailsElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const [today] = useState(() => formatHq6Date(new Date()));

  const notificationsQuery = useQuery({
    queryKey: ["notifications", tenantId ?? (isAdminHeader ? "group" : "none")],
    queryFn: () => getNotifications(tenantId ?? undefined),
    enabled: Boolean(tenantId) || isAdminHeader,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (notificationsQuery.data) {
      setNotifications(notificationsQuery.data);
    }
  }, [notificationsQuery.data, setNotifications]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (userRef.current && !userRef.current.contains(t)) setUserOpen(false);
      if (toolsRef.current && !toolsRef.current.contains(t)) setToolsOpen(false);
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
      router.replace("/login");
    }
  };

  const markRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      void queryClient.invalidateQueries({ queryKey: ["notifications", tenantId] });
    } catch (error) {
      toast.error(`Could not mark notification read: ${formatApiError(error)}`);
    }
  };

  return (
    <>
      <div className="tw-transition-all tw-duration-5000 tw-border-b theme-header-bg tw-shrink-0 lg:tw-h-15 tw-border-primary-500/30 no-print">
        <div className="tw-px-5 tw-py-3">
          <div className="tw-flex tw-items-center tw-justify-between tw-gap-2 sm:tw-gap-3 md:tw-gap-4 lg:tw-gap-6">
            <div className="tw-flex tw-min-w-0 tw-shrink tw-items-center tw-gap-2 sm:tw-gap-3">
              <button
                type="button"
                className={cn(btnClass, "small-view-button xl:tw-w-20 lg:tw-hidden")}
                onClick={onToggleMobile}
                aria-label="Sidebar Menu"
              >
                <svg
                  aria-hidden
                  className="tw-size-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M4 6l16 0" />
                  <path d="M4 12l16 0" />
                  <path d="M4 18l16 0" />
                </svg>
              </button>

              <button
                type="button"
                className={cn(btnClass, "side-bar-collapse tw-hidden lg:tw-inline-flex")}
                onClick={onToggleCollapse}
                aria-label="Collapse Sidebar"
              >
                <svg
                  aria-hidden
                  className="tw-size-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
                  <path d="M15 4v16" />
                  <path d="M10 10l-2 2l2 2" />
                </svg>
              </button>

              {/* VAG topbar: leave admin → full entity dashboard (not module scope). */}
              {isAdminHeader ? (
                <AdminEntitySwitcher variant="topbar" />
              ) : (
                <TenantSwitcher
                  tenantCode={tenantCode}
                  tenantName={tenantName}
                  variant="topbar"
                  className="tw-min-w-0 tw-w-[9.5rem] sm:tw-w-[12rem] md:tw-w-[14rem] lg:tw-w-[16rem]"
                />
              )}
              {isAdminHeader ? (
                <span className="tw-hidden tw-shrink-0 tw-rounded tw-bg-white/15 tw-px-2 tw-py-1 tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-wide tw-text-white/90 lg:tw-inline-block">
                  Super Admin
                </span>
              ) : null}
            </div>

            <div className="tw-flex tw-min-w-0 tw-flex-wrap tw-items-center tw-justify-end tw-gap-2 sm:tw-gap-3">
              {showTenantTools ? (
                <>
                  {/* Tools: Calendar / To Do */}
                  <details
                    ref={toolsRef}
                    className="tw-dw-dropdown tw-relative tw-hidden tw-text-left sm:tw-inline-block"
                    open={toolsOpen}
                    onToggle={(e) =>
                      setToolsOpen((e.target as HTMLDetailsElement).open)
                    }
                  >
                    <summary
                      className={cn(
                        btnClass,
                        "tw-py-1.5 tw-px-3 tw-gap-1 tw-cursor-pointer",
                      )}
                    >
                      <svg
                        aria-hidden
                        className="tw-size-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
                        <path d="M9 12h6" />
                        <path d="M12 9v6" />
                      </svg>
                    </summary>
                    <ul
                      className="tw-w-48 tw-absolute tw-left-0 tw-z-10 tw-mt-2 tw-origin-top-right tw-bg-white tw-rounded-lg tw-shadow-lg tw-ring-1 tw-ring-gray-200"
                      role="menu"
                    >
                      <div className="tw-p-2" role="none">
                        <button
                          type="button"
                          className="tw-flex tw-w-full tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-600 tw-rounded-lg hover:tw-bg-gray-100 tw-bg-transparent tw-border-0 tw-cursor-pointer"
                          role="menuitem"
                          onClick={() => {
                            setToolsOpen(false);
                            setHq6GlobalModal("task");
                          }}
                        >
                          Calendar / To Do
                        </button>
                        <Link
                          href={`${tenantBasePath(tenantCode)}/essentials-todo`}
                          className="tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-600 tw-rounded-lg hover:tw-bg-gray-100"
                          role="menuitem"
                          onClick={() => setToolsOpen(false)}
                        >
                          Essentials
                        </Link>
                      </div>
                    </ul>
                  </details>
                </>
              ) : null}

              {/* Calculator — available on tenant + VAG */}
              <button
                id="btnCalculator"
                type="button"
                title="Calculator"
                aria-label="Calculator"
                className={cn(btnClass, "tw-hidden md:tw-inline-flex")}
                onClick={() => setHq6GlobalModal("calculator")}
              >
                <svg
                  aria-hidden
                  className="tw-size-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M4 3m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
                  <path d="M8 7m0 1a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1z" />
                  <path d="M8 14l0 .01" />
                  <path d="M12 14l0 .01" />
                  <path d="M16 14l0 .01" />
                  <path d="M8 17l0 .01" />
                  <path d="M12 17l0 .01" />
                  <path d="M16 17l0 .01" />
                </svg>
              </button>

              {/* Fullscreen */}
              <button
                type="button"
                title="Fullscreen"
                aria-label="Fullscreen"
                className={cn(btnClass, "tw-hidden md:tw-inline-flex")}
                onClick={toggleFullscreen}
              >
                <svg
                  aria-hidden
                  className="tw-size-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M4 8v-2a2 2 0 0 1 2 -2h2" />
                  <path d="M4 16v2a2 2 0 0 0 2 2h2" />
                  <path d="M16 4h2a2 2 0 0 1 2 2v2" />
                  <path d="M16 20h2a2 2 0 0 0 2 -2v-2" />
                </svg>
              </button>

              {showTenantTools ? (
                <>
                  {/* POS */}
                  <Link
                    href={`${tenantBasePath(tenantCode)}/pos-terminal`}
                    className="tw-inline-flex tw-transition-all tw-duration-200 tw-gap-2 theme-btn-bg tw-py-1.5 tw-px-3 tw-rounded-lg tw-items-center tw-justify-center tw-text-sm tw-font-medium tw-ring-1 tw-ring-white/10 hover:tw-text-white tw-text-white"
                  >
                    <svg
                      aria-hidden
                      className="tw-size-5 tw-hidden md:tw-block"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                      <path d="M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                      <path d="M14 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                      <path d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                      <path d="M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                    </svg>
                    POS
                  </Link>

                  {/* Today's profit */}
                  <button
                    type="button"
                    id="view_todays_profit"
                    title="Today's Profit"
                    aria-label="Today's Profit"
                    className={cn(btnClass, "tw-hidden sm:tw-inline-flex")}
                    onClick={() => setHq6GlobalModal("todays-profit")}
                  >
                    <svg
                      aria-hidden
                      className="tw-size-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                      <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                      <path d="M3 6m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
                      <path d="M18 12l.01 0" />
                      <path d="M6 12l.01 0" />
                    </svg>
                  </button>
                </>
              ) : null}

              {/* Date */}
              <button
                type="button"
                className="tw-hidden xl:tw-inline-flex tw-transition-all tw-ring-1 tw-ring-white/10 tw-duration-200 theme-btn-bg tw-py-1.5 tw-px-3 tw-rounded-lg tw-items-center tw-justify-center tw-text-sm tw-font-medium tw-text-white hover:tw-text-white tw-font-mono"
              >
                {today}
              </button>

              {/* Notifications */}
              <div ref={notifRef} className="tw-relative tw-list-none">
                <button
                  type="button"
                  className={cn(btnClass, "load_notifications")}
                  id="show_unread_notifications"
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                  onClick={() => setNotifOpen((v) => !v)}
                >
                  <svg
                    aria-hidden
                    className="tw-size-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
                    <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
                  </svg>
                  {unreadCount > 0 ? (
                    <span className="label label-warning notifications_count">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
                {notifOpen ? (
                  <ul
                    className="tw-p-2 tw-w-80 tw-absolute tw-right-0 tw-z-10 tw-mt-2 tw-origin-top-right tw-bg-white tw-rounded-lg tw-shadow-lg tw-ring-1 tw-ring-gray-200"
                    style={{ maxHeight: "70vh", overflowY: "auto" }}
                  >
                    {notifications.length === 0 ? (
                      <li className="tw-px-3 tw-py-4 tw-text-sm tw-text-gray-500">
                        No notifications
                      </li>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            className={cn(
                              "tw-w-full tw-text-left tw-px-3 tw-py-2 tw-text-sm tw-rounded-lg hover:tw-bg-gray-100 tw-bg-transparent tw-border-0 tw-cursor-pointer",
                              !n.read && "tw-font-semibold tw-text-gray-900",
                              n.read && "tw-text-gray-600",
                            )}
                            onClick={() => {
                              void markRead(n.id);
                            }}
                          >
                            <span className="tw-block">{n.title}</span>
                            {n.message ? (
                              <span className="tw-block tw-text-xs tw-font-normal tw-text-gray-500">
                                {n.message}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </div>

              {/* User */}
              <details
                ref={userRef}
                className="tw-dw-dropdown tw-relative tw-inline-block tw-text-left"
                open={userOpen}
                onToggle={(e) =>
                  setUserOpen((e.target as HTMLDetailsElement).open)
                }
              >
                <summary
                  className={cn(
                    btnClass,
                    "tw-dw-m-1 tw-py-1.5 tw-px-3 tw-gap-1 tw-cursor-pointer",
                  )}
                >
                  <span className="tw-hidden md:tw-block">{displayName}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="tw-size-5"
                    aria-hidden
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                    <path d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                    <path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855" />
                  </svg>
                </summary>

                <ul
                  className="tw-p-2 tw-w-48 tw-absolute tw-right-0 tw-z-10 tw-mt-2 tw-origin-top-right tw-bg-white tw-rounded-lg tw-shadow-lg tw-ring-1 tw-ring-gray-200"
                  role="menu"
                >
                  <div className="tw-px-4 tw-pt-3 tw-pb-1" role="none">
                    <p className="tw-text-sm" role="none">
                      Signed in as
                    </p>
                    <p
                      className="tw-text-sm tw-font-medium tw-text-gray-900 tw-truncate"
                      role="none"
                    >
                      {displayName}
                    </p>
                  </div>
                  <li>
                    <Link
                      href={isAdminHeader ? "/admin/security" : `${tenantBasePath(tenantCode)}/users`}
                      className="tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-600 tw-rounded-lg hover:tw-bg-gray-100"
                      role="menuitem"
                      onClick={() => setUserOpen(false)}
                    >
                      {isAdminHeader ? "Security" : "Profile"}
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="tw-flex tw-w-full tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-600 tw-rounded-lg hover:tw-bg-gray-100 tw-bg-transparent tw-border-0 tw-cursor-pointer"
                      role="menuitem"
                      onClick={() => {
                        setUserOpen(false);
                        void handleLogout();
                      }}
                    >
                      Sign out
                    </button>
                  </li>
                </ul>
              </details>
            </div>
          </div>
        </div>
      </div>

      <Hq6GlobalChromeModals
        active={hq6GlobalModal}
        onClose={() => setHq6GlobalModal(null)}
      />
    </>
  );
}
