"use client";

import { useCallback, useEffect, useState } from "react";
import { getNotifications } from "@/lib/api/notifications";

export function useUnreadNotificationCount(
  status: string,
  pathname: string,
  intervalMs = 30_000,
): number {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await getNotifications({ unreadOnly: true, limit: 1 }, signal);
      if (!signal?.aborted) {
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // Abaikan error polling latar belakang
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    const controller = new AbortController();
    const initial = window.setTimeout(
      () => void fetchUnreadCount(controller.signal),
      0,
    );
    const interval = window.setInterval(
      () => void fetchUnreadCount(controller.signal),
      intervalMs,
    );
    const handleNotificationsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail;
      if (typeof detail?.unreadCount === "number") {
        setUnreadCount(detail.unreadCount);
      } else {
        void fetchUnreadCount(controller.signal);
      }
    };
    window.addEventListener(
      "florahub:notifications-updated",
      handleNotificationsUpdated,
    );
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener(
        "florahub:notifications-updated",
        handleNotificationsUpdated,
      );
      controller.abort();
    };
  }, [status, fetchUnreadCount, pathname, intervalMs]);

  return unreadCount;
}
