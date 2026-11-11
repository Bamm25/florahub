import React from "react";

// Props interface untuk komponen kartu statistik metrik
interface StatCardProps {
  label: string;
  value: string | number;
  color?: "primary" | "success" | "warning" | "error" | "info" | "tertiary";
  icon?: React.ReactNode;
}

// Komponen kartu metrik statistik ringkas untuk dasbor
export default function StatCard({ label, value }: StatCardProps) {

  return (
    <div className="card-elevated p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-4 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
