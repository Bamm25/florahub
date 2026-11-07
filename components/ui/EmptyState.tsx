import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

/**
 * EmptyState component
 * Display when no data is available
 */
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card-elevated p-12 flex flex-col items-center justify-center text-center">
      <div className="text-muted-foreground mb-4">{icon}</div>
      <p className="text-lg font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-6">
          {action.icon && <span className="mr-2">{action.icon}</span>}
          {action.label}
        </button>
      )}
    </div>
  );
}
