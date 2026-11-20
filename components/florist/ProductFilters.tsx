import SearchInput from "@/components/ui/SearchInput";

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
  onCreateClick?: () => void;
}

const PRODUCT_STATUS_OPTIONS = [
  { value: "ALL", label: "Semua Status" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "INACTIVE", label: "Nonaktif" },
  { value: "OUT_OF_STOCK", label: "Stok Habis" },
] as const;

// Komponen toolbar filter dan pencarian produk katalog florist
export default function ProductFilters({
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
  categories,
}: ProductFiltersProps) {
  return (
    <div className="space-y-3.5 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Filter status produk"
          className="flex flex-wrap gap-2"
        >
          {PRODUCT_STATUS_OPTIONS.map((option) => {
            const isActive = statusFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onStatusChange(option.value)}
                className={`min-h-9 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="w-full sm:w-52">
          <label htmlFor="product-category-filter" className="sr-only">
            Filter Kategori Produk
          </label>
          <select
            id="product-category-filter"
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="input-field w-full py-2 text-xs font-medium"
          >
            <option value="ALL">Semua Kategori</option>
            {Array.isArray(categories) &&
              categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Cari nama produk buket atau karangan bunga..."
      />
    </div>
  );
}
