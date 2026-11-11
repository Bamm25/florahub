import { Search, Plus } from "lucide-react";

// Interface data kategori untuk filter produk
interface Category {
  id: string;
  name: string;
}

// Props interface untuk komponen filter dan pencarian produk florist
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

// Komponen toolbar filter dan pencarian produk katalog florist
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
    <div className="rounded-xl border border-border bg-background p-3.5 sm:p-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama produk, buket, karangan..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-field pl-10 text-sm w-full"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="input-field text-sm w-full sm:w-44 py-2"
          >
            <option value="ALL">Semua Kategori</option>
            {Array.isArray(categories) &&
              categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="input-field text-sm w-full sm:w-40 py-2"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
            <option value="OUT_OF_STOCK">Stok Habis</option>
          </select>

          <button
            onClick={onCreateClick}
            className="btn-primary min-h-10 px-4 text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        </div>
      </div>
    </div>
  );
}
