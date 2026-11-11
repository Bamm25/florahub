import StatusBadge from "@/components/ui/StatusBadge";
import ActionButtons from "@/components/ui/ActionButtons";

// Interface data inventaris bahan baku florist
interface InventoryItem {
  id: string;
  quantity: number;
  minThreshold: number;
  maxCapacity: number | null;
  location: string | null;
  lastRestockDate: string | null;
  isLowStock: boolean;
  stock: {
    id: string;
    name: string;
    variety: string | null;
    unit: string;
    pricePerUnit: number;
    harvestDate: string;
    supplier: {
      id: string;
      name: string;
      email: string;
    };
  };
}

// Props interface untuk komponen tabel inventaris bahan baku
interface InventoryTableProps {
  inventories: InventoryItem[];
  onEdit: (inventory: InventoryItem) => void;
  onDelete: (inventory: InventoryItem) => void;
}

// Komponen tabel daftar inventaris bahan baku florist dengan status stok
export default function InventoryTable({ inventories, onEdit, onDelete }: InventoryTableProps) {
  // Helper untuk memformat tanggal ke format lokal Indonesia
  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[760px]">
          <thead className="bg-[#181720] border-b border-zinc-800">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Nama Bunga
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Supplier
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Quantity
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Lokasi
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Restock Terakhir
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {inventories.map((inv) => (
              <tr key={inv.id} className="hover:bg-surface-container-low/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{inv.stock?.name || 'Unknown'}</p>
                    {inv.stock?.variety && (
                      <p className="text-xs text-muted-foreground">{inv.stock.variety}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-foreground">{inv.stock?.supplier?.name || 'Unknown'}</p>
                </td>
                <td scope="col" className="px-4 py-3 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {inv.quantity} {inv.stock.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">Min: {inv.minThreshold}</p>
                </td>
                <td scope="col" className="px-4 py-3 text-center">
                  <StatusBadge
                    status={inv.isLowStock ? "LOW_STOCK" : "NORMAL"}
                    variant="inventory"
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">{inv.location || "-"}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">{formatDate(inv.lastRestockDate)}</p>
                </td>
                <td className="px-4 py-3">
                  <ActionButtons
                    onEdit={() => onEdit(inv)}
                    onDelete={() => onDelete(inv)}
                    size="sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
