"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Bell, Check, CheckCheck, Trash2, Package, ShoppingCart, Calendar, TrendingUp } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import { formatRelativeTime } from "@/lib/utils/formatters";

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export default function FloristNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const url =
        filter === "UNREAD"
          ? "/api/notifications?unreadOnly=true"
          : "/api/notifications";
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memuat notifications");
      setNotifications(json.data?.notifications ?? []);
      setUnreadCount(json.data?.unreadCount ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNotifications();
  }, [fetchNotifications]);

  // Tandai notifikasi spesifik sebagai sudah dibaca
  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menandai notifikasi");
      await fetchNotifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error("Gagal menandai notifikasi:", message);
      alert("Gagal menandai notifikasi: " + message);
    }
  };

  // Tandai seluruh notifikasi aktif sebagai sudah dibaca
  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menandai semua notifikasi");
      await fetchNotifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error("Gagal menandai semua notifikasi:", message);
      alert("Gagal menandai semua notifikasi: " + message);
    }
  };

  // Hapus notifikasi setelah konfirmasi pengguna
  const deleteNotification = async (notificationId: string) => {
    if (!confirm("Hapus notifikasi ini?")) return;

    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menghapus notifikasi");
      await fetchNotifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error("Gagal menghapus notifikasi:", message);
      alert("Gagal menghapus notifikasi: " + message);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      ORDER_CREATED: <ShoppingCart className="w-5 h-5 text-primary" />,
      PAYMENT_SUCCESS: <ShoppingCart className="w-5 h-5 text-success" />,
      SHIPMENT_UPDATE: <Package className="w-5 h-5 text-info" />,
      LOW_STOCK_ALERT: <TrendingUp className="w-5 h-5 text-warning" />,
      HARVEST_ANNOUNCEMENT: <Calendar className="w-5 h-5 text-success" />,
      PREORDER_CONFIRMED: <Calendar className="w-5 h-5 text-warning" />,
      REVIEW_REMINDER: <Bell className="w-5 h-5 text-muted-foreground" />,
      COUPON_AVAILABLE: <Bell className="w-5 h-5 text-primary" />,
    };
    return icons[type] || <Bell className="w-5 h-5 text-muted-foreground" />;
  };

  if (isLoading) {
    return <LoadingSpinner message="Memuat notifikasi..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Gagal Memuat Notifikasi"
        error={error}
        onRetry={fetchNotifications}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Restrained Dark Header for Rhythm */}
      <div className="flex flex-col gap-6 rounded-[24px] bg-[#10121b] px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b4aeff]">
            Pusat Aktivitas
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Notifikasi Operasional
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Pantau update pesanan customer, pengiriman ekspedisi, jadwal panen mitra, dan peringatan stok bahan baku.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <CheckCheck className="w-4 h-4" />
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      {/* Ringkasan Notifikasi */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Notifikasi</p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-foreground">
            {notifications.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Seluruh riwayat pemberitahuan</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
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

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-base font-semibold text-foreground">
            {filter === "UNREAD" ? "Tidak ada notifikasi yang belum dibaca" : "Belum ada notifikasi"}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {filter === "UNREAD"
              ? "Semua notifikasi operasional telah selesai Anda tinjau."
              : "Notifikasi akan muncul otomatis saat ada aktivitas pesanan atau jadwal baru."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border transition-all p-5 ${
                !notification.isRead
                  ? "border-primary/40 bg-primary/[0.02] shadow-xs"
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
                            !notification.isRead ? "text-foreground" : "text-muted-foreground"
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
                          !notification.isRead ? "text-foreground/90" : "text-muted-foreground"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 font-mono">
                        {notification.createdAt ? formatRelativeTime(notification.createdAt) : "Tanggal tidak valid"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
                          title="Tandai sudah dibaca"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
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
