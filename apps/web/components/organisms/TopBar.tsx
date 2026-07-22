"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Calculator,
  Clock,
  Grid2X2,
  Inbox,
  LogOut,
  Menu,
  Plus,
  TrendingUp,
  ListTodo,
  Monitor,
} from "lucide-react";
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
import {
  Hq6GlobalChromeModals,
  type Hq6GlobalModalId,
} from "@/components/hq6/Hq6GlobalChromeModals";
import { getNotifications, markNotificationRead } from "@/lib/api/notifications";
import { logout } from "@/lib/api/auth";
import { formatTimeAgo } from "@/lib/utils/formatTimeAgo";
import { useUiStore } from "@/stores/uiStore";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { useAuthStore } from "@/stores/authStore";
import { formatApiError } from "@/lib/utils/formatApiError";
import { toast } from "@/stores/toastStore";
import { topbarAccentStyle } from "@/lib/registries/tenantAccents";
import { cn } from "@/lib/utils/cn";
import { isHq6Tenant } from "@/lib/utils/isHq6Tenant";

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
  primaryActionLabel,
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
  const isHq6 = isHq6Tenant(tenantCode);
  const [hq6GlobalModal, setHq6GlobalModal] = useState<Hq6GlobalModalId>(null);
  const userName = useAuthStore((state) => state.name ?? state.email ?? "Admin");
  const userInitial = userName.trim().charAt(0).toUpperCase() || "A";
  const todayLabel = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  })();

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
        style={topbarAccentStyle(tenantCode)}
        className={cn(
          "relative flex h-[var(--space-topbar-height)] flex-shrink-0 items-center justify-between border-b border-[var(--color-topbar-border)] bg-[var(--color-surface-topbar)] px-6 text-[var(--color-topbar-text)] lg:px-10",
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
          <span
            className={cn(
              "hidden text-[var(--color-topbar-text-muted)] md:inline",
              isHq6 && "md:hidden",
            )}
            aria-hidden
          >
            /
          </span>
          <h1
            className={cn(
              typographyRoles.pageTitle,
              "!text-[var(--color-topbar-text)]",
              isHq6 && "sr-only",
            )}
          >
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {isHq6 ? (
            <div className="hq6-topbar-tools hidden lg:flex">
              <button
                type="button"
                className="hq6-topbar-icon hq6-topbar-icon-pos"
                title="POS"
                aria-label="POS"
                onClick={() => router.push(`/${tenantCode}/pos-terminal`)}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hq6-topbar-icon hq6-topbar-icon-add"
                title="Add Product"
                aria-label="Add Product"
                onClick={() => router.push(`/${tenantCode}/add-product`)}
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hq6-topbar-icon"
                title="Calculator"
                aria-label="Calculator"
                onClick={() => setHq6GlobalModal("calculator")}
              >
                <Calculator className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hq6-topbar-icon"
                title="Today's profit"
                aria-label="Today's profit"
                onClick={() => setHq6GlobalModal("todays-profit")}
              >
                <TrendingUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hq6-topbar-icon"
                title="Add To Do"
                aria-label="Add To Do"
                onClick={() => setHq6GlobalModal("task")}
              >
                <ListTodo className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hq6-topbar-icon"
                title="Clock In"
                aria-label="Clock In"
                onClick={() => setHq6GlobalModal("clock")}
              >
                <Clock className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hq6-topbar-icon"
                title="Modules"
                aria-label="Modules"
                onClick={() => router.push(`/${tenantCode}/overview`)}
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <span className="hq6-topbar-date" aria-label="Today's date">
                {todayLabel}
              </span>
            </div>
          ) : null}
          {!isHq6 ? (
            <IconButton label="Inbox" className="text-white/80 hover:bg-white/10 hover:text-white">
              <Inbox className="h-5 w-5" />
            </IconButton>
          ) : null}
          <div className="relative">
            <IconButton label="Notifications" onClick={toggleNotifications} className="text-white/80 hover:bg-white/10 hover:text-white">
              <Bell className="h-5 w-5" />
            </IconButton>
            {unreadCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full border-2 border-[var(--color-surface-topbar)] bg-white" />
            ) : null}
            <NotificationPanel
              open={notificationsOpen}
              items={feedItems}
              onItemClick={handleNotificationClick}
            />
          </div>
          {isHq6 ? (
            <button
              type="button"
              className="hq6-topbar-user hidden md:inline-flex"
              title={userName}
              onClick={handleLogout}
            >
              <span className="hq6-topbar-user-avatar">{userInitial}</span>
              <span>{userName.split("@")[0]}</span>
            </button>
          ) : null}
          {isAuthenticated && !isHq6 ? (
            <IconButton
              label="Sign out"
              onClick={handleLogout}
              className="text-white/80 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
            </IconButton>
          ) : null}
          {!isHq6 && primaryAction
            ? primaryAction
            : !isHq6 && primaryActionLabel
              ? (
                <Button
                  size="sm"
                  className="ml-2 gap-2 border border-white/20 bg-white/15 text-white hover:bg-white/25"
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
              )
              : null}
        </div>
      </header>
      <CreateRecordModal />
      <AddSaleModal />
      <AddProductModal />
      <AddExpenseModal />
      <ExportDocumentModal />
      {isHq6 ? (
        <Hq6GlobalChromeModals
          active={hq6GlobalModal}
          onClose={() => setHq6GlobalModal(null)}
        />
      ) : null}
    </>
  );
}
