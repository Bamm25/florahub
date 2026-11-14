"use client";

import { use, useEffect, useState } from "react";


import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  getOrderDetail,
  getOrderShipment,
  cancelOrder,
  type Shipment,
} from "@/lib/api/orders";
import { createPaymentToken } from "@/lib/api/customer";
import {
  ArrowLeft,
  RefreshCw,
  Truck,
  CreditCard,
  XCircle,
  Package,
} from "lucide-react";

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
  const [isPaying, setIsPaying] = useState(false);

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

    } finally {
      setIsRefreshing(false);
    }
  };

  // Fungsi bayar sekarang untuk order PENDING via popup Midtrans
  const handlePayNow = async () => {
    if (!order) return;
    try {
      setIsPaying(true);
      const res = await createPaymentToken(order.id);
      const snapToken = res.data.token;
      if (typeof window !== "undefined" && window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: function (): void {
            handleRefreshOrder();
          },
          onPending: function (): void {
            handleRefreshOrder();
          },
          onError: function (): void {
            alert("Pembayaran gagal. Silakan coba lagi.");
          },
          onClose: function (): void {
            // Popup ditutup oleh user
          },
        });
      } else {
        alert(
          "Script pembayaran Midtrans belum siap dimuat. Silakan refresh halaman.",
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyiapkan pembayaran");
    } finally {
      setIsPaying(false);
    }
  };

  // Handle konfirmasi cancel order dan update state lokal
  const handleConfirmCancel = async () => {
    try {
      setIsCancelling(true);
      setCancelError(null);
      await cancelOrder(order!.id);
      setShowCancelModal(false);
      setOrder((prev) => (prev ? { ...prev, status: "CANCELLED" } : prev));
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "Gagal membatalkan pesanan",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // Render loading skeleton untuk order detail
  if (status === "loading" || isLoading) {
    return (
      <main className="container-custom section-spacing">
        <div className="h-6 w-40 animate-pulse rounded bg-surface-container mb-6" />
        <div className="h-44 animate-pulse rounded-2xl bg-surface-container-low mb-8" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-64 animate-pulse rounded-2xl bg-surface-container-low" />
            <div className="h-40 animate-pulse rounded-2xl bg-surface-container-low" />
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-surface-container-low" />
        </div>
      </main>
    );
  }

  // Render error state jika order tidak ditemukan
  if (errorMessage || !order) {
    return (
      <main className="container-custom section-spacing">
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-base font-semibold text-foreground">
            {errorMessage || "Pesanan tidak ditemukan"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pesanan mungkin sudah dipindahkan atau nomor referensi tidak valid.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/orders" className="btn-secondary h-10 px-5 text-sm">
              Ke Riwayat Pesanan
            </Link>
            <Link href="/" className="btn-primary h-10 px-5 text-sm">
              Beranda
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const statusMeta = getStatusMeta(order.status);

  return (
    <main className="container-custom section-spacing">
      {/* Breadcrumb / Back */}
      <nav aria-label="Navigasi" className="mb-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Riwayat Pesanan
        </Link>
      </nav>

      {/* Status Hero — aksen gelap elegan */}
      <section
        aria-labelledby="order-status-heading"
        className="mb-8 rounded-2xl bg-[#10121b] p-6 text-white sm:p-8 border border-white/10"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
              <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
              <span className="text-white">{statusMeta.label}</span>
            </div>
            <h1
              id="order-status-heading"
              className="mt-3 font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl"
            >
              Order #{order.orderNumber}
            </h1>
            <p className="mt-1 text-xs text-white/70">
              Dibuat pada{" "}
              {new Date(order.createdAt).toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {order.status === "PENDING" && (
              <button
                onClick={handlePayNow}
                disabled={isPaying}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPaying ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                <span>{isPaying ? "Menyiapkan..." : "Bayar Sekarang"}</span>
              </button>
            )}

            {order.status !== "PENDING" && order.status !== "CANCELLED" && (
              <Link
                href={`/orders/${order.id}/tracking`}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#10121b] transition-colors hover:bg-white/90"
              >
                <Truck className="h-4 w-4" />
                <span>Lacak Pengiriman</span>
              </Link>
            )}

            <button
              onClick={handleRefreshOrder}
              disabled={isRefreshing}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
              title="Perbarui status pesanan dari sistem"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span>{isRefreshing ? "Memperbarui..." : "Perbarui"}</span>
            </button>

            {order.status === "PENDING" && (
              <button
                onClick={() => {
                  setCancelError(null);
                  setShowCancelModal(true);
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-white/20 bg-transparent px-4 text-sm font-medium text-white/80 transition-colors hover:border-error/40 hover:bg-error/10 hover:text-error"
              >
                <XCircle className="h-4 w-4" />
                <span>Batalkan</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4"
        >
          <div
            className="absolute inset-0"
            onClick={() => !isCancelling && setShowCancelModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">
              Batalkan Pesanan?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Pesanan{" "}
              <span className="font-mono font-semibold text-foreground">
                #{order.orderNumber}
              </span>{" "}
              akan dibatalkan dan stok produk akan dikembalikan.
            </p>
            <p className="mt-2 text-xs font-medium text-warning">
              Tindakan ini tidak dapat dibatalkan.
            </p>

            {cancelError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error"
              >
                {cancelError}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="btn-secondary h-11 flex-1 py-0 text-sm disabled:opacity-50"
              >
                Kembali
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="h-11 flex-1 rounded-xl bg-error px-4 text-sm font-semibold text-white transition-colors hover:bg-error/90 disabled:opacity-50"
              >
                {isCancelling ? "Membatalkan..." : "Ya, Batalkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konten Utama */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Produk & Pengiriman */}
        <div className="space-y-6 lg:col-span-2">
          {/* Detail Produk */}
          <section
            aria-labelledby="items-heading"
            className="rounded-2xl border border-border bg-card p-6"
          >
            <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3">
              <h2
                id="items-heading"
                className="text-base font-semibold text-foreground"
              >
                Rincian produk
              </h2>
              <span className="text-xs text-muted-foreground">
                {order.items.length} item
              </span>
            </div>
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
                >
                  {item.product.image ? (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-container-low text-muted-foreground"
                      aria-hidden="true"
                    >
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.product.name}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {item.quantity} × Rp {item.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    Rp {item.subtotal.toLocaleString("id-ID")}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Alamat Pengiriman */}
          {order.address && (
            <section
              aria-labelledby="address-heading"
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h2
                id="address-heading"
                className="mb-3 border-b border-border pb-3 text-base font-semibold text-foreground"
              >
                Alamat pengiriman
              </h2>
              <p className="text-sm font-medium text-foreground">
                {order.address.recipientName}
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span className="font-normal tabular-nums text-muted-foreground">
                  {order.address.phone}
                </span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {order.address.fullAddress}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.address.city}, {order.address.province}{" "}
                {order.address.postalCode}
              </p>
            </section>
          )}

          {/* Info Pengiriman */}
          {shipment && (
            <section
              aria-labelledby="shipment-heading"
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <h2
                  id="shipment-heading"
                  className="text-base font-semibold text-foreground"
                >
                  Info kurir
                </h2>
                <Link
                  href={`/orders/${order.id}/tracking`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Lihat pelacakan →
                </Link>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Kurir</dt>
                  <dd className="font-medium uppercase text-foreground">
                    {shipment.courier}
                    {shipment.service ? ` (${shipment.service})` : ""}
                  </dd>
                </div>
                {shipment.trackingNumber && (
                  <div>
                    <dt className="text-xs text-muted-foreground">No. Resi</dt>
                    <dd className="font-mono text-xs font-semibold text-foreground">
                      {shipment.trackingNumber}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Status Pengiriman
                  </dt>
                  <dd className="font-medium text-foreground">
                    {shipment.status === "PENDING" && "Menunggu Pickup"}
                    {shipment.status === "PICKED_UP" && "Sudah Diambil Kurir"}
                    {shipment.status === "IN_TRANSIT" && "Dalam Perjalanan"}
                    {shipment.status === "DELIVERED" && "Sudah Diterima"}
                    {shipment.status === "FAILED" && "Pengiriman Gagal"}
                  </dd>
                </div>
                {shipment.estimatedDays && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Estimasi</dt>
                    <dd className="font-medium text-foreground">
                      {shipment.estimatedDays} hari kerja
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>

        {/* Kolom Kanan: Ringkasan Pembayaran */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <section
              aria-labelledby="summary-heading"
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h2
                id="summary-heading"
                className="mb-4 border-b border-border pb-3 text-base font-semibold text-foreground"
              >
                Ringkasan pembayaran
              </h2>

              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal produk</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    Rp {order.subtotal.toLocaleString("id-ID")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Ongkos kirim</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    Rp {order.shippingCost.toLocaleString("id-ID")}
                  </dd>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-success">Diskon</dt>
                    <dd className="font-medium tabular-nums text-success">
                      -Rp {order.discount.toLocaleString("id-ID")}
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-border pt-3 text-base">
                  <dt className="font-bold text-foreground">Total</dt>
                  <dd className="text-xl font-bold tabular-nums text-foreground">
                    Rp {order.totalAmount.toLocaleString("id-ID")}
                  </dd>
                </div>
              </dl>

              {order.payment && (
                <div className="mt-5 rounded-xl bg-surface-container-low p-4 text-xs">
                  <p className="text-muted-foreground">Metode Pembayaran</p>
                  <p className="mt-0.5 font-semibold capitalize text-foreground">
                    {order.payment.method}
                  </p>
                  {order.payment.paidAt && (
                    <p className="mt-2 text-muted-foreground">
                      Dibayar pada{" "}
                      {new Date(order.payment.paidAt).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>
              )}

              {order.status === "PENDING" && (
                <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs text-warning">
                  <p className="text-sm font-bold">Menunggu Pembayaran</p>
                  <p className="mt-1 text-muted-foreground">
                    Gunakan tombol <strong>Bayar Sekarang</strong> di atas untuk
                    segera menyelesaikan pembayaran Anda.
                  </p>
                </div>
              )}
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}

function getStatusMeta(status: string) {
  switch (status) {
    case "PENDING":
      return { label: "Menunggu Pembayaran", dot: "bg-warning" };
    case "PAID":
      return { label: "Pembayaran Berhasil", dot: "bg-success" };
    case "PROCESSING":
      return { label: "Sedang Diproses", dot: "bg-info" };
    case "SHIPPED":
      return { label: "Sedang Dikirim", dot: "bg-tertiary" };
    case "DELIVERED":
      return { label: "Pesanan Selesai", dot: "bg-success" };
    case "CANCELLED":
      return { label: "Dibatalkan", dot: "bg-error" };
    default:
      return { label: status, dot: "bg-muted-foreground" };
  }
}
