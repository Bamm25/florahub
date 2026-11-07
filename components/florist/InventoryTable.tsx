import { Edit, Trash2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import ActionButtons from "@/components/ui/ActionButtons";

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

interface InventoryTableProps {
  inventories: InventoryItem[];
  onEdit: (inventory: InventoryItem) => void;
  onDelete: (inventory: InventoryItem) => void;
}

export default function InventoryTable({ inventories, onEdit, onDelete }: InventoryTableProps) {
  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="card-elevated overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-container-low border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Nama Bunga
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Supplier
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Quantity
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Lokasi
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Restock Terakhir
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
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
                <td className="px-4 py-3 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {inv.quantity} {inv.stock.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">Min: {inv.minThreshold}</p>
                </td>
                <td className="px-4 py-3 text-center">
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
