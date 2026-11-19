// Utilitas murni untuk menggabungkan milestone database pesanan & riwayat API kurir dalam Bahasa Indonesia

export interface TrackingTimelineEvent {
  id: string;
  isoDate: string;
  timestampMs: number;
  phaseRank: number;
  dateStr: string;
  timeStr: string;
  statusTitle: string;
  description: string;
  isCancelled?: boolean;
}

export interface BuildOrderTrackingTimelineInput {
  order: {
    orderNumber: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
    address?: { recipientName?: string | null; city?: string | null } | null;
    payment?: { paidAt?: string | null } | null;
  };
  shipment?: {
    courier?: string | null;
    trackingNumber?: string | null;
    status?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    createdAt?: string | null;
  } | null;
  remoteHistory?: Array<{
    note: string;
    status: string;
    updated_at: string;
    service_type?: string;
  }>;
}

const TRACKING_STATUS_TITLES: Record<string, string> = {
  confirmed: "Pesanan Kurir Dikonfirmasi",
  allocated: "Kurir Ditugaskan",
  picking_up: "Kurir Menuju Penjemputan",
  picked: "Paket Dijemput Kurir",
  dropping_off: "Kurir Menuju Alamat Tujuan",
  delivered: "Paket Diterima",
  cancelled: "Pengiriman Dibatalkan",
  on_hold: "Pengiriman Tertunda",
  rejected: "Paket Dikembalikan",
  returned: "Paket Dikembalikan",
};

const REMOTE_STATUS_PHASE_RANK: Record<string, number> = {
  confirmed: 30,
  allocated: 35,
  picking_up: 38,
  picked: 45,
  dropping_off: 50,
  delivered: 60,
  cancelled: 70,
};

