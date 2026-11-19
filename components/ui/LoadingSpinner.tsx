import React from "react";

// Antarmuka properti komponen animasi pemuatan
interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

// Komponen animasi pemuatan terpusat dengan spinner dan pesan opsional
export default function LoadingSpinner({ message = "Memuat data...", size = "md" }: LoadingSpinnerProps) {
  // Pemetaan kelas ukuran untuk spinner animasi
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  // Render wadah flexbox di tengah layar beserta teks pesan
  return (
    <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-live="polite">
      <div className="text-center">
        <div
          aria-hidden="true"
          className={`inline-flex ${sizeClasses[size]} animate-spin rounded-full border-4 border-surface-container border-t-primary`}
        ></div>
        {message && <p className="mt-4 text-sm font-medium text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
