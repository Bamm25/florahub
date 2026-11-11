"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

// Props interface untuk komponen card display order
interface OrderCardProps {
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    itemCount: number;
    createdAt: string;
    items?: Array<{
      id: string;
      quantity?: number;
      product: {
        id: string;
        name: string;
        image?: string;
      };
    }>;
  };
  onClick?: (orderId: string) => void;
  onCancelled?: (orderId: string) => void;
}

// Card component untuk display order di halaman riwayat pesanan (klik untuk lihat detail)
export function OrderCard({ order, onClick }: OrderCardProps) {
  const router = useRouter();
  // Get konfigurasi UI berdasarkan order status
  const statusConfig = getStatusConfig(order.status);
  const items = order.items ?? [];
  const visibleItems = items.slice(0, 2);
  const remainingItems = items.slice(2);

  // Navigate ke detail order menggunakan callback atau router
  const handleClick = () => {
    if (onClick) {
      onClick(order.id);
    } else {
      router.push(`/orders/${order.id}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group block w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition-colors hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Lihat detail pesanan ${order.orderNumber}`}
    >
      {/* Header: nomor pesanan, tanggal, status */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="break-all font-mono text-sm font-semibold text-foreground">
            {order.orderNumber}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} aria-hidden="true" />
          {statusConfig.label}
        </span>
      </div>

      {/* Daftar Produk di Pesanan */}
      {items.length > 0 && (
        <div className="space-y-3 px-5 py-4">
          {visibleItems.map((item, idx) => (
            <div key={item.id || idx} className="flex items-center gap-3">
              {item.product.image ? (
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
                />
              ) : (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-container-low text-xs font-semibold text-muted-foreground"
                  aria-hidden="true"
                >
                  {item.product.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.product.name}
                </p>
                {item.quantity ? (
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} barang
                  </p>
                ) : null}
              </div>
            </div>
          ))}
          {remainingItems.length > 0 && (
            <p className="truncate text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                +{remainingItems.length} produk lainnya
              </span>
              {" · "}
              {remainingItems.map((i) => i.product.name).join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Footer: total dan ajakan lihat detail */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low px-5 py-3.5">
        <div>
          <p className="text-xs text-muted-foreground">
            Total belanja · {order.itemCount} item
          </p>
          <p className="text-base font-semibold tabular-nums text-foreground">
            Rp {order.totalAmount.toLocaleString("id-ID")}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          Lihat detail
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

// Map order status ke label dan warna UI
function getStatusConfig(status: string) {
  const configs: Record<
    string,
    { label: string; color: string; bgColor: string; dot: string }
  > = {
    PENDING: {
      label: "Menunggu Pembayaran",
      color: "text-warning",
      bgColor: "bg-warning/10",
      dot: "bg-warning",
    },
    PAID: {
      label: "Dibayar",
      color: "text-success",
      bgColor: "bg-success/10",
      dot: "bg-success",
    },
    PROCESSING: {
      label: "Diproses",
      color: "text-info",
      bgColor: "bg-info/10",
      dot: "bg-info",
    },
    SHIPPED: {
      label: "Dikirim",
      color: "text-tertiary",
      bgColor: "bg-tertiary/10",
      dot: "bg-tertiary",
    },
    DELIVERED: {
      label: "Selesai",
      color: "text-success",
      bgColor: "bg-success/10",
      dot: "bg-success",
    },
    CANCELLED: {
      label: "Dibatalkan",
      color: "text-error",
      bgColor: "bg-error/10",
      dot: "bg-error",
    },
  };
  return (
    configs[status] || {
      label: status,
      color: "text-muted-foreground",
      bgColor: "bg-surface-container-low",
      dot: "bg-muted-foreground",
    }
  );
}
