import React from "react";

interface FloraHubMarkProps {
  className?: string;
  variant?: "light" | "dark";
}

/**
 * Simbol emblem botanikal FloraHub:
 * - Kuntum bunga potong tengah (produk florist)
 * - Dua helai daun pengapit (kebun supplier & studio florist)
 * - Titik simpul (hub node) di pangkal tangkai yang menyatukan ekosistem Jawa Timur
 */
export function FloraHubMark({
  className = "h-7 w-7",
  variant = "light",
}: FloraHubMarkProps) {
  const isDarkSurface = variant === "dark";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`.trim()}
    >
      <rect
        width="32"
        height="32"
        rx="8"
        fill={isDarkSurface ? "oklch(24% 0.032 155)" : "var(--primary)"}
      />
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="7.25"
        stroke="var(--kicker)"
        strokeOpacity={isDarkSurface ? "0.32" : "0.24"}
        strokeWidth="1.25"
      />
      {/* Kuntum bunga utama */}
      <path
        d="M16 5.75C19.1 9.35 19.1 15.15 16 18.75C12.9 15.15 12.9 9.35 16 5.75Z"
        fill="var(--primary-foreground)"
      />
      {/* Daun pengapit kiri */}
      <path
        d="M14.6 20.5C9.75 19.9 7.1 16.1 7.6 10.9C11.75 11.45 14.1 14.65 14.6 20.5Z"
        fill="var(--kicker)"
      />
      {/* Daun pengapit kanan */}
      <path
        d="M17.4 20.5C22.25 19.9 24.9 16.1 24.4 10.9C20.25 11.45 17.9 14.65 17.4 20.5Z"
        fill="var(--kicker)"
      />
      {/* Titik simpul Hub */}
      <circle cx="16" cy="24.25" r="2" fill="var(--kicker)" />
    </svg>
  );
}
