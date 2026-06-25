"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Inbox, LogOut, Menu, Plus } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { IconButton } from "@/components/atoms/IconButton";
import { TenantSwitcher } from "@/components/molecules/TenantSwitcher";
import { typographyRoles } from "@/lib/registries/typography";
import { NotificationPanel } from "@/components/organisms/NotificationPanel";
import { CreateRecordModal } from "@/components/organisms/CreateRecordModal";
import { AddSaleModal } from "@/components/organisms/AddSaleModal";
import { AddProductModal } from "@/components/organisms/AddProductModal";
import { AddExpenseModal } from "@/components/organisms/AddExpenseModal";
import { ExportDocumentModal } from "@/components/organisms/ExportDocumentModal";
import { getNotifications, markNotificationRead } from "@/lib/api/notifications";
import { logout } from "@/lib/api/auth";
import { formatTimeAgo } from "@/lib/utils/formatTimeAgo";
import { useUiStore } from "@/stores/uiStore";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { useAuthStore } from "@/stores/authStore";
import { formatApiError } from "@/lib/utils/formatApiError";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils/cn";

export interface TopBarProps {
  title?: string;
  tenantCode?: string;
  tenantName?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryAction?: React.ReactNode;
  className?: string;
}

export function TopBar({
  title = "Overview",
  tenantCode = "VW",
  tenantName,
  primaryActionLabel = "New Order",
  onPrimaryAction,
  primaryAction,
  className,
}: TopBarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const notificationsOpen = useUiStore((state) => state.notificationsOpen);
  const toggleNotifications = useUiStore((state) => state.toggleNotifications);
  const setNotificationsOpen = useUiStore((state) => state.setNotificationsOpen);
  const setNotifications = useUiStore((state) => state.setNotifications);
  const openCreateModal = useUiStore((state) => state.openCreateModal);
  const notifications = useUiStore((state) => state.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const tenantId = useTenantId();

  const notificationsQuery = useQuery({
    queryKey: ["notifications", tenantId],
    queryFn: () => getNotifications(tenantId ?? undefined),
    enabled: Boolean(tenantId),
    meta: {
      suppressErrorToast: false,
      errorLabel: "Notifications",
    },
  });

  useEffect(() => {
    if (notificationsQuery.data) {
      setNotifications(notificationsQuery.data);
    }
  }, [notificationsQuery.data, setNotifications]);

  const feedItems = notifications.map((n) => ({
    id: n.id,
    message: n.title ? `${n.title}: ${n.message}` : n.message,
    timeAgo: formatTimeAgo(n.createdAt),
    read: n.read,
  }));

  const handleNotificationClick = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.read) return;
    try {
      await markNotificationRead(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      await queryClient.invalidateQueries({ queryKey: ["notifications", tenantId] });
    } catch (error) {
      toast.error(`Could not mark notification read: ${formatApiError(error)}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.info("Signed out");
    } catch (error) {
      toast.error(formatApiError(error, "Sign out failed"));
    } finally {
      clearAuth();
      router.replace("/login");
    }
  };

  return (
    <>
      <header
        className={cn(
          "relative flex h-[var(--space-topbar-height)] flex-shrink-0 items-center justify-between border-b border-border bg-[var(--color-surface-topbar)] px-6 lg:px-10",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <IconButton label="Toggle sidebar" className="md:hidden" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </IconButton>
          <TenantSwitcher
            tenantCode={tenantCode}
            tenantName={tenantName}
            variant="topbar"
            className="hidden md:block"
          />
          <span className="hidden text-muted md:inline" aria-hidden>
            /
          </span>
          <h1 className={typographyRoles.pageTitle}>{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <IconButton label="Inbox">
            <Inbox className="h-5 w-5" />
          </IconButton>
          <div className="relative">
            <IconButton label="Notifications" onClick={toggleNotifications}>
              <Bell className="h-5 w-5" />
            </IconButton>
            {unreadCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full border-2 border-white bg-error" />
            ) : null}
            <NotificationPanel
              open={notificationsOpen}
              items={feedItems}
              onItemClick={handleNotificationClick}
            />
          </div>
          {isAuthenticated ? (
            <IconButton label="Sign out" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </IconButton>
          ) : null}
          {primaryAction ?? (
            <Button
              size="sm"
              className="ml-2 gap-2"
              onClick={
                onPrimaryAction ??
                (() => {
                  setNotificationsOpen(false);
                  openCreateModal("item");
                })
              }
            >
              <Plus className="h-4 w-4" />
              {primaryActionLabel}
            </Button>
          )}
        </div>
      </header>
      <CreateRecordModal />
      <AddSaleModal />
      <AddProductModal />
      <AddExpenseModal />
      <ExportDocumentModal />
    </>
  );
}
