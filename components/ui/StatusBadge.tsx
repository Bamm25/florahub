import React from "react";

interface StatusBadgeProps {
  status: string;
  variant: "inventory" | "shipment" | "preorder" | "product";
  size?: "sm" | "md";
}

/**
 * StatusBadge component
 * Reusable status badge with variant-specific color mappings
 */
export default function StatusBadge({ status, variant, size = "md" }: StatusBadgeProps) {
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
          label: "Dikonfirmasi",
          className: "bg-success/10 text-success border-success/20",
        },
        CANCELLED: {
          label: "Dibatalkan",
          className: "bg-error/10 text-error border-error/20",
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

  const config = getConfig();
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${sizeClasses} ${config.className}`}
    >
      {config.label}
    </span>
  );
}