export function formatTrackingEventTitle(rawStatus: string): string {
  const key = rawStatus.trim().toLowerCase();
  if (TRACKING_STATUS_TITLES[key]) {
    return TRACKING_STATUS_TITLES[key];
  }
  return rawStatus
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function formatCourierNote(
  note: string | null | undefined,
  courierDisplayName: string,
  rawStatus?: string,
): string {
  const trimmed = note?.trim() ?? "";
  const courierLabel = courierDisplayName.trim().toUpperCase();
  const hasCourier =
    courierLabel.length > 0 && courierLabel !== "MENUNGGU PENUGASAN KURIR";

  if (!trimmed) {
    return hasCourier
      ? `Pembaruan status dari kurir ${courierLabel}.`
      : "Pembaruan status pengiriman.";
  }

  const confirmedMatch = trimmed.match(
    /courier order is confirmed\.?\s*(?:([a-z0-9_-]+)\s+has been notified to pick up\.?)?\s*(?:pickup number:\s*([a-z0-9-]+))?/i,
  );
  if (confirmedMatch) {
    const matchedCourier = confirmedMatch[1]?.toUpperCase() || courierLabel;
    const pickupNumber = confirmedMatch[2];
    const targetCourier = matchedCourier || "ekspedisi";
    return pickupNumber
      ? `Kurir ${targetCourier} terkonfirmasi untuk penjemputan · Kode pickup ${pickupNumber}.`
      : `Kurir ${targetCourier} terkonfirmasi untuk penjemputan.`;
  }

  if (/\b(?:has been allocated|courier allocated)\b/i.test(trimmed)) {
    return hasCourier
      ? `Kurir ${courierLabel} telah ditugaskan untuk menjemput paket.`
      : "Kurir telah ditugaskan untuk menjemput paket.";
  }

  if (/\bon\s+(?:the\s+)?way\s+to\s+pick\s*up\b/i.test(trimmed)) {
    return hasCourier
      ? `Kurir ${courierLabel} sedang menuju toko untuk menjemput paket.`
      : "Kurir sedang menuju toko untuk menjemput paket.";
  }

  if (/\b(?:has been picked up|picked up)\b/i.test(trimmed)) {
    return hasCourier
      ? `Paket telah dijemput oleh kurir ${courierLabel}.`
      : "Paket telah dijemput oleh kurir.";
  }

  if (
    /\b(?:on\s+(?:the\s+)?way\s+to\s+(?:destination|recipient)|dropping[\s_-]off)\b/i.test(
      trimmed,
    ) ||
    rawStatus?.trim().toLowerCase() === "dropping_off"
  ) {
    if (/[a-zA-Z]/.test(trimmed) && /\b(kurir|paket|alamat|penerima|tujuan)\b/i.test(trimmed)) {
      return trimmed;
    }
    return hasCourier
      ? `Kurir ${courierLabel} sedang mengantar paket ke alamat tujuan.`
      : "Kurir sedang mengantar paket ke alamat tujuan.";
  }

  if (/\b(?:has been delivered|order delivered)\b/i.test(trimmed)) {
    return "Paket telah diterima di alamat tujuan.";
  }

  if (/\b(?:has been cancelled|order cancelled)\b/i.test(trimmed)) {
    return "Pengiriman dibatalkan.";
  }

  return trimmed;
}

function formatEventTimestamp(rawDate: string | null | undefined, fallbackDate: Date) {
  const parsed = rawDate ? new Date(rawDate) : fallbackDate;
  const safeDate = Number.isNaN(parsed.getTime()) ? fallbackDate : parsed;

  return {
    isoDate: safeDate.toISOString(),
    timestampMs: safeDate.getTime(),
    dateStr: safeDate.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    }),
    timeStr: safeDate.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function buildOrderTrackingTimeline({
  order,
  shipment,
  remoteHistory = [],
}: BuildOrderTrackingTimelineInput): TrackingTimelineEvent[] {
  const createdDate = new Date(order.createdAt);
  const fallbackCreated = Number.isNaN(createdDate.getTime())
    ? new Date()
    : createdDate;
  const orderUpdatedAt = order.updatedAt || order.createdAt;
  const courierRaw = shipment?.courier?.trim() ?? "";
  const courierDisplayName = courierRaw
    ? courierRaw.toUpperCase()
    : "Kurir Ekspedisi";
  const customerCity = order.address?.city?.trim() || "Alamat Tujuan";
  const recipientName = order.address?.recipientName?.trim() || "Penerima";

  const events: TrackingTimelineEvent[] = [];

  // 1. Milestone pembuatan pesanan
  const createdTs = formatEventTimestamp(order.createdAt, fallbackCreated);
  events.push({
    id: "ev-created",
    ...createdTs,
    phaseRank: 10,
    statusTitle: "Pesanan Dibuat",
    description: `Pesanan #${order.orderNumber} dibuat.`,
  });

  // 2. Milestone pembayaran terverifikasi
  if (order.payment?.paidAt) {
    const paidTs = formatEventTimestamp(order.payment.paidAt, fallbackCreated);
    events.push({
      id: "ev-paid",
      ...paidTs,
      phaseRank: 20,
      statusTitle: "Pembayaran Terverifikasi",
      description: "Pembayaran diterima, florist menyiapkan rangkaian.",
    });
  }

  // 3. Seluruh riwayat dari API kurir (tetap digabung tanpa menimpa milestone DB)
  let hasRemoteConfirmedOrAllocated = false;
  let hasRemoteShipped = false;
  let hasRemoteDelivered = false;
  let hasRemoteCancelled = false;

  remoteHistory.forEach((entry, idx) => {
    const normalized = entry.status.trim().toLowerCase();
    if (normalized === "confirmed" || normalized === "allocated") {
      hasRemoteConfirmedOrAllocated = true;
    }
    if (normalized === "picked" || normalized === "dropping_off") {
      hasRemoteShipped = true;
    }
    if (normalized === "delivered") {
      hasRemoteDelivered = true;
    }
    if (normalized === "cancelled") {
      hasRemoteCancelled = true;
    }

    const remoteTs = formatEventTimestamp(
      entry.updated_at || orderUpdatedAt,
      fallbackCreated,
    );

    events.push({
      id: `courier-event-${idx}`,
      ...remoteTs,
      phaseRank: REMOTE_STATUS_PHASE_RANK[normalized] ?? 40,
      statusTitle: formatTrackingEventTitle(entry.status),
      description: formatCourierNote(entry.note, courierRaw, entry.status),
      isCancelled: normalized === "cancelled",
    });
  });

  // 4. Milestone pengiriman dari database bila belum tercakup riwayat kurir
  const isCancelled =
    order.status === "CANCELLED" ||
    order.status === "REFUNDED" ||
    shipment?.status === "CANCELLED";
  const isDelivered =
    order.status === "DELIVERED" || shipment?.status === "DELIVERED";
  const isShipped =
    order.status === "SHIPPED" || shipment?.status === "SHIPPED";
  const isShippedOrDelivered = isShipped || isDelivered;

  if (
    shipment?.trackingNumber &&
    !hasRemoteConfirmedOrAllocated &&
    !isShippedOrDelivered
  ) {
    const awbTs = formatEventTimestamp(
      shipment.createdAt || orderUpdatedAt,
      fallbackCreated,
    );
    events.push({
      id: "ev-awb-created",
      ...awbTs,
      phaseRank: 30,
      statusTitle: "Resi Diterbitkan",
      description: `No. resi ${shipment.trackingNumber} (${courierDisplayName}).`,
    });
  }

  if (isShippedOrDelivered && !hasRemoteShipped) {
    const shippedTs = formatEventTimestamp(
      shipment?.shippedAt || orderUpdatedAt,
      fallbackCreated,
    );
    events.push({
      id: "ev-shipped",
      ...shippedTs,
      phaseRank: 45,
      statusTitle: "Diserahkan ke Kurir",
      description: `Paket dikirim melalui ${courierDisplayName}${
        shipment?.trackingNumber ? ` · resi ${shipment.trackingNumber}` : ""
      }.`,
    });
  }

  if (isDelivered && !hasRemoteDelivered) {
    const deliveredTs = formatEventTimestamp(
      shipment?.deliveredAt || orderUpdatedAt,
      fallbackCreated,
    );
    events.push({
      id: "ev-delivered",
      ...deliveredTs,
      phaseRank: 60,
      statusTitle: "Paket Diterima",
      description: `Diterima oleh ${recipientName} di ${customerCity}.`,
    });
  }

  if (isCancelled && !hasRemoteCancelled) {
    const cancelledTs = formatEventTimestamp(orderUpdatedAt, fallbackCreated);
    events.push({
      id: "ev-cancelled",
      ...cancelledTs,
      phaseRank: 70,
      statusTitle: "Pesanan Dibatalkan",
      description: "Pesanan dibatalkan.",
      isCancelled: true,
    });
  }

  return events.toSorted(
    (a, b) => b.timestampMs - a.timestampMs || b.phaseRank - a.phaseRank,
  );
}
