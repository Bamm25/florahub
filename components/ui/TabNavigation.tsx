import React from "react";

// Antarmuka properti navigasi tab
interface TabNavigationProps {
  tabs: Array<{
    id: string;
    label: string;
    badge?: number;
  }>;
  activeTab: string;
  onChange: (tabId: string) => void;
}

// Komponen navigasi tab reusable dengan dukungan lencana angka
export default function TabNavigation({ tabs, activeTab, onChange }: TabNavigationProps) {
  // Render deretan tab navigasi horizontal beserta lencana indikator jika tersedia
  return (
    <div className="flex gap-2 border-b border-border" role="tablist">
      {tabs.map((tab) => {
        const isSelected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(tab.id)}
            className={`cursor-pointer px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              isSelected
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
