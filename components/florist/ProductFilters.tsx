import { Search, Plus } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categories: Category[];
  onCreateClick: () => void;
}

export default function ProductFilters({
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
  categories,
  onCreateClick,
}: ProductFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="input-field w-full sm:w-48"
      >
        <option value="ALL">Semua Kategori</option>
        {Array.isArray(categories) && categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="input-field w-full sm:w-48"
      >
        <option value="ALL">Semua Status</option>
        <option value="ACTIVE">Aktif</option>
        <option value="INACTIVE">Nonaktif</option>
        <option value="OUT_OF_STOCK">Stok Habis</option>
      </select>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari nama produk..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-field pl-10 w-full"
        />
      </div>

      <button onClick={onCreateClick} className="btn-primary text-sm">
        <Plus className="w-4 h-4" />
        Tambah Produk
      </button>
    </div>
  );
}
