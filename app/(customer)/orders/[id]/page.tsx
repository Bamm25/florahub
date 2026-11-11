"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getOrderDetail,
  getOrderShipment,
  cancelOrder,
  type Shipment,
} from "@/lib/api/orders";
import {
  CheckCircle,
  Clock,
  Package,
  MapPin,
  CreditCard,
  XCircle,
  Truck,
  Home,
  ArrowLeft,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

// Interface untuk data detail order lengkap dengan items, address, dan payment
interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  notes: string | null;
  subtotal: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    subtotal: number;
    product: {
      id: string;
      name: string;
      image: string;
      currentPrice: number;
    };
  }>;
  address: {
    id: string;
    label: string;
    recipientName: string;
    phone: string;
    fullAddress: string;
    city: string;
    province: string;
    postalCode: string;
  } | null;
  payment: {
    id: string;
    amount: number;
    method: string;
    status: string;
    transactionId: string | null;
    paidAt: string | null;
  } | null;
}

// Halaman detail pesanan dengan info lengkap dan tombol cancel
export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { status } = useSession();
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Redirect ke login jika belum auth, fetch order detail dan shipment info
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=/orders/${orderId}`);
      return;
    }

    async function loadOrder() {
      try {
        setIsLoading(true);
        const response = await getOrderDetail(orderId);
        setOrder(response.data.order);

        // Fetch shipment info jika tersedia, skip error jika belum ada
        try {
          const shipmentRes = await getOrderShipment(orderId);
          setShipment(shipmentRes.data.shipment);
        } catch {
          // Shipment belum tersedia untuk order ini
          setShipment(null);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal memuat pesanan",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated") {
      loadOrder();
    }
  }, [status, orderId, router]);

  // Fungsi refresh manual untuk reload order status dari DB (no cache)
  const handleRefreshOrder = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/customer/orders/${orderId}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setOrder(result.data.order);
      }
    } catch (error) {
      console.error("Refresh order error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Render loading skeleton untuk order detail
  if (status === "loading" || isLoading) {
    return (
      <div className="container-custom section-spacing">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-surface-container mb-8" />
        <div className="h-96 animate-pulse rounded-xl bg-surface-container-low" />
      </div>
    );
  }

  // Render error state jika order tidak ditemukan
  if (errorMessage || !order) {
    return (
      <div className="container-custom section-spacing">
        <div className="card-elevated text-center max-w-2xl mx-auto">
          <XCircle className="mx-auto h-16 w-16 text-error mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {errorMessage || "Pesanan tidak ditemukan"}
          </h2>
          <button
            onClick={() => router.push("/")}
            className="btn-primary mt-6"
          >
            <Home className="mr-2 h-5 w-5" />
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // Mapping status order ke icon, label, warna, dan bg color
  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      { icon: LucideIcon; label: string; color: string; bgColor: string }
    > = {
      PENDING: {
        icon: Clock,
        label: "Menunggu Pembayaran",
        color: "text-warning",
        bgColor: "bg-warning/10 border-warning/30",
      },
      PAID: {
        icon: CheckCircle,
        label: "Pembayaran Berhasil",
        color: "text-success",
        bgColor: "bg-success/10 border-success/30",
      },
      PROCESSING: {
        icon: Package,
        label: "Sedang Diproses",
        color: "text-info",
        bgColor: "bg-info/10 border-info/30",
      },
      SHIPPED: {
        icon: Truck,
        label: "Sedang Dikirim",
        color: "text-tertiary",
        bgColor: "bg-tertiary/10 border-tertiary/30",
      },
      DELIVERED: {
        icon: CheckCircle,
        label: "Pesanan Selesai",
        color: "text-success",
        bgColor: "bg-success/10 border-success/30",
      },
      CANCELLED: {
        icon: XCircle,
        label: "Dibatalkan",
        color: "text-error",
        bgColor: "bg-error/10 border-error/30",
      },
    };
    return (
      configs[status] || {
        icon: Clock,
        label: status,
        color: "text-muted-foreground",
        bgColor: "bg-surface-container-low border-border",
      }
    );
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  // Handle konfirmasi cancel order dan update state lokal
  const handleConfirmCancel = async () => {
    try {
      setIsCancelling(true);
      setCancelError(null);
      await cancelOrder(order.id);
      setShowCancelModal(false);
      setOrder((prev) => prev ? { ...prev, status: "CANCELLED" } : prev);
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "Gagal membatalkan pesanan",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="container-custom section-spacing">
      {/* Back Button */}
      <Link 
        href="/orders" 
        className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Riwayat Pesanan
      </Link>

      {/* Status Header */}
      <div
        className={`mb-8 rounded-2xl border-2 p-8 text-center ${statusConfig.bgColor}`}
      >
        <StatusIcon className={`mx-auto h-20 w-20 ${statusConfig.color}`} />
        <h1 className={`mt-4 text-3xl font-bold ${statusConfig.color}`}>
          {statusConfig.label}
        </h1>
        <p className="mt-3 text-xl font-semibold text-foreground">
          Order #{order.orderNumber}
        </p>
        <p className="mt-2 text-base text-muted-foreground">
          {new Date(order.createdAt).toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        {/* Action buttons */}
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <button
            onClick={() => router.push(`/orders/${order.id}/tracking`)}
            className="btn-primary"
          >
            <Truck className="mr-2 h-5 w-5" />
            <span>Lacak Pengiriman Pesanan</span>
          </button>

          <button
            onClick={handleRefreshOrder}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh status pembayaran"
          >
            {isRefreshing ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Package className="h-5 w-5" />
            )}
            {isRefreshing ? "Memuat..." : "Refresh Status"}
          </button>

          {order.status === "PENDING" && (
            <button
              onClick={() => {
                setCancelError(null);
                setShowCancelModal(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-error/50 bg-error/10 px-5 py-2.5 text-sm font-semibold text-error hover:bg-error/20 transition-colors"
            >
              <XCircle className="h-5 w-5" />
              Batalkan Pesanan
            </button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isCancelling && setShowCancelModal(false)}
          />
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
                onClick={() => setShowCancelModal(false)}
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Detail Produk */}
          <div className="card-elevated">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Detail Produk ({order.items.length} item)
              </h2>
            </div>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <img
                    src={item.product.image || "/placeholder.png"}
                    alt={item.product.name}
                    className="h-20 w-20 rounded-xl border border-border object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-base">
                      {item.product.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.quantity}x @ Rp {item.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    Rp {item.subtotal.toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Alamat Pengiriman */}
          {order.address && (
            <div className="card-elevated">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Alamat Pengiriman
                </h2>
              </div>
              <p className="font-semibold text-foreground text-base mb-2">
                {order.address.recipientName} • {order.address.phone}
              </p>
              <p className="text-base text-muted-foreground mb-1">
                {order.address.fullAddress}
              </p>
              <p className="text-base text-muted-foreground">
                {order.address.city}, {order.address.province}{" "}
                {order.address.postalCode}
              </p>
            </div>
          )}

          {/* Info Pengiriman */}
          {shipment && (
            <div className="card-elevated">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary/10">
                  <Truck className="h-6 w-6 text-tertiary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Info Pengiriman
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">Kurir</span>
                  <span className="font-semibold text-foreground uppercase">
                    {shipment.courier}
                    {shipment.service && ` - ${shipment.service}`}
                  </span>
                </div>
                {shipment.trackingNumber && (
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">No. Resi</span>
                    <span className="font-mono font-bold text-foreground">
                      {shipment.trackingNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">Status Pengiriman</span>
                  <span className="font-semibold text-foreground">
                    {shipment.status === "PENDING" && "Menunggu Pickup"}
                    {shipment.status === "PICKED_UP" && "Sudah Diambil Kurir"}
                    {shipment.status === "IN_TRANSIT" && "Dalam Perjalanan"}
                    {shipment.status === "DELIVERED" && "Sudah Diterima"}
                    {shipment.status === "FAILED" && "Pengiriman Gagal"}
                  </span>
                </div>
                {shipment.estimatedDays && (
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">Estimasi</span>
                    <span className="font-semibold text-foreground">
                      {shipment.estimatedDays} hari kerja
                    </span>
                  </div>
                )}
                {shipment.shippedAt && (
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">Tanggal Kirim</span>
                    <span className="font-semibold text-foreground">
                      {new Date(shipment.shippedAt).toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {shipment.deliveredAt && (
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">Tanggal Diterima</span>
                    <span className="font-semibold text-foreground">
                      {new Date(shipment.deliveredAt).toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Ringkasan Pembayaran */}
        <div className="lg:col-span-1">
          <div className="card-elevated sticky top-24">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary/10">
                <CreditCard className="h-6 w-6 text-tertiary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Ringkasan Pembayaran
              </h2>
            </div>
            <div className="space-y-3 border-b border-border pb-6">
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Subtotal Produk</span>
                <span className="font-semibold text-foreground">
                  Rp {order.subtotal.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Ongkos Kirim</span>
                <span className="font-semibold text-foreground">
                  Rp {order.shippingCost.toLocaleString("id-ID")}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-success">Diskon</span>
                  <span className="font-semibold text-success">
                    -Rp {order.discount.toLocaleString("id-ID")}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-between text-lg">
              <span className="font-bold text-foreground">Total Pembayaran</span>
              <span className="text-2xl font-bold text-primary">
                Rp {order.totalAmount.toLocaleString("id-ID")}
              </span>
            </div>

            {order.payment && (
              <div className="mt-6 rounded-xl bg-surface-container-low p-5 border border-border">
                <p className="text-sm font-medium text-muted-foreground mb-2">Metode Pembayaran:</p>
                <p className="text-base font-bold text-foreground capitalize">
                  {order.payment.method}
                </p>
                {order.payment.paidAt && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Dibayar pada:{" "}
                    {new Date(order.payment.paidAt).toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => router.push("/")}
              className="btn-secondary w-full mt-6"
            >
              <Home className="mr-2 h-5 w-5" />
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
