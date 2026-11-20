"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Check, Copy, Loader2 } from "lucide-react";
import {
  confirmOrderDelivery,
  getOrderDetail,
  getOrderShipment,
  cancelOrder,
  type OrderDetail,
  type Shipment,
} from "@/lib/api/orders";
import { createPaymentToken } from "@/lib/api/customer";
import { ConfirmDialog, LoadingSpinner, ErrorState } from "@/components/ui";
import Modal from "@/components/forms/Modal";
import { formatDateTime, formatRupiah } from "@/lib/utils/formatters";
import { buildOrderSupportMailto } from "@/lib/config/domain";

const ORDER_STEPS = ["Dibuat", "Dibayar", "Diproses", "Dikirim", "Selesai"] as const;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Transfer Bank",
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  credit_card: "Kartu Kredit",
  cstore: "Gerai Retail",
  echannel: "Mandiri Bill",
};

function getOrderStepIndex(status: string): number {
  switch (status) {
    case "PENDING":
      return 0;
    case "PAID":
      return 1;
    case "PROCESSING":
    case "READY_TO_SHIP":
      return 2;
    case "SHIPPED":
      return 3;
    case "DELIVERED":
      return 4;
    default:
      return 0;
  }
}

function formatPaymentMethod(method: string): string {
  const key = method.trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[key] ?? "Pembayaran Online";
}

function formatShipmentStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "Menunggu Pickup";
    case "PROCESSING":
      return "Sedang Diproses";
    case "READY_TO_SHIP":
      return "Siap Dikirim";
    case "SHIPPED":
      return "Dalam Perjalanan";
    case "DELIVERED":
      return "Sudah Diterima";
    case "CANCELLED":
      return "Pengiriman Dibatalkan";
    default:
      return status;
  }
}

