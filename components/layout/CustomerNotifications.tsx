"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Package, Truck } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

// Normalisasi link lama agar selalu menuju halaman customer yang tersedia.
function notificationHref(link: string | null) {
  if (!link) return "/orders";
  const normalized = link.replace(/^\/customer(?=\/orders(?:\/|$))/, "");
  return /^\/orders(?:\/|$)/.test(normalized) ? normalized : "/orders";
}

export default function CustomerNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Fetch ulang saat dropdown dibuka, tab kembali aktif, dan setiap menit.
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=20", { cache: "no-store" });
      if (!response.ok) throw new Error("Gagal mengambil notifikasi");
      const json = await response.json();
      if (!json.success) throw new Error("Gagal mengambil notifikasi");
      setNotifications(json.data.notifications);
      setUnreadCount(json.data.unreadCount);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  // Update server lebih dulu agar badge tidak mengklaim notifikasi sudah dibaca saat gagal.
  async function markRead(notification: Notification) {
    if (notification.isRead) return true;
    try {
      const response = await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" });
      if (!response.ok || !(await response.json()).success) throw new Error("Gagal menandai notifikasi");
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
      return true;
    } catch {
      setError(true);
      return false;
    }
  }

  async function markAllRead() {
    try {
      const response = await fetch("/api/notifications", { method: "PATCH" });
      if (!response.ok || !(await response.json()).success) throw new Error("Gagal menandai semua");
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      setError(false);
    } catch {
      setError(true);
    }
  }

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        aria-label={`Notifikasi${unreadCount ? `, ${unreadCount} belum dibaca` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => { setOpen((value) => !value); if (!open) void refresh(); }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container hover:text-primary"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifikasi" className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-semibold">Notifikasi</h2>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <CheckCheck className="h-4 w-4" /> Tandai semua dibaca
              </button>
            )}
          </div>
          {error && <p role="alert" className="px-4 py-2 text-xs text-error">Gagal memperbarui notifikasi. <button type="button" onClick={() => void refresh()} className="underline">Coba lagi</button></p>}
          <div className="max-h-96 overflow-y-auto">
            {loading ? <p className="p-5 text-center text-sm text-muted-foreground">Memuat notifikasi...</p> : notifications.length === 0 ? (
              <p className="p-5 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>
            ) : notifications.map((notification) => {
              const Icon = notification.type === "SHIPMENT_UPDATE" ? Truck : Package;
              return (
                <Link
                  key={notification.id}
                  href={notificationHref(notification.link)}
                  onClick={(event) => {
                    if (!notification.isRead) {
                      event.preventDefault();
                      void markRead(notification).then((success) => {
                        if (success) { setOpen(false); window.location.assign(notificationHref(notification.link)); }
                      });
                    } else setOpen(false);
                  }}
                  className={`flex gap-3 border-b border-border/60 px-4 py-3 transition-colors hover:bg-surface-container ${notification.isRead ? "" : "bg-primary/5"}`}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{notification.title}</span>
                    <span className="block text-xs text-muted-foreground">{notification.message}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString("id-ID")}</span>
                  </span>
                  {!notification.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Belum dibaca" />}
                </Link>
              );
            })}
          </div>
          <Link href="/orders" onClick={() => setOpen(false)} className="block border-t border-border px-4 py-3 text-center text-sm font-medium text-primary hover:bg-surface-container">Lihat pesanan saya</Link>
        </div>
      )}
    </div>
  );
}
