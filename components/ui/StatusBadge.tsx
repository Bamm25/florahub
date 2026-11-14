import React from "react";

// Antarmuka properti lencana status
interface StatusBadgeProps {
  status: string;
  variant: "inventory" | "shipment" | "preorder" | "product";
  size?: "sm" | "md";
}

// Komponen lencana status reusable dengan pemetaan warna berdasarkan varian entitas
export default function StatusBadge({ status, variant, size = "md" }: StatusBadgeProps) {
  // Ambil konfigurasi label teks dan gaya warna berdasarkan jenis varian dan status
  const getConfig = () => {
    const configs: Record<string, Record<string, { label: string; className: string }>> = {
      inventory: {
        LOW_STOCK: {
          label: "Stok Rendah",
          className: "bg-warning/10 text-warning border-warning/20",
        },
        NORMAL: {
          label: "Normal",
          className: "bg-success/10 text-success border-success/20",
        },
      },
      shipment: {
        PENDING: {
          label: "Menunggu",
          className: "bg-warning/10 text-warning border-warning/20",
        },
        PROCESSING: {
          label: "Diproses",
          className: "bg-primary/10 text-primary border-primary/20",
        },
        SHIPPED: {
          label: "Dikirim",
          className: "bg-info/10 text-info border-info/20",
        },
        DELIVERED: {
          label: "Terkirim",
          className: "bg-success/10 text-success border-success/20",
        },
        CANCELLED: {
          label: "Dibatalkan",
          className: "bg-error/10 text-error border-error/20",
        },
      },
      preorder: {
        PENDING: {
          label: "Menunggu Konfirmasi",
          className: "bg-warning/10 text-warning border-warning/20",
        },
        CONFIRMED: {
          label: "Menunggu DP",
          className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
        },
        DEPOSIT_PAID: {
          label: "DP Diterima",
          className: "bg-blue-500/10 text-blue-700 border-blue-500/20",
        },
        PAID: {
          label: "Lunas",
          className: "bg-success/10 text-success border-success/20",
        },
        SHIPPED: {
          label: "Dalam Pengiriman",
          className: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
        },
        DELIVERED: {
          label: "Diterima / Selesai",
          className: "bg-emerald-600/10 text-emerald-800 border-emerald-600/20",
        },
        CANCELLED: {
          label: "Dibatalkan",
          className: "bg-error/10 text-error border-error/20",
        },
        EXPIRED: {
          label: "Kedaluwarsa",
          className: "bg-surface-container text-muted-foreground border-border",
        },
      },
      product: {
        ACTIVE: {
          label: "Aktif",
          className: "bg-success/10 text-success border-success/20",
        },
        INACTIVE: {
          label: "Nonaktif",
          className: "bg-error/10 text-error border-error/20",
        },
        OUT_OF_STOCK: {
          label: "Stok Habis",
          className: "bg-warning/10 text-warning border-warning/20",
        },
        FEATURED: {
          label: "Featured",
          className: "bg-tertiary/10 text-tertiary border-tertiary/20",
        },
      },
    };

    const variantConfig = configs[variant] || {};
    return variantConfig[status] || {
      label: status,
      className: "bg-surface-container text-muted-foreground border-border",
    };
  };

  // Evaluasi konfigurasi status aktif dan penentuan ukuran lencana
  const config = getConfig();
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs";

  // Render elemen lencana status berupa badge kapsul
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${sizeClasses} ${config.className}`}
    >
      {config.label}
    </span>
  );
}
