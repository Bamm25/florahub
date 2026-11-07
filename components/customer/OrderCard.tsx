"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ChevronRight,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { cancelOrder } from "@/lib/api/orders";

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

// Card component untuk display order dengan status dan action cancel
export function OrderCard({ order, onClick, onCancelled }: OrderCardProps) {
  const router = useRouter();
  // Get konfigurasi UI berdasarkan order status
  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  const [showModal, setShowModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Navigate ke detail order menggunakan callback atau router
  const handleClick = () => {
    if (onClick) {
      onClick(order.id);
    } else {
      router.push(`/orders/${order.id}`);
    }
  };

  // Show confirmation modal untuk cancel order
  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCancelError(null);
    setShowModal(true);
  };

  // Call API untuk cancel order dan update UI
  const handleConfirmCancel = async () => {
    try {
      setIsCancelling(true);
      setCancelError(null);
      await cancelOrder(order.id);
      setShowModal(false);
      if (onCancelled) {
        onCancelled(order.id);
      } else {
        router.refresh();
      }
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "Gagal membatalkan pesanan",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <div className="card-elevated w-full hover:shadow-lg transition-all hover:scale-[1.01]">
        <button
          onClick={handleClick}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h3 className="text-lg font-bold text-foreground">
                  {order.orderNumber}
                </h3>
                <span
                  className={`badge flex items-center gap-1.5 ${statusConfig.bgColor} ${statusConfig.color}`}
                >
                  <StatusIcon className="h-4 w-4" />
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {new Date(order.createdAt).toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>

              {/* Daftar Produk di Pesanan */}
              {order.items && order.items.length > 0 && (
                <div className="mb-3 space-y-2 rounded-xl bg-surface-container-low p-3 border border-border/60">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center gap-3">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-muted-foreground border border-border">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
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
                  {order.items.length > 2 && (
                    <p className="text-xs text-muted-foreground pt-1.5 border-t border-border/40 font-medium">
                      +{order.items.length - 2} produk lainnya:{" "}
                      <span className="text-foreground/80 font-normal">
                        {order.items.slice(2).map((i) => i.product.name).join(", ")}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <p className="text-base font-semibold text-foreground">
                Total Belanja: Rp{" "}
                {order.totalAmount.toLocaleString("id-ID")}
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  ({order.itemCount} item)
                </span>
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-muted-foreground flex-shrink-0 ml-4 mt-1" />
          </div>
        </button>

        {/* Cancel button — only for PENDING orders */}
        {order.status === "PENDING" && (
          <div className="mt-4 pt-4 border-t border-border flex justify-end">
            <button
              onClick={handleCancelClick}
              className="flex items-center gap-2 rounded-xl border border-error/50 bg-error/10 px-4 py-2 text-sm font-medium text-error hover:bg-error/20 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Batalkan Pesanan
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isCancelling && setShowModal(false)}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl border border-border">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10">
                <AlertTriangle className="h-8 w-8 text-error" />
              </div>
            </div>

            <h2 className="mb-2 text-center text-xl font-bold text-foreground">
              Batalkan Pesanan?
            </h2>
            <p className="mb-2 text-center text-sm text-muted-foreground">
              Pesanan{" "}
              <span className="font-semibold text-foreground">
                #{order.orderNumber}
              </span>{" "}
              akan dibatalkan dan stok produk akan dikembalikan.
            </p>
            <p className="mb-6 text-center text-sm font-medium text-warning">
              Tindakan ini tidak dapat dibatalkan.
            </p>

            {cancelError && (
              <div className="mb-4 rounded-xl bg-error/10 border border-error/30 p-3 text-sm text-error text-center">
                {cancelError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isCancelling}
                className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tidak, Kembali
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 rounded-xl bg-error px-4 py-2.5 text-sm font-semibold text-white hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Membatalkan...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Ya, Batalkan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Map order status ke icon, label, dan warna UI
function getStatusConfig(status: string) {
  const configs: Record<
    string,
    { icon: LucideIcon; label: string; color: string; bgColor: string }
  > = {
    PENDING: {
      icon: Clock,
      label: "Menunggu Pembayaran",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    PAID: {
      icon: CheckCircle,
      label: "Dibayar",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    PROCESSING: {
      icon: Package,
      label: "Diproses",
      color: "text-info",
      bgColor: "bg-info/10",
    },
    SHIPPED: {
      icon: Truck,
      label: "Dikirim",
      color: "text-tertiary",
      bgColor: "bg-tertiary/10",
    },
    DELIVERED: {
      icon: CheckCircle,
      label: "Selesai",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    CANCELLED: {
      icon: XCircle,
      label: "Dibatalkan",
      color: "text-error",
      bgColor: "bg-error/10",
    },
  };
  return (
    configs[status] || {
      icon: Clock,
      label: status,
      color: "text-muted-foreground",
      bgColor: "bg-surface-container",
    }
  );
}
