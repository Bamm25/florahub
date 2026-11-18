"use client";

import { NotificationCenter } from "@/components/layout/NotificationCenter";

export default function FloristNotificationsPage() {
  return (
    <NotificationCenter
      kicker="Pusat Aktivitas Toko"
      subtitle="Pesanan customer, pengiriman ekspedisi, jadwal panen mitra, dan stok bahan baku."
      totalDescription="Seluruh riwayat pemberitahuan toko"
      unreadDescription="Pemberitahuan aktif yang perlu ditinjau"
      emptyDescription="Notifikasi muncul saat ada pesanan masuk, jadwal panen supplier baru, atau stok menipis."
      portalRole="FLORIST"
    />
  );
}
