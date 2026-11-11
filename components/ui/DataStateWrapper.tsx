import React from "react";
import LoadingSpinner from "./LoadingSpinner";
import ErrorState from "./ErrorState";
import EmptyState from "./EmptyState";

// Antarmuka properti pembungkus status pemuatan data
interface DataStateWrapperProps {
  isLoading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  onRetry: () => void;
  loadingMessage?: string;
  errorTitle?: string;
  children: React.ReactNode;
}

// Komponen pembungkus kondisi pemuatan, error, dan data kosong secara terpadu
export default function DataStateWrapper({
  isLoading,
  error,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  onRetry,
  loadingMessage,
  errorTitle,
  children,
}: DataStateWrapperProps) {
  // Tampilkan indikator pemuatan jika proses masih berjalan
  if (isLoading) {
    return <LoadingSpinner message={loadingMessage} />;
  }

  // Tampilkan pesan error dan opsi coba lagi jika terjadi kesalahan
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} title={errorTitle} />;
  }

  // Tampilkan kondisi data kosong jika tidak ada data yang tersedia
  if (isEmpty) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  // Render konten utama jika seluruh kondisi terpenuhi dengan baik
  return <>{children}</>;
}
