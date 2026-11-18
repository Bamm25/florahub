"use client";

import { NotificationCenter } from "@/components/layout/NotificationCenter";

export default function SupplierNotificationsPage() {
  return (
    <NotificationCenter
      kicker="Pusat Aktivitas Kebun"
      subtitle="Pesanan, pembayaran, dan pengiriman terbaru."
      totalDescription="Seluruh riwayat pemberitahuan kebun"
      unreadDescription="Aktivitas yang memerlukan perhatian Anda"
      emptyDescription="Notifikasi muncul saat ada pesanan stok baru atau pelunasan pre-order dari toko florist."
      loadingMessage="Memuat notifikasi supplier..."
      portalRole="SUPPLIER"
    />
  );
}
