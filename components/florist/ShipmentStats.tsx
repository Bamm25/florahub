import StatCard from "@/components/ui/StatCard";

interface Shipment {
  status: string;
}

interface ShipmentStatsProps {
  shipments: Shipment[];
  paidOrdersCount: number;
}

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        label="Total Pengiriman"
        value={totalShipments}
      />
      <StatCard
        label="Diproses"
        value={processingCount}
        color="primary"
      />
      <StatCard
        label="Dalam Pengiriman"
        value={shippedCount}
        color="info"
      />
      <StatCard
        label="Perlu Dibuat"
        value={paidOrdersCount}
        color="warning"
      />
    </div>
  );
}
