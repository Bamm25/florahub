import StatCard from "@/components/ui/StatCard";

interface InventoryStatsProps {
  totalInventory: number;
  lowStockCount: number;
  normalStock: number;
}

export default function InventoryStats({
  totalInventory,
  lowStockCount,
  normalStock,
}: InventoryStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard label="Total Inventory" value={totalInventory} />
      <StatCard label="Stok Rendah" value={lowStockCount} color="warning" />
      <StatCard label="Stok Normal" value={normalStock} color="success" />
    </div>
  );
}
