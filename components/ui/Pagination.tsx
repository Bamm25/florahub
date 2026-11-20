"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
  variant?: "numbers" | "compact";
  className?: string;
}

/**
 * Komponen navigasi halaman reusable untuk daftar terpaginasi.
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  ariaLabel = "Navigasi halaman",
  variant = "numbers",
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  if (variant === "compact") {
    return (
      <nav
        aria-label={ariaLabel}
        className={`flex items-center justify-between gap-4 text-sm ${className}`.trim()}
      >
        <button
          type="button"
          className="btn-secondary h-10 px-4 py-0 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          disabled={safePage <= 1 || disabled}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
        >
          Sebelumnya
        </button>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          Halaman {safePage} dari {totalPages}
        </span>
        <button
          type="button"
          className="btn-secondary h-10 px-4 py-0 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          disabled={safePage >= totalPages || disabled}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
        >
          Berikutnya
        </button>
      </nav>
    );
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={`flex items-center justify-center gap-2 ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, safePage - 1))}
        disabled={safePage <= 1 || disabled}
        aria-label="Halaman sebelumnya"
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          const showPage =
            page === 1 ||
            page === totalPages ||
            (page >= safePage - 1 && page <= safePage + 1);

          if (showPage) {
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                disabled={disabled}
                aria-current={safePage === page ? "page" : undefined}
                className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  safePage === page
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface hover:bg-surface-container"
                }`}
              >
                {page}
              </button>
            );
          }

          if (page === safePage - 2 || page === safePage + 2) {
            return (
              <span
                key={page}
                aria-hidden="true"
                className="px-2 text-muted-foreground"
              >
                ...
              </span>
            );
          }

          return null;
        })}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
        disabled={safePage >= totalPages || disabled}
        aria-label="Halaman berikutnya"
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </nav>
  );
}
