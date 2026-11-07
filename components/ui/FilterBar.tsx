import React from "react";

interface FilterBarProps {
  filters: Array<{
    id: string;
    label: string;
    count?: number;
  }>;
  activeFilter: string;
  onChange: (filterId: string) => void;
}

/**
 * FilterBar component
 * Horizontal filter buttons with active state
 */
export default function FilterBar({ filters, activeFilter, onChange }: FilterBarProps) {
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
