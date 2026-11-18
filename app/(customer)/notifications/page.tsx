"use client";

import { NotificationCenter } from "@/components/layout/NotificationCenter";

export default function CustomerNotificationsPage() {
  return (
    <NotificationCenter
      kicker="Pusat Aktivitas Akun"
      subtitle="Pesanan, status pengiriman kurir, dan pembaruan akun Anda."
      totalDescription="Seluruh riwayat pemberitahuan akun"
      unreadDescription="Pemberitahuan aktif yang belum Anda buka"
      emptyDescription="Notifikasi akan muncul otomatis saat Anda memesan bunga atau status pengiriman diperbarui."
      variant="customer"
      requireSessionGate
      loginRedirectUrl="/auth/login?callbackUrl=/notifications"
    />
  );
}
