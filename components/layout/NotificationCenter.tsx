"use client";

import React, { useEffect, useState } from "react";
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
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  Pagination,
} from "@/components/ui";
import { useNotifications } from "@/hooks";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/formatters";

interface NotificationCenterProps {
  kicker?: string;
  subtitle?: string;
  totalDescription?: string;
  unreadDescription?: string;
  emptyDescription?: string;
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
      return <ShoppingCart className="h-5 w-5 text-primary" aria-hidden="true" />;
    case "SHIPMENT_UPDATE":
      return portalRole === "FLORIST" ? (
        <Package className="h-5 w-5 text-info" aria-hidden="true" />
      ) : (
        <Truck className="h-5 w-5 text-info" aria-hidden="true" />
      );
    case "LOW_STOCK_ALERT":
      return <TrendingUp className="h-5 w-5 text-error" aria-hidden="true" />;
    case "HARVEST_ANNOUNCEMENT":
      return portalRole === "SUPPLIER" ? (
        <Sprout className="h-5 w-5 text-primary" aria-hidden="true" />
      ) : (
        <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
      );
    case "PREORDER_CONFIRMED":
      return <Calendar className="h-5 w-5 text-warning" aria-hidden="true" />;
    default:
      return portalRole ? (
        <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      ) : (
        <Package className="h-5 w-5 text-primary" aria-hidden="true" />
      );
  }
}

