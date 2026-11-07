import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: "primary" | "success" | "warning" | "error" | "info" | "tertiary";
  icon?: React.ReactNode;
}

/**
 * StatCard component
 * Reusable statistics card for dashboard metrics
 */
export default function StatCard({ label, value, color, icon }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
    info: "text-info",
    tertiary: "text-tertiary",
  };

  const valueColor = color ? colorClasses[color] : "";

  return (
    <div className="card-elevated p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}
