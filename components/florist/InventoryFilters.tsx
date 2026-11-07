interface InventoryFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function InventoryFilters({
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
}: InventoryFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="input-field w-full sm:w-48"
      >
        <option value="ALL">Semua Status</option>
        <option value="LOW_STOCK">Stok Rendah</option>
        <option value="NORMAL">Stok Normal</option>
      </select>

      <input
        type="text"
        placeholder="Cari nama bunga atau supplier..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="input-field flex-1"
      />
    </div>
  );
}
