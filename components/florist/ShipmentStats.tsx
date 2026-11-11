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
    ? shipments.filter((s) => s.status === "PROCESSING").length 
    : 0;
  const shippedCount = Array.isArray(shipments) 
    ? shipments.filter((s) => s.status === "SHIPPED").length 
    : 0;

  const stats = [
    { label: "Total resi pengiriman", value: totalShipments, accent: "text-white" },
    { label: "Sedang diproses", value: processingCount, accent: "text-violet-300" },
    { label: "Dalam perjalanan", value: shippedCount, accent: "text-sky-300" },
    { label: "Perlu dibuat resi", value: paidOrdersCount, accent: paidOrdersCount > 0 ? "text-amber-300" : "text-white" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-2xl border border-zinc-800 bg-[#181720] text-white">
      {stats.map((s) => (
        <div
          key={s.label}
          className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r last:border-r-0"
        >
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{s.label}</p>
          <p className={`mt-2 text-2xl sm:text-3xl font-semibold tabular-nums ${s.accent}`}>
            {s.value.toLocaleString("id-ID")}
          </p>
        </div>
      ))}
    </div>
  );
}
