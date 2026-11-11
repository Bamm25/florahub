import React from "react";

// Props interface untuk komponen status error
interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  title?: string;
}

// Komponen status error pemuatan data dengan opsi coba lagi
export default function ErrorState({
  error,
  onRetry,
  title = "Data belum bisa dimuat",
}: ErrorStateProps) {
  return (
    <div role="alert" className="surface-panel mx-auto max-w-xl border-error/30">
      <h2 className="mb-2 text-xl font-semibold text-foreground">{title}</h2>
      <p className="mb-6 text-sm leading-6 text-muted-foreground">{error}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary text-sm">
          Coba lagi
        </button>
      )}
    </div>
  );
}
