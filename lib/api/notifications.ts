import { fetchJson } from "./client";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsData {
  notifications: NotificationItem[];
  unreadCount: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function getNotifications(
  params?: { unreadOnly?: boolean; limit?: number; page?: number },
  signal?: AbortSignal,
): Promise<NotificationsData> {
  const searchParams = new URLSearchParams();
  if (params?.unreadOnly) searchParams.set("unreadOnly", "true");
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.page !== undefined) searchParams.set("page", String(params.page));

  const query = searchParams.toString();
  const url = query ? `/api/notifications?${query}` : "/api/notifications";
  const result = await fetchJson<{ success: boolean; data: NotificationsData }>(
    url,
    { method: "GET", cache: "no-store", signal },
  );
  if (!result.success) {
    throw new Error("Gagal memuat notifikasi");
  }
  return result.data;
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<void> {
  const result = await fetchJson<{ success: boolean; message?: string }>(
    `/api/notifications/${encodeURIComponent(notificationId)}`,
    { method: "PATCH" },
  );
  if (!result.success) {
    throw new Error(result.message || "Gagal memperbarui notifikasi");
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const result = await fetchJson<{ success: boolean; message?: string }>(
    "/api/notifications",
    { method: "PATCH" },
  );
  if (!result.success) {
    throw new Error(result.message || "Gagal menandai semua notifikasi");
  }
}

export async function deleteNotificationItem(
  notificationId: string,
): Promise<void> {
  const result = await fetchJson<{ success: boolean; message?: string }>(
    `/api/notifications/${encodeURIComponent(notificationId)}`,
    { method: "DELETE" },
  );
  if (!result.success) {
    throw new Error(result.message || "Gagal menghapus notifikasi");
  }
}
