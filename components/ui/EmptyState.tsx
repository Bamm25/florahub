import React from "react";

// Props interface untuk komponen status kosong
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

// Komponen status data kosong dengan pesan informatif dan tombol aksi
export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="surface-panel flex min-h-56 flex-col items-start justify-center py-10 sm:py-12">
      <p className="text-xl font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
      {action && (
        <button type="button" onClick={action.onClick} className="btn-primary mt-6">
          {action.label}
        </button>
      )}
    </div>
  );
}
