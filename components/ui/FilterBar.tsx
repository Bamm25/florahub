import React from "react";

// Antarmuka properti bilah penyaring data
interface FilterBarProps {
  filters: Array<{
    id: string;
    label: string;
    count?: number;
  }>;
  activeFilter: string;
  onChange: (filterId: string) => void;
}

// Komponen tombol filter horizontal dengan indikator status aktif
export default function FilterBar({ filters, activeFilter, onChange }: FilterBarProps) {
  // Render deretan tombol pilihan filter beserta jumlah item
  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onChange(filter.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeFilter === filter.id
              ? "bg-primary text-primary-foreground"
              : "bg-surface-container-low text-muted-foreground hover:bg-surface-container"
          }`}
        >
          {filter.label}
          {filter.count !== undefined && filter.count > 0 && ` (${filter.count})`}
        </button>
      ))}
    </div>
  );
}
