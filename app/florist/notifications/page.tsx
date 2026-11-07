"use client";

import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Trash2, Package, ShoppingCart, Calendar, TrendingUp } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
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

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
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
  };

  const markAsRead = async (notificationId: string) => {
    // TODO: Implement optimistic update: setNotifications(prev => prev.map(...))
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menandai notifikasi");
      await fetchNotifications();
    } catch (err) {
      // TODO: Replace alert() dengan toast notification library
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error("Gagal menandai notifikasi:", message);
      alert("Gagal menandai notifikasi: " + message);
    }
  };

  const markAllAsRead = async () => {
    // TODO: Implement optimistic update: setNotifications(prev => prev.map(...))
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menandai semua notifikasi");
      await fetchNotifications();
    } catch (err) {
      // TODO: Replace alert() dengan toast notification library
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error("Gagal menandai semua notifikasi:", message);
      alert("Gagal menandai semua notifikasi: " + message);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    // TODO: Replace native confirm() dengan styled modal component
    if (!confirm("Hapus notifikasi ini?")) return;

    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menghapus notifikasi");
      await fetchNotifications();
    } catch (err) {
      // TODO: Replace alert() dengan toast notification library
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error("Gagal menghapus notifikasi:", message);
      alert("Gagal menghapus notifikasi: " + message);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      ORDER: <ShoppingCart className="w-5 h-5 text-primary" />,
      SHIPMENT: <Package className="w-5 h-5 text-info" />,
      PRE_ORDER: <Calendar className="w-5 h-5 text-warning" />,
      INVENTORY: <TrendingUp className="w-5 h-5 text-success" />,
      SYSTEM: <Bell className="w-5 h-5 text-muted-foreground" />,
    };
    return icons[type] || icons.SYSTEM;
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
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Notifikasi</h1>
        <p className="text-muted-foreground">
          Update terbaru dari order, pengiriman, dan pre-order Anda
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          label="Total Notifikasi"
          value={notifications.length}
        />
        <StatCard
          label="Belum Dibaca"
          value={unreadCount}
          color="warning"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === "ALL"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-container-low text-muted-foreground hover:bg-surface-container"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter("UNREAD")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === "UNREAD"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-container-low text-muted-foreground hover:bg-surface-container"
            }`}
          >
            Belum Dibaca {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-16 h-16" />}
          title={filter === "UNREAD" ? "Tidak ada notifikasi yang belum dibaca" : "Belum ada notifikasi"}
          description={
            filter === "UNREAD"
              ? "Semua notifikasi sudah dibaca"
              : "Notifikasi akan muncul ketika ada aktivitas baru"
          }
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`card-elevated p-4 transition-all ${
                !notification.isRead
                  ? "border-l-4 border-l-primary bg-primary/[0.02]"
                  : "border-l-4 border-l-transparent"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div
                    className={`p-2 rounded-xl ${
                      !notification.isRead ? "bg-primary/10" : "bg-surface-container-low"
                    }`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3
                        className={`text-sm font-semibold ${
                          !notification.isRead ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <p
                        className={`text-sm mt-1 ${
                          !notification.isRead ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {notification.createdAt ? formatRelativeTime(notification.createdAt) : 'Tanggal tidak valid'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
                          title="Tandai sudah dibaca"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-error bg-error/5 rounded-lg hover:bg-error/10 transition-colors"
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