export function NotificationCenter({
  kicker = "Notifikasi",
  subtitle,
  emptyDescription = "Belum ada pemberitahuan.",
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

  const NOTIFICATIONS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalNotificationsPages = Math.max(
    1,
    Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalNotificationsPages);
  const startIndex = (safePage - 1) * NOTIFICATIONS_PER_PAGE;
  const paginatedNotifications = notifications.slice(
    startIndex,
    startIndex + NOTIFICATIONS_PER_PAGE,
  );

  useEffect(() => {
    if (requireSessionGate && status === "unauthenticated") {
      router.push(loginRedirectUrl);
    }
  }, [requireSessionGate, status, router, loginRedirectUrl]);

  const handleConfirmDeleteNotification = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteNotification(pendingDeleteId);
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };

  if ((requireSessionGate && status === "loading") || isLoading) {
    if (variant === "customer") {
      return (
        <main className="min-h-dvh bg-background">
          <div className="container-custom section-spacing">
            <LoadingSpinner message={loadingMessage} />
          </div>
        </main>
      );
    }
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
      <main className="min-h-dvh bg-background">
        <div className="container-custom section-spacing">{errorNode}</div>
      </main>
    ) : (
      errorNode
    );
  }

  const isCustomer = variant === "customer";

  const notificationListBlock = (
    <>
      <div
        role="group"
        aria-label="Filter notifikasi"
        className="flex flex-wrap gap-2"
      >
        <button
          type="button"
          aria-pressed={filter === "ALL"}
          onClick={() => {
            setFilter("ALL");
            setCurrentPage(1);
          }}
          className={`min-h-10 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors sm:text-sm ${
            filter === "ALL"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          Semua ({notifications.length})
        </button>
        <button
          type="button"
          aria-pressed={filter === "UNREAD"}
          onClick={() => {
            setFilter("UNREAD");
            setCurrentPage(1);
          }}
          className={`min-h-10 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors sm:text-sm ${
            filter === "UNREAD"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          Belum Dibaca ({unreadCount})
        </button>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
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

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" aria-hidden="true" />}
          title={
            filter === "UNREAD"
              ? "Semua notifikasi sudah dibaca"
              : "Belum ada notifikasi"
          }
          description={filter === "UNREAD" ? "" : emptyDescription}
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {paginatedNotifications.map((notification) => {
              const isUnread = !notification.isRead;
              return (
                <article
                  key={notification.id}
                  className={`rounded-2xl border p-5 transition-colors ${
                    isUnread
                      ? "border-border border-l-4 border-l-primary bg-primary/[0.03]"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={`rounded-xl p-2.5 ${
                          isUnread
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-container-low text-muted-foreground"
                        }`}
                      >
                        {getNotificationIcon(notification.type, portalRole)}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h2
                              className={`text-sm ${
                                isUnread
                                  ? "font-bold text-foreground"
                                  : "font-semibold text-muted-foreground"
                              }`}
                            >
                              {notification.title}
                            </h2>
                            {isUnread && (
                              <span
                                className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary"
                                aria-hidden="true"
                              />
                            )}
                          </div>

                          <p
                            className={`mt-1 text-sm leading-relaxed ${
                              isUnread
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {notification.message}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs tabular-nums text-muted-foreground">
                            <time dateTime={notification.createdAt}>
                              {notification.createdAt
                                ? formatRelativeTime(notification.createdAt)
                                : "Waktu tidak tersedia"}
                            </time>
                            {notification.createdAt && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {formatDateTime(notification.createdAt)}
                                </span>
                              </>
                            )}
                          </div>

                          {notification.link && (
                            <div className="mt-3">
                              <Link
                                href={notification.link}
                                onClick={() => {
                                  if (isUnread) {
                                    void markAsRead(notification.id);
                                  }
                                }}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low"
                              >
                                <span>
                                  Lihat Detail
                                  <span className="sr-only">
                                    : {notification.title}
                                  </span>
                                </span>
                                <ArrowRight
                                  className="h-3 w-3 text-muted-foreground"
                                  aria-hidden="true"
                                />
                              </Link>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {isUnread && (
                            <button
                              type="button"
                              onClick={() => void markAsRead(notification.id)}
                              aria-label={`Tandai dibaca: ${notification.title}`}
                              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary/10"
                            >
                              <Check className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(notification.id)}
                            aria-label={`Hapus notifikasi: ${notification.title}`}
                            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-error transition-colors hover:bg-error/10"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {notifications.length > NOTIFICATIONS_PER_PAGE && (
            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-3.5 sm:flex-row">
              <p className="text-xs tabular-nums text-muted-foreground">
                Menampilkan {startIndex + 1}–
                {Math.min(startIndex + NOTIFICATIONS_PER_PAGE, notifications.length)}{" "}
                dari {notifications.length} notifikasi
              </p>
              <Pagination
                currentPage={safePage}
                totalPages={totalNotificationsPages}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                ariaLabel="Navigasi halaman notifikasi"
              />
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteId)}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDeleteNotification}
        title="Hapus Notifikasi?"
        description="Notifikasi yang dihapus tidak dapat dipulihkan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        loading={isDeleting}
      />
    </>
  );

  if (isCustomer) {
    return (
      <main className="min-h-dvh bg-background pb-16 sm:pb-24">
        {/* Full-Bleed Dark Editorial Masthead */}
        <section className="border-b border-white/10 bg-surface-dark py-10 text-white sm:py-14">
          <div className="container-custom">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                  Notifikasi
                </h1>
                <p className="mt-2 text-base tabular-nums text-white/70">
                  {unreadCount > 0
                    ? `${unreadCount} belum dibaca · ${notifications.length} total`
                    : `${notifications.length} notifikasi`}
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="btn-primary inline-flex h-11 items-center gap-2 px-5 py-0 text-sm"
                >
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  <span>Tandai Semua Dibaca</span>
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="container-custom space-y-6 pt-8 sm:pt-10">
          {notificationListBlock}
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Editorial Dark Header Portal */}
      <section className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            {kicker}
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
              Notifikasi
            </h1>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-0.5 text-xs font-semibold tabular-nums text-white/80">
              {unreadCount > 0
                ? `${unreadCount} belum dibaca · ${notifications.length} total`
                : `${notifications.length} notifikasi`}
            </span>
          </div>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
              {subtitle}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 py-0 text-xs font-semibold"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            <span>Tandai Semua Dibaca</span>
          </button>
        )}
      </section>

      {notificationListBlock}
    </div>
  );
}
