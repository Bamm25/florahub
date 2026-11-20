"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationItem,
  type NotificationItem,
} from "@/lib/api/notifications";

export type NotificationFilter = "ALL" | "UNREAD";

interface UseNotificationsOptions {
  enabled?: boolean;
  limit?: number;
}

interface UseNotificationsReturn {
  notifications: NotificationItem[];
  unreadCount: number;
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  isLoading: boolean;
  error: string | null;
  actionError: string | null;
  clearActionError: () => void;
  refetch: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

/**
 * Custom hook terpusat untuk mengambil, memfilter, menandai dibaca, dan menghapus notifikasi.
 */
export function useNotifications(
  options: UseNotificationsOptions = {},
): UseNotificationsReturn {
  const { enabled = true, limit = 100 } = options;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadNotifications = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getNotifications(
          { unreadOnly: filter === "UNREAD", limit },
          signal,
        );
        if (!signal?.aborted) {
          const nextUnread = res.unreadCount ?? 0;
          setNotifications(res.notifications ?? []);
          setUnreadCount(nextUnread);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("florahub:notifications-updated", {
                detail: { unreadCount: nextUnread },
              }),
            );
          }
        }
      } catch (err) {
        if (
          signal?.aborted ||
          (err instanceof Error && err.name === "AbortError")
        ) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Gagal memuat notifikasi",
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [filter, limit],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadNotifications(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, loadNotifications]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        setActionError(null);
        await markNotificationAsRead(notificationId);
        await loadNotifications();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Gagal menandai notifikasi",
        );
      }
    },
    [loadNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      setActionError(null);
      await markAllNotificationsAsRead();
      await loadNotifications();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Gagal menandai semua notifikasi",
      );
    }
  }, [loadNotifications]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        setActionError(null);
        await deleteNotificationItem(notificationId);
        await loadNotifications();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Gagal menghapus notifikasi",
        );
      }
    },
    [loadNotifications],
  );

  const refetch = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  return {
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
  };
}
