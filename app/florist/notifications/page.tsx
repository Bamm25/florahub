"use client";

import React from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Package,
  ShoppingCart,
  Calendar,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/ui";
import { useNotifications } from "@/hooks";
import { formatRelativeTime, formatDateTime } from "@/lib/utils/formatters";

export default function FloristNotificationsPage() {
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
  } = useNotifications();

  const handleDeleteNotification = async (notificationId: string) => {
    if (!window.confirm("Hapus notifikasi ini?")) return;
    await deleteNotification(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ORDER_CREATED":
        return <ShoppingCart className="w-5 h-5 text-primary" />;
      case "PAYMENT_SUCCESS":
        return <ShoppingCart className="w-5 h-5 text-primary" />;
      case "SHIPMENT_UPDATE":
        return <Package className="w-5 h-5 text-sky-500" />;
      case "LOW_STOCK_ALERT":
        return <TrendingUp className="w-5 h-5 text-rose-500" />;
      case "HARVEST_ANNOUNCEMENT":
        return <Calendar className="w-5 h-5 text-primary" />;
      case "PREORDER_CONFIRMED":
        return <Calendar className="w-5 h-5 text-amber-500" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Memuat notifikasi..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Gagal Memuat Notifikasi"
        error={error}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Header Banner Area Florist */}
      <div className="flex flex-col gap-6 rounded-[24px] bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between shadow-xs">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Pusat Aktivitas Toko
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Notifikasi
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
            Pesanan customer, pengiriman ekspedisi, jadwal panen mitra, dan stok bahan baku.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 shadow-xs"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Tandai Semua Dibaca</span>
          </button>
        )}
      </div>

      {/* Ringkasan Statistik Notifikasi */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-2xs">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Notifikasi</p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-foreground">
            {notifications.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Seluruh riwayat pemberitahuan toko</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-2xs">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Belum Dibaca</p>
          <p className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${unreadCount > 0 ? "text-amber-600" : "text-foreground"}`}>
            {unreadCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Pemberitahuan aktif yang perlu ditinjau</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
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
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
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

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title={filter === "UNREAD" ? "Tidak ada notifikasi yang belum dibaca" : "Belum ada notifikasi"}
          description={
            filter === "UNREAD"
              ? "Semua notifikasi operasional toko telah selesai Anda tinjau."
              : "Notifikasi akan muncul otomatis saat ada aktivitas pesanan, pembayaran, atau pengiriman."
          }
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border transition-all p-5 ${
                !notification.isRead
                  ? "border-primary/40 bg-primary/[0.03] shadow-xs"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <div
                    className={`p-2.5 rounded-xl ${
                      !notification.isRead ? "bg-primary/10 text-primary" : "bg-surface-container-low text-muted-foreground"
                    }`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-sm font-semibold ${
                            !notification.isRead ? "text-foreground font-bold" : "text-muted-foreground"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p
                        className={`text-sm mt-1 leading-relaxed ${
                          !notification.isRead ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="font-mono">
                          {notification.createdAt
                            ? formatRelativeTime(notification.createdAt)
                            : "Waktu tidak tersedia"}
                        </span>
                        {notification.createdAt && (
                          <span>
                            • {formatDateTime(notification.createdAt)}
                          </span>
                        )}
                      </div>

                      {/* Tombol Tautan Aksi Cepat jika notifikasi memiliki link rujukan */}
                      {notification.link && (
                        <div className="mt-3">
                          <Link
                            href={notification.link}
                            onClick={() => {
                              if (!notification.isRead) {
                                void markAsRead(notification.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-container transition-colors shadow-2xs"
                          >
                            <span>Buka Halaman Terkait</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={() => void markAsRead(notification.id)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
                          title="Tandai sudah dibaca"
                          aria-label="Tandai sudah dibaca"
                        >
                          <Check className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDeleteNotification(notification.id)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Hapus notifikasi"
                        aria-label="Hapus notifikasi"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
