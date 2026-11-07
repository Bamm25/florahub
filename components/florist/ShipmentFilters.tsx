import SearchInput from "@/components/ui/SearchInput";

interface ShipmentFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

const statusOptions = [
  { value: "ALL", label: "Semua Status" },
  { value: "PENDING", label: "Menunggu" },
  { value: "PROCESSING", label: "Diproses" },
  { value: "SHIPPED", label: "Dikirim" },
  { value: "DELIVERED", label: "Terkirim" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

export default function ShipmentFilters({
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
}: ShipmentFiltersProps) {
  return (
    <>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="input-field w-full sm:w-48"
      >
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Cari order, courier, resi, atau customer..."
        className="flex-1"
      />
    </>
  );
}
