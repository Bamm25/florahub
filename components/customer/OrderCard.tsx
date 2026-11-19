"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Flower2, Store, Truck } from "lucide-react";
import type { OrderSummary } from "@/lib/api/orders";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";

type OrderCardData = Omit<OrderSummary, "payment" | "items"> & {
  items?: OrderSummary["items"];
  payment?: { status?: string };
};

interface OrderCardProps {
  order: OrderCardData;
  onClick?: (orderId: string) => void;
}

// Kartu riwayat pesanan editorial dengan tautan aksi independen dan responsif berbasis @container
export function OrderCard({ order, onClick }: OrderCardProps) {
  const statusConfig = getStatusConfig(order.status);
  const items = order.items ?? [];
  const visibleItems = items.slice(0, 2);
  const remainingItems = items.slice(2);
  const showTrackingLink =
    order.status === "PAID" ||
    order.status === "PROCESSING" ||
    order.status === "READY_TO_SHIP" ||
    order.status === "SHIPPED" ||
    order.status === "DELIVERED";
  const showShipmentTag =
    Boolean(order.shipment?.courier) &&
    order.status !== "PENDING" &&
    order.status !== "CANCELLED" &&
    order.status !== "REFUNDED";

  const detailClass =
    order.status === "PENDING"
      ? "btn-primary h-10 px-4 py-0 text-xs font-semibold"
      : "inline-flex min-h-10 items-center gap-1 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low";

  const detailLabel = order.status === "PENDING" ? "Bayar" : "Detail";

  return (
    <article className="@container overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-foreground/25">
      {/* Header: studio florist, nomor pesanan, tanggal, & status */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          {order.florist?.shopName && (
            <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{order.florist.shopName}</span>
            </p>
          )}
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h2 className="break-all font-mono text-sm font-semibold text-foreground">
              #{order.orderNumber}
            </h2>
            <span className="text-xs text-muted-foreground">
              {formatDate(order.createdAt)}
            </span>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`}
            aria-hidden="true"
          />
          {statusConfig.label}
        </span>
      </header>

      {/* Body: daftar produk portrait & info kurir ringkas */}
      {(items.length > 0 || showShipmentTag) && (
        <div className="flex flex-col gap-4 px-5 py-4 @md:flex-row @md:items-center @md:justify-between @md:gap-6">
          {items.length > 0 && (
            <div className="min-w-0 flex-1 space-y-3">
              {visibleItems.map((item, idx) => (
                <div key={item.id || idx} className="flex items-center gap-3.5">
                  {item.product.image ? (
                    <div className="relative aspect-[4/5] h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-container-low">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="flex aspect-[4/5] h-16 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-container-low text-muted-foreground"
                      aria-hidden="true"
                    >
                      <Flower2 className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.product.name}
                    </p>
                    {item.quantity ? (
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {item.quantity} barang
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
              {remainingItems.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  +{remainingItems.length} lainnya
                </p>
              )}
            </div>
          )}

          {showShipmentTag && order.shipment && (
            <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-border bg-surface-container-low px-3 py-2 text-xs text-foreground @md:self-center">
              <Truck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span className="font-semibold uppercase">
                {order.shipment.courier}
              </span>
              {order.shipment.trackingNumber && (
                <>
                  <span className="text-muted-foreground" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {order.shipment.trackingNumber}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer: total & kontrol navigasi */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-container-low/60 px-5 py-3.5">
        <div>
          <p className="text-xs text-muted-foreground">
            Total · {order.itemCount} item
          </p>
          <p className="text-base font-bold tabular-nums text-foreground">
            {formatRupiah(order.totalAmount)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showTrackingLink && (
            <Link
              href={`/orders/${order.id}/tracking`}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low"
            >
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                Lacak
                <span className="sr-only"> pesanan {order.orderNumber}</span>
              </span>
            </Link>
          )}

          {onClick ? (
            <button
              type="button"
              onClick={() => onClick(order.id)}
              className={detailClass}
            >
              <span>
                {detailLabel}
                <span className="sr-only"> pesanan {order.orderNumber}</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <Link href={`/orders/${order.id}`} className={detailClass}>
              <span>
                {detailLabel}
                <span className="sr-only"> pesanan {order.orderNumber}</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}

// Map order status ke label ringkas dan token warna desain
function getStatusConfig(status: string) {
  const configs: Record<
    string,
    { label: string; color: string; bgColor: string; dot: string }
  > = {
    PENDING: {
      label: "Belum Bayar",
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
    READY_TO_SHIP: {
      label: "Siap Dikirim",
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
    REFUNDED: {
      label: "Dana Dikembalikan",
      color: "text-muted-foreground",
      bgColor: "bg-surface-container",
      dot: "bg-muted-foreground",
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
