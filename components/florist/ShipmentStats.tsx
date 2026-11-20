// Interface data status pengiriman untuk ringkasan statistik
interface Shipment {
  status: string;
}

// Props interface untuk komponen ringkasan statistik pengiriman
interface ShipmentStatsProps {
  shipments: Shipment[];
  paidOrdersCount: number;
}

// Komponen panel metrik ringkasan status pengiriman logistik florist
export default function ShipmentStats({
  shipments,
  paidOrdersCount,
}: ShipmentStatsProps) {
  const totalShipments = Array.isArray(shipments) ? shipments.length : 0;
  const processingCount = Array.isArray(shipments)
    ? shipments.filter((s) => s.status === "PROCESSING" || s.status === "PENDING").length
    : 0;
  const shippedCount = Array.isArray(shipments)
    ? shipments.filter((s) => s.status === "SHIPPED").length
    : 0;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Total Resi Pengiriman
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-foreground">
          {totalShipments.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Seluruh riwayat pengiriman
        </p>
      </div>

      <div
        className={`rounded-2xl border p-5 ${
          paidOrdersCount > 0
            ? "border-warning/35 bg-warning/[0.04]"
            : "border-border bg-surface"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Perlu Dibuat Resi
        </p>
        <p
          className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${
            paidOrdersCount > 0 ? "text-warning" : "text-foreground"
          }`}
        >
          {paidOrdersCount.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pesanan lunas siap dikirim
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sedang Disiapkan
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-foreground">
          {processingCount.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Menunggu penjemputan kurir
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dalam Perjalanan
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-info">
          {shippedCount.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Sedang diantar ke customer
        </p>
      </div>
    </div>
  );
}
