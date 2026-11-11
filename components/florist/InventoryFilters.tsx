import { Search } from "lucide-react";

// Props interface untuk komponen filter inventaris bahan baku
interface InventoryFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

// Komponen toolbar pencarian dan filter status inventaris florist
export default function InventoryFilters({
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
}: InventoryFiltersProps) {
  return (
    <div className="rounded-xl border border-border bg-background p-3.5 sm:p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter status inventaris"
          className="input-field w-full sm:w-48 text-sm"
        >
          <option value="ALL">Semua Status</option>
          <option value="LOW_STOCK">Stok Rendah</option>
          <option value="NORMAL">Stok Normal</option>
        </select>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama bunga atau supplier..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Cari nama bunga atau supplier"
            className="input-field pl-10 text-sm w-full"
          />
        </div>
      </div>
    </div>
  );
}
