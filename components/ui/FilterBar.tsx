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
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        return (
          <button
            key={filter.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(filter.id)}
            className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-surface-container-low hover:text-foreground"
            }`}
          >
            {filter.label}
            {filter.count !== undefined && filter.count > 0 && (
              <span className="tabular-nums"> ({filter.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
