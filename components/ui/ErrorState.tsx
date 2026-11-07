import React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  title?: string;
}

/**
 * ErrorState component
 * Error display with retry button
 */
export default function ErrorState({
  error,
  onRetry,
  title = "Gagal Memuat Data",
}: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-error/20 bg-error/5 p-8 text-center max-w-xl mx-auto">
      <AlertTriangle className="h-10 w-10 text-error mx-auto mb-3" />
      <h2 className="text-lg font-bold text-foreground mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary text-sm">
          Coba Lagi
        </button>
      )}
    </div>
  );
}