// Halaman detail pesanan editorial dengan pelacakan progres, rincian produk, dan ringkasan pembayaran
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
  const [paymentFeedback, setPaymentFeedback] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [showConfirmDelivery, setShowConfirmDelivery] = useState(false);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [deliveryFeedback, setDeliveryFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRetry = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=/orders/${orderId}`);
      return;
    }

    if (status !== "authenticated") {
      return;
    }

    const controller = new AbortController();

    async function loadOrder() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getOrderDetail(orderId, controller.signal);
        if (controller.signal.aborted) return;
        setOrder(response.data.order);

        try {
          const shipmentRes = await getOrderShipment(orderId, controller.signal);
          if (!controller.signal.aborted) {
            setShipment(shipmentRes.data.shipment);
          }
        } catch {
          if (!controller.signal.aborted) {
            setShipment(null);
          }
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return;
        }
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal memuat pesanan.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();
    return () => controller.abort();
  }, [status, orderId, router, refreshKey]);

  const handleRefreshOrder = async () => {
    try {
      setIsRefreshing(true);
      const result = await getOrderDetail(orderId);
      if (result.success) {
        setOrder(result.data.order);
      }
      try {
        const shipmentRes = await getOrderShipment(orderId);
        setShipment(shipmentRes.data.shipment);
      } catch {
        // Pengiriman belum dibuat atau belum tersedia
      }
    } catch {
      // Abaikan gangguan sementara saat refresh manual
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mulai transaksi Snap untuk pesanan PENDING
  const handlePayNow = async () => {
    if (!order) return;
    setPaymentFeedback(null);
    try {
      setIsPaying(true);
      const res = await createPaymentToken(order.id);
      const snapToken = res.data.token;
      if (typeof window !== "undefined" && window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: function (): void {
            void handleRefreshOrder();
          },
          onPending: function (): void {
            void handleRefreshOrder();
          },
          onError: function (): void {
            setPaymentFeedback("Pembayaran gagal. Silakan coba lagi.");
          },
          onClose: function (): void {
            // Popup ditutup oleh pembeli
          },
        });
      } else {
        setPaymentFeedback(
          "Layanan pembayaran belum siap. Muat ulang halaman lalu coba lagi.",
        );
      }
    } catch (err) {
      setPaymentFeedback(
        err instanceof Error ? err.message : "Gagal menyiapkan pembayaran.",
      );
    } finally {
      setIsPaying(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!order) return;
    try {
      setIsCancelling(true);
      setCancelError(null);
      await cancelOrder(order.id);
      setShowCancelModal(false);
      setOrder((prev) => (prev ? { ...prev, status: "CANCELLED" } : prev));
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "Gagal membatalkan pesanan.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!order) return;
    try {
      setIsConfirmingDelivery(true);
      setDeliveryFeedback(null);
      await confirmOrderDelivery(order.id);
      setShowConfirmDelivery(false);
      await handleRefreshOrder();
      setDeliveryFeedback({
        type: "success",
        message:
          "Pesanan selesai. Anda kini dapat menulis ulasan pada produk yang dibeli.",
      });
    } catch (error) {
      setShowConfirmDelivery(false);
      setDeliveryFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengonfirmasi penerimaan pesanan.",
      });
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  const handleCopyTracking = async (trackingNumber: string) => {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopiedTracking(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopiedTracking(false);
      }, 2000);
    } catch {
      // Browser menolak akses clipboard
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="container-custom section-spacing">
          <LoadingSpinner message="Memuat detail pesanan..." />
        </div>
      </main>
    );
  }

  if (errorMessage || !order) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="container-custom section-spacing space-y-4">
          <ErrorState
            title="Pesanan Tidak Dapat Dimuat"
            error={
              errorMessage ||
              "Pesanan tidak ditemukan atau nomor referensi tidak valid."
            }
            onRetry={handleRetry}
          />
          <div className="flex justify-center gap-3">
            <Link href="/orders" className="btn-secondary h-10 px-5 text-sm">
              Riwayat Pesanan
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
  const showProgressTrack = order.status !== "CANCELLED";
  const currentStepIndex = getOrderStepIndex(order.status);
  const activeShipment = shipment ?? order.shipment ?? null;
  const canConfirmDelivery = order.status === "SHIPPED";
  const canTrackShipment =
    order.status !== "PENDING" &&
    order.status !== "CANCELLED";

  return (
    <main className="min-h-dvh bg-background pb-16 sm:pb-24">
      {/* Full-Bleed Dark Editorial Header Band */}
      <section
        aria-labelledby="order-status-heading"
        className="border-b border-white/10 bg-surface-dark py-8 text-white sm:py-12"
      >
        <div className="container-custom">
          <nav
            aria-label="Navigasi"
            className="flex flex-wrap items-center gap-2 text-xs text-white/60"
          >
            <Link href="/orders" className="transition-colors hover:text-white">
              Pesanan
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-mono text-white/90">
              #{order.orderNumber}
            </span>
          </nav>

          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold">
                <span
                  className={`h-2 w-2 rounded-full ${statusMeta.dot}`}
                  aria-hidden="true"
                />
                <span className="text-white">{statusMeta.label}</span>
              </div>

              <h1
                id="order-status-heading"
                className="mt-3 font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl"
              >
                #{order.orderNumber}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
                <span>{formatDateTime(order.createdAt)}</span>
                {order.florist && (
                  <>
                    <span aria-hidden="true">·</span>
                    <Link
                      href={`/stores/${order.florist.id}`}
                      className="inline-flex items-center gap-1.5 font-medium text-kicker underline-offset-4 hover:text-white hover:underline"
                    >
                      <span>{order.florist.shopName}</span>
                      {order.florist.city ? (
                        <span className="text-white/60">
                          ({order.florist.city})
                        </span>
                      ) : null}
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="flex flex-wrap items-center gap-2.5">
              {order.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    onClick={handlePayNow}
                    disabled={isPaying}
                    className="btn-primary h-11 px-5 py-0 text-sm font-semibold disabled:opacity-50"
                  >
                    {isPaying ? "Menyiapkan..." : "Bayar Sekarang"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCancelError(null);
                      setShowCancelModal(true);
                    }}
                    className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4 text-sm font-medium text-white/85 transition-colors hover:border-error/40 hover:bg-error/10 hover:text-error"
                  >
                    Batalkan
                  </button>
                </>
              )}

              {canConfirmDelivery && (
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryFeedback(null);
                    setShowConfirmDelivery(true);
                  }}
                  className="btn-primary h-11 px-5 py-0 text-sm font-semibold"
                >
                  Pesanan Diterima
                </button>
              )}

              {canTrackShipment && (
                <Link
                  href={`/orders/${order.id}/tracking`}
                  className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-surface-dark transition-colors hover:bg-white/90"
                >
                  Lacak Pengiriman
                </Link>
              )}

              <button
                type="button"
                onClick={handleRefreshOrder}
                disabled={isRefreshing}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {isRefreshing && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                <span>{isRefreshing ? "Memperbarui..." : "Perbarui"}</span>
              </button>
            </div>
          </div>

          {/* 5-Step Progress Track */}
          {showProgressTrack && (
            <ol
              aria-label="Progres pesanan"
              className="mt-8 grid grid-cols-5 gap-2 border-t border-white/10 pt-6"
            >
              {ORDER_STEPS.map((label, idx) => {
                const isDone = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <li
                    key={label}
                    aria-current={isCurrent ? "step" : undefined}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
                          isDone || isCurrent
                            ? "border-kicker bg-kicker text-surface-dark"
                            : "border-white/20 bg-white/5 text-white/45"
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      {idx < ORDER_STEPS.length - 1 && (
                        <span
                          aria-hidden="true"
                          className={`hidden h-px flex-1 sm:block ${
                            isDone ? "bg-kicker" : "bg-white/15"
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isCurrent
                          ? "text-kicker"
                          : isDone
                            ? "text-white/90"
                            : "text-white/45"
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <div className="container-custom pt-8 sm:pt-10">
        <div aria-live="polite" className="space-y-4">
          {deliveryFeedback && (
            <div
              role={deliveryFeedback.type === "error" ? "alert" : "status"}
              className={`mb-6 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                deliveryFeedback.type === "error"
                  ? "border-error/30 bg-error/10 text-error"
                  : "border-primary/30 bg-primary/10 text-foreground"
              }`}
            >
              <span>{deliveryFeedback.message}</span>
              <button
                type="button"
                onClick={() => setDeliveryFeedback(null)}
                className="text-xs font-semibold underline"
              >
                Tutup
              </button>
            </div>
          )}

          {paymentFeedback && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            >
              <span>{paymentFeedback}</span>
              <button
                type="button"
                onClick={() => setPaymentFeedback(null)}
                className="text-xs font-semibold underline"
              >
                Tutup
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:gap-12">
          {/* Kolom Kiri */}
          <div className="space-y-6">
            {/* Rincian Produk */}
            <section
              aria-labelledby="items-heading"
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
                <h2
                  id="items-heading"
                  className="text-base font-semibold text-foreground"
                >
                  Rincian Produk
                </h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {order.florist && (
                    <Link
                      href={`/stores/${order.florist.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {order.florist.shopName}
                    </Link>
                  )}
                  <span className="tabular-nums">{order.items.length} item</span>
                </div>
              </div>

              <ul className="divide-y divide-border">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
                  >
                    {item.product.image ? (
                      <div className="relative aspect-[4/5] h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-container-low">
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
                        className="flex aspect-[4/5] h-20 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-container-low text-xs text-muted-foreground"
                        aria-hidden="true"
                      >
                        Foto
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      {item.product.slug ? (
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="block truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {item.product.name}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.product.name}
                        </p>
                      )}
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {item.quantity} × {formatRupiah(item.price)}
                      </p>
                      {order.status === "DELIVERED" && item.product.slug && (
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="mt-1.5 inline-flex items-center text-xs font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          Tulis Ulasan
                          <span className="sr-only"> untuk {item.product.name}</span>
                        </Link>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {formatRupiah(item.subtotal)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            {/* Catatan Pesanan */}
            {order.notes?.trim() && (
              <section
                aria-labelledby="notes-heading"
                className="rounded-2xl border border-border bg-card p-6"
              >
                <h2
                  id="notes-heading"
                  className="mb-3 border-b border-border pb-3 text-base font-semibold text-foreground"
                >
                  Catatan Pesanan
                </h2>
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground">
                  {order.notes}
                </p>
              </section>
            )}

            {/* Alamat Pengiriman */}
            {order.address && (
              <section
                aria-labelledby="address-heading"
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <h2
                    id="address-heading"
                    className="text-base font-semibold text-foreground"
                  >
                    Alamat Pengiriman
                  </h2>
                  <span className="rounded-full border border-border bg-surface-container-low px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {order.address.label}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {order.address.recipientName}
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="font-normal tabular-nums text-muted-foreground">
                    {order.address.phone}
                  </span>
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {order.address.fullAddress}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.address.city}, {order.address.province}{" "}
                  {order.address.postalCode}
                </p>
              </section>
            )}

            {/* Info Pengiriman */}
            {activeShipment && (
              <section
                aria-labelledby="shipment-heading"
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                  <h2
                    id="shipment-heading"
                    className="text-base font-semibold text-foreground"
                  >
                    Pengiriman
                  </h2>
                  <Link
                    href={`/orders/${order.id}/tracking`}
                    className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Lacak →
                  </Link>
                </div>

                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Kurir</dt>
                    <dd className="mt-0.5 font-medium uppercase text-foreground">
                      {activeShipment.courier}
                      {activeShipment.service
                        ? ` (${activeShipment.service})`
                        : ""}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-muted-foreground">Status</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {formatShipmentStatus(activeShipment.status)}
                    </dd>
                  </div>

                  {activeShipment.trackingNumber && (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        No. Resi
                      </dt>
                      <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {activeShipment.trackingNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void handleCopyTracking(
                              activeShipment.trackingNumber!,
                            )
                          }
                          aria-label={`Salin nomor resi ${activeShipment.trackingNumber}`}
                          className="inline-flex min-h-7 items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low"
                        >
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          <span>Salin</span>
                        </button>
                        {copiedTracking && (
                          <span
                            role="status"
                            className="text-xs font-medium text-primary"
                          >
                            Disalin
                          </span>
                        )}
                      </dd>
                    </div>
                  )}

                  {activeShipment.estimatedDays && (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Estimasi
                      </dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                        {activeShipment.estimatedDays} hari kerja
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}
          </div>

          {/* Kolom Kanan: Ringkasan Pembayaran Gelap Sticky */}
          <aside className="lg:sticky lg:top-24">
            <section
              aria-labelledby="summary-heading"
              className="overflow-hidden rounded-2xl border border-white/10 bg-surface-dark p-6 text-white sm:p-7"
            >
              <h2
                id="summary-heading"
                className="text-xl font-bold tracking-tight text-white"
              >
                Ringkasan Pembayaran
              </h2>

              <dl className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm">
                <div className="flex justify-between text-white/75">
                  <dt>Subtotal</dt>
                  <dd className="font-semibold tabular-nums text-white">
                    {formatRupiah(order.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between text-white/75">
                  <dt>Ongkos kirim</dt>
                  <dd className="font-semibold tabular-nums text-white">
                    {formatRupiah(order.shippingCost)}
                  </dd>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <dt>Diskon</dt>
                    <dd className="font-semibold tabular-nums">
                      -{formatRupiah(order.discount)}
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-white/10 pt-4 text-base">
                  <dt className="font-medium text-white/75">Total</dt>
                  <dd className="text-2xl font-extrabold tabular-nums text-white">
                    {formatRupiah(order.totalAmount)}
                  </dd>
                </div>
              </dl>

              {order.payment && (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-xs">
                  <p className="text-white/60">Metode Pembayaran</p>
                  <p className="mt-0.5 font-semibold text-white">
                    {formatPaymentMethod(order.payment.method)}
                  </p>
                  {order.payment.paidAt && (
                    <p className="mt-2 tabular-nums text-white/60">
                      Dibayar · {formatDateTime(order.payment.paidAt)}
                    </p>
                  )}
                </div>
              )}

              {order.status === "PENDING" && (
                <div className="mt-6 space-y-2.5">
                  <button
                    type="button"
                    onClick={handlePayNow}
                    disabled={isPaying}
                    className="btn-primary w-full text-sm font-semibold tabular-nums disabled:opacity-50"
                  >
                    {isPaying ? (
                      <span>Menyiapkan...</span>
                    ) : (
                      <span>Bayar · {formatRupiah(order.totalAmount)}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCancelError(null);
                      setShowCancelModal(true);
                    }}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/15 px-4 text-xs font-semibold text-white/80 transition-colors hover:border-error/40 hover:bg-error/10 hover:text-error"
                  >
                    Batalkan Pesanan
                  </button>
                </div>
              )}

              {canConfirmDelivery && (
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryFeedback(null);
                    setShowConfirmDelivery(true);
                  }}
                  className="btn-primary mt-6 w-full text-sm font-semibold"
                >
                  Pesanan Diterima
                </button>
              )}

              {canTrackShipment && (
                <Link
                  href={`/orders/${order.id}/tracking`}
                  className={`${canConfirmDelivery ? "mt-2.5" : "mt-6"} inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-surface-dark transition-colors hover:bg-white/90`}
                >
                  Lacak Pengiriman
                </Link>
              )}

              <div className="mt-5 border-t border-white/10 pt-4 text-center text-xs text-white/60">
                Ada kendala dengan pesanan ini?{" "}
                <a
                  href={buildOrderSupportMailto(order.orderNumber)}
                  className="font-semibold text-kicker underline-offset-4 hover:text-white hover:underline"
                >
                  Hubungi Bantuan &amp; Pengaduan
                </a>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* Modal Konfirmasi Batalkan Pesanan */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => !isCancelling && setShowCancelModal(false)}
        title="Batalkan Pesanan?"
        size="sm"
        footer={
          <>
            <button
              type="button"
              autoFocus
              onClick={() => setShowCancelModal(false)}
              disabled={isCancelling}
              className="btn-secondary h-10 flex-1 py-0 text-sm disabled:opacity-50"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="h-10 flex-1 rounded-xl bg-error px-4 text-sm font-semibold text-white transition-colors hover:bg-error/90 disabled:opacity-50"
            >
              {isCancelling ? "Membatalkan..." : "Ya, Batalkan"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pesanan{" "}
            <span className="font-mono font-semibold text-foreground">
              #{order.orderNumber}
            </span>{" "}
            akan dibatalkan dan stok produk dikembalikan.
          </p>

          {cancelError && (
            <div
              role="alert"
              className="rounded-xl border border-error/30 bg-error/10 p-3 text-xs text-error"
            >
              {cancelError}
            </div>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={showConfirmDelivery}
        onClose={() => !isConfirmingDelivery && setShowConfirmDelivery(false)}
        onConfirm={handleConfirmDelivery}
        title="Konfirmasi pesanan diterima?"
        description="Pastikan bunga sudah diterima dengan baik. Setelah dikonfirmasi, pesanan selesai dan Anda dapat menulis ulasan."
        confirmLabel="Ya, Sudah Diterima"
        cancelLabel="Batal"
        loading={isConfirmingDelivery}
      />
    </main>
  );
}

function getStatusMeta(status: string) {
  switch (status) {
    case "PENDING":
      return { label: "Belum Bayar", dot: "bg-warning" };
    case "PAID":
      return { label: "Dibayar", dot: "bg-success" };
    case "PROCESSING":
      return { label: "Diproses", dot: "bg-info" };
    case "READY_TO_SHIP":
      return { label: "Siap Dikirim", dot: "bg-info" };
    case "SHIPPED":
      return { label: "Dikirim", dot: "bg-tertiary" };
    case "DELIVERED":
      return { label: "Selesai", dot: "bg-success" };
    case "CANCELLED":
      return { label: "Dibatalkan", dot: "bg-error" };
    default:
      return { label: status, dot: "bg-muted-foreground" };
  }
}
