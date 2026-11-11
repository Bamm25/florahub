// Props interface untuk komponen ringkasan statistik inventaris bahan baku
interface InventoryStatsProps {
  totalInventory: number;
  lowStockCount: number;
  normalStock: number;
}

// Komponen panel metrik ringkasan inventaris bahan baku florist
export default function InventoryStats({
  totalInventory,
  lowStockCount,
  normalStock,
}: InventoryStatsProps) {
  const stats = [
    { label: "Total inventori bunga", value: totalInventory, accent: "text-white" },
    { label: "Stok menipis", value: lowStockCount, accent: lowStockCount > 0 ? "text-amber-300" : "text-white" },
    { label: "Stok aman", value: normalStock, accent: "text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 overflow-hidden rounded-2xl border border-zinc-800 bg-[#181720] text-white">
      {stats.map((s) => (
        <div
          key={s.label}
          className="border-b border-white/10 p-5 sm:p-6 sm:border-b-0 sm:border-r last:border-r-0"
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
