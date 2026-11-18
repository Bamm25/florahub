"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  Package,
  ShoppingCart,
  Sprout,
  Trash2,
  TrendingUp,
  Truck,
} from "lucide-react";
import { EmptyState, ErrorState, LoadingSpinner } from "@/components/ui";
import { useNotifications } from "@/hooks";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/formatters";

interface NotificationCenterProps {
  kicker: string;
  subtitle: string;
  totalDescription: string;
  unreadDescription: string;
  emptyDescription: string;
  loadingMessage?: string;
  variant?: "customer" | "portal";
  portalRole?: "FLORIST" | "SUPPLIER";
  requireSessionGate?: boolean;
  loginRedirectUrl?: string;
}

function getNotificationIcon(
  type: string,
  portalRole?: "FLORIST" | "SUPPLIER",
) {
  switch (type) {
    case "ORDER_CREATED":
    case "PAYMENT_SUCCESS":
      return <ShoppingCart className="h-5 w-5 text-primary" />;
    case "SHIPMENT_UPDATE":
      return portalRole === "FLORIST" ? (
        <Package className="h-5 w-5 text-sky-500" />
      ) : (
        <Truck className="h-5 w-5 text-sky-500" />
      );
    case "LOW_STOCK_ALERT":
      return <TrendingUp className="h-5 w-5 text-rose-500" />;
    case "HARVEST_ANNOUNCEMENT":
      return portalRole === "SUPPLIER" ? (
        <Sprout className="h-5 w-5 text-primary" />
      ) : (
        <Calendar className="h-5 w-5 text-primary" />
      );
    case "PREORDER_CONFIRMED":
      return <Calendar className="h-5 w-5 text-amber-500" />;
    default:
      return portalRole ? (
        <Bell className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Package className="h-5 w-5 text-primary" />
      );
  }
}

export function NotificationCenter({
  kicker,
  subtitle,
  totalDescription,
  unreadDescription,
  emptyDescription,
  loadingMessage = "Memuat notifikasi...",
  variant = "portal",
  portalRole,
  requireSessionGate = false,
  loginRedirectUrl = "/auth/login?callbackUrl=/notifications",
}: NotificationCenterProps) {
  const router = useRouter();
  const { status } = useSession();
  const {
    notifications,
    unreadCount,
    filter,
    setFilter,
    isLoading,
    error,
    actionError,
    clearActionError,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(
    requireSessionGate ? { enabled: status === "authenticated" } : undefined,
  );

  useEffect(() => {
    if (requireSessionGate && status === "unauthenticated") {
      router.push(loginRedirectUrl);
    }
  }, [requireSessionGate, status, router, loginRedirectUrl]);

  const handleDeleteNotification = async (notificationId: string) => {
    if (!window.confirm("Hapus notifikasi ini?")) return;
    await deleteNotification(notificationId);
  };

  if ((requireSessionGate && status === "loading") || isLoading) {
    return <LoadingSpinner message={loadingMessage} />;
  }

  if (error) {
    const errorNode = (
      <ErrorState
        title="Gagal Memuat Notifikasi"
        error={error}
        onRetry={refetch}
      />
    );
    return variant === "customer" ? (
      <main className="container-custom section-spacing">{errorNode}</main>
    ) : (
      errorNode
    );
  }

  const wrapperClass =
    variant === "customer"
      ? "container-custom section-spacing space-y-6 sm:space-y-8"
      : "mx-auto max-w-7xl space-y-6 sm:space-y-8";

  const WrapperTag = variant === "customer" ? "main" : "div";

  return (
    <WrapperTag className={wrapperClass}>
      {/* Header Banner */}
      <div className="flex flex-col gap-6 rounded-[24px] bg-surface-dark px-6 py-8 text-white shadow-xs sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            {kicker}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Notifikasi
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
            {subtitle}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Tandai Semua Dibaca</span>
          </button>
        )}
      </div>

      {/* Ringkasan Statistik Notifikasi */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-2xs">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Notifikasi
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-foreground">
            {notifications.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalDescription}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-2xs">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Belum Dibaca
          </p>
          <p
            className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${
              unreadCount > 0 ? "text-amber-600" : "text-foreground"
            }`}
          >
            {unreadCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {unreadDescription}
          </p>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              filter === "ALL"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-container-low text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setFilter("UNREAD")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              filter === "UNREAD"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-container-low text-muted-foreground hover:text-foreground"
            }`}
          >
            Belum Dibaca {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={clearActionError}
            className="text-xs font-semibold underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Daftar Notifikasi */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title={
            filter === "UNREAD"
              ? "Tidak ada notifikasi yang belum dibaca"
              : "Belum ada notifikasi"
          }
          description={
            filter === "UNREAD"
              ? "Semua notifikasi telah selesai Anda tinjau."
              : emptyDescription
          }
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border p-5 transition-all ${
                !notification.isRead
                  ? "border-primary/40 bg-primary/[0.03] shadow-xs"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex-shrink-0">
                  <div
                    className={`rounded-xl p-2.5 ${
                      !notification.isRead
                        ? "bg-primary/10 text-primary"
                        : "bg-surface-container-low text-muted-foreground"
                    }`}
                  >
                    {getNotificationIcon(notification.type, portalRole)}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-sm font-semibold ${
                            !notification.isRead
                              ? "font-bold text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p
                        className={`mt-1 text-sm leading-relaxed ${
                          !notification.isRead
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">
                          {notification.createdAt
                            ? formatRelativeTime(notification.createdAt)
                            : "Waktu tidak tersedia"}
                        </span>
                        {notification.createdAt && (
                          <span>• {formatDateTime(notification.createdAt)}</span>
                        )}
                      </div>

                      {notification.link && (
                        <div className="mt-3">
                          <Link
                            href={notification.link}
                            onClick={() => {
                              if (!notification.isRead) {
                                void markAsRead(notification.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-surface-container"
                          >
                            <span>Buka Halaman Terkait</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={() => void markAsRead(notification.id)}
                          className="rounded-xl p-2 text-primary transition-colors hover:bg-primary/10"
                          title="Tandai sudah dibaca"
                          aria-label="Tandai sudah dibaca"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteNotification(notification.id)
                        }
                        className="rounded-xl p-2 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                        title="Hapus notifikasi"
                        aria-label="Hapus notifikasi"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </WrapperTag>
  );
}
