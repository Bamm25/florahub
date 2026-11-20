"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import {
  confirmOrderDelivery,
  getOrderDetail,
  getOrderShipment,
  type OrderDetail,
  type Shipment,
  type ShipmentTrackingDetails,
} from "@/lib/api/orders";
import { ConfirmDialog, ErrorState, TrackingProgressTrack } from "@/components/ui";
import { buildOrderTrackingTimeline } from "@/lib/order-tracking-timeline";

const TRACKING_STEPS = [
  "Dirangkai",
  "Dalam Perjalanan",
  "Tiba",
] as const;

// Halaman pelacakan pengiriman editorial dengan breadcrumbs semantik dan timeline kurir
export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [trackingDetails, setTrackingDetails] =
    useState<ShipmentTrackingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedResi, setCopiedResi] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [showConfirmDelivery, setShowConfirmDelivery] = useState(false);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [confirmFeedback, setConfirmFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const resiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resiTimerRef.current) clearTimeout(resiTimerRef.current);
      if (orderTimerRef.current) clearTimeout(orderTimerRef.current);
    };
  }, []);

  const loadTrackingData = useCallback(
    async (options?: { signal?: AbortSignal; refresh?: boolean }) => {
      const signal = options?.signal;
      const isManualRefresh = Boolean(options?.refresh);

      try {
        if (isManualRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
          setErrorMessage(null);
        }

        const orderRes = await getOrderDetail(orderId, signal);
        if (signal?.aborted) return;
        setOrder(orderRes.data.order);

        try {
          const shipRes = await getOrderShipment(orderId, signal);
          if (!signal?.aborted) {
            setShipment(shipRes.data.shipment);
            setTrackingDetails(shipRes.data.tracking ?? null);
          }
        } catch {
          if (!signal?.aborted) {
            setShipment(null);
            setTrackingDetails(null);
          }
        }
      } catch (error) {
        if (
          signal?.aborted ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return;
        }
        if (!isManualRefresh) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat data pelacakan.",
          );
        }
      } finally {
        if (!signal?.aborted) {
          if (isManualRefresh) {
            setIsRefreshing(false);
          } else {
            setIsLoading(false);
          }
        }
      }
    },
    [orderId],
  );

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=/orders/${orderId}/tracking`);
      return;
    }

    if (authStatus !== "authenticated") {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadTrackingData({ signal: controller.signal });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [authStatus, orderId, router, loadTrackingData]);

  const handleCopyResi = async (resi: string) => {
    try {
      await navigator.clipboard.writeText(resi);
      setCopiedResi(true);
      if (resiTimerRef.current) clearTimeout(resiTimerRef.current);
      resiTimerRef.current = setTimeout(() => setCopiedResi(false), 2000);
    } catch {
      // Browser menolak akses clipboard
    }
  };

  const handleCopyOrderId = async (orderNumber: string) => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopiedOrderId(true);
      if (orderTimerRef.current) clearTimeout(orderTimerRef.current);
      orderTimerRef.current = setTimeout(() => setCopiedOrderId(false), 2000);
    } catch {
      // Browser menolak akses clipboard
    }
  };

  const handleConfirmDelivery = async () => {
    if (!order) return;
    try {
      setIsConfirmingDelivery(true);
      setConfirmFeedback(null);
      await confirmOrderDelivery(order.id);
      setShowConfirmDelivery(false);
      setConfirmFeedback({
        type: "success",
        message: "Pesanan dikonfirmasi diterima.",
      });
      await loadTrackingData({ refresh: true });
    } catch (error) {
      setShowConfirmDelivery(false);
      setConfirmFeedback({
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

  if (authStatus === "loading" || isLoading) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="container-custom section-spacing">
          <div className="mb-6 h-6 w-40 animate-pulse rounded bg-surface-container" />
          <div className="mb-6 h-44 animate-pulse rounded-2xl bg-surface-container-low" />
          <div className="h-72 animate-pulse rounded-2xl bg-surface-container-low" />
        </div>
      </main>
    );
  }

  if (errorMessage || !order) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="container-custom section-spacing space-y-4">
          <ErrorState
            title="Data Pelacakan Tidak Tersedia"
            error={errorMessage || "Pesanan tidak ditemukan."}
            onRetry={() => void loadTrackingData()}
          />
          <div className="flex justify-center">
            <Link
              href={`/orders/${orderId}`}
              className="btn-primary h-10 px-5 text-sm"
            >
              Rincian Pesanan
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const courierDisplayName = shipment?.courier
    ? shipment.courier.toUpperCase()
    : "Menunggu penugasan kurir";

  const createdDate = new Date(order.createdAt);
  const estDays = shipment?.estimatedDays || 2;
  const estimatedArrival = new Date(createdDate);
  estimatedArrival.setDate(createdDate.getDate() + estDays);

  const formattedEstArrival = estimatedArrival.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const isCancelled =
    order.status === "CANCELLED" ||
    shipment?.status === "CANCELLED";
  const isDelivered =
    order.status === "DELIVERED" || shipment?.status === "DELIVERED";
  const isShipped =
    shipment?.status === "SHIPPED" ||
    (order.status === "SHIPPED" &&
      shipment?.status !== "PENDING" &&
      shipment?.status !== "PROCESSING" &&
      shipment?.status !== "READY_TO_SHIP");
  const isProcessing =
    order.status === "PROCESSING" ||
    order.status === "READY_TO_SHIP" ||
    shipment?.status === "PROCESSING" ||
    shipment?.status === "READY_TO_SHIP" ||
    shipment?.status === "PENDING";

  let activeStepIndex = 0;
  if (isDelivered) {
    activeStepIndex = 2;
  } else if (isShipped) {
    activeStepIndex = 1;
  } else if (isProcessing || order.status === "PAID") {
    activeStepIndex = 0;
  }

  const canConfirmDelivery =
    order.status === "SHIPPED" && !isCancelled && !isDelivered;

  const events = buildOrderTrackingTimeline({
    order,
    shipment,
    remoteHistory: trackingDetails?.history ?? [],
  }).toSorted(
    (a, b) => b.timestampMs - a.timestampMs || b.phaseRank - a.phaseRank,
  );

  const hasValidTrackingLink = Boolean(
    trackingDetails?.link && trackingDetails.link.startsWith("https://"),
  );

  return (
    <main className="min-h-dvh bg-background pb-16 sm:pb-24">
      {/* Full-Bleed Dark Editorial Header Band */}
      <section
        aria-labelledby="tracking-heading"
        className="border-b border-white/10 bg-surface-dark py-8 text-white sm:py-12"
      >
        <div className="container-custom">
          {/* Breadcrumbs Semantik */}
          <nav aria-label="Breadcrumbs">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-white/60">
              <li>
                <Link
                  href="/orders"
                  className="underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  Pesanan
                </Link>
              </li>
              <li aria-hidden="true" className="text-white/35">
                /
              </li>
              <li>
                <Link
                  href={`/orders/${orderId}`}
                  className="font-mono underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  #{order.orderNumber}
                </Link>
              </li>
              <li aria-hidden="true" className="text-white/35">
                /
              </li>
              <li>
                <Link
                  href={`/orders/${orderId}/tracking`}
                  aria-current="page"
                  className="font-semibold text-white underline-offset-4 hover:underline"
                >
                  Pelacakan
                </Link>
              </li>
            </ol>
          </nav>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1
                id="tracking-heading"
                className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl"
              >
                {isCancelled ? (
                  "Pesanan Dibatalkan"
                ) : isDelivered ? (
                  "Pesanan Telah Tiba"
                ) : (
                  <>
                    Estimasi tiba{" "}
                    <span className="font-display font-normal italic text-kicker">
                      {formattedEstArrival}
                    </span>
                  </>
                )}
              </h1>
              <p className="mt-2 text-xs text-white/70 sm:text-sm">
                <span className="font-mono">#{order.orderNumber}</span> ·{" "}
                {courierDisplayName}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {canConfirmDelivery && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmFeedback(null);
                    setShowConfirmDelivery(true);
                  }}
                  className="btn-primary h-11 px-4 py-0 text-xs font-semibold sm:text-sm"
                >
                  Pesanan Diterima
                </button>
              )}

              {hasValidTrackingLink && trackingDetails?.link && (
                <a
                  href={trackingDetails.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-surface-dark transition-colors hover:bg-white/90 sm:text-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Peta Kurir</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => void handleCopyOrderId(order.orderNumber)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                {copiedOrderId ? (
                  <>
                    <Check
                      className="h-3.5 w-3.5 text-kicker"
                      aria-hidden="true"
                    />
                    <span role="status">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Salin No. Pesanan</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => void loadTrackingData({ refresh: true })}
                disabled={isRefreshing}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {isRefreshing && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                <span>{isRefreshing ? "Memperbarui..." : "Perbarui"}</span>
              </button>
            </div>
          </div>

          {/* 3-Step Shipping Progress Track */}
          {!isCancelled && (
            <TrackingProgressTrack
              steps={TRACKING_STEPS}
              activeStepIndex={activeStepIndex}
              isCompletedAll={isDelivered}
              ariaLabel="Tahap pengiriman"
              className="mt-8 pt-6"
            />
          )}
        </div>
      </section>

      {/* Grid 2 Kolom: Detail Kurir/Alamat & Timeline */}
      <div className="container-custom pt-8 sm:pt-10">
        <div aria-live="polite">
          {confirmFeedback && (
            <div
              role={confirmFeedback.type === "error" ? "alert" : "status"}
              className={`mb-6 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                confirmFeedback.type === "error"
                  ? "border-error/30 bg-error/10 text-error"
                  : "border-primary/30 bg-primary/10 text-foreground"
              }`}
            >
              <span>{confirmFeedback.message}</span>
              <button
                type="button"
                onClick={() => setConfirmFeedback(null)}
                className="text-xs font-semibold underline"
              >
                Tutup
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start xl:gap-12">
          {/* Kolom Kiri */}
          <div className="space-y-6">
            <section
              aria-labelledby="courier-heading"
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h2
                id="courier-heading"
                className="mb-4 border-b border-border pb-3 text-base font-semibold text-foreground"
              >
                Pengiriman
              </h2>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Kurir</dt>
                  <dd className="mt-0.5 font-semibold text-foreground">
                    {courierDisplayName}
                    {shipment?.service ? (
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        ({shipment.service})
                      </span>
                    ) : null}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted-foreground">Nomor Resi</dt>
                  <dd className="mt-1">
                    {shipment?.trackingNumber ? (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-container-low px-3.5 py-2.5">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {shipment.trackingNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void handleCopyResi(shipment.trackingNumber!)
                          }
                          aria-label={`Salin nomor resi ${shipment.trackingNumber}`}
                          className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                        >
                          {copiedResi ? (
                            <>
                              <Check className="h-3 w-3" aria-hidden="true" />
                              <span role="status">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" aria-hidden="true" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Menunggu resi dari florist
                      </p>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            {order.address && (
              <section
                aria-labelledby="destination-heading"
                className="rounded-2xl border border-border bg-card p-6"
              >
                <h2
                  id="destination-heading"
                  className="mb-3 border-b border-border pb-3 text-base font-semibold text-foreground"
                >
                  Alamat Tujuan
                </h2>
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
                  {order.address.city}, {order.address.province}
                </p>
              </section>
            )}
          </div>

          {/* Kolom Kanan: Timeline Vertikal */}
          <section
            aria-labelledby="timeline-heading"
            className="rounded-2xl border border-border bg-card p-6 sm:p-7"
          >
            <h2
              id="timeline-heading"
              className="mb-6 border-b border-border pb-3 text-base font-semibold text-foreground"
            >
              Riwayat Pengiriman
            </h2>

            <ol className="relative ml-3 space-y-6 border-l border-border pl-6">
              {events.map((ev, index) => {
                const isFirst = index === 0;
                const isCancelledEvent = Boolean(ev.isCancelled);

                return (
                  <li key={ev.id} className="relative">
                    <span
                      className={`absolute -left-[31px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card ${
                        isCancelledEvent
                          ? "bg-error"
                          : isFirst
                            ? "bg-primary"
                            : "bg-border"
                      }`}
                      aria-hidden="true"
                    />

                    <div className="min-w-0">
                      <time
                        dateTime={ev.isoDate}
                        className="block text-xs tabular-nums text-muted-foreground"
                      >
                        {ev.dateStr} · {ev.timeStr}
                      </time>
                      <p
                        className={`mt-0.5 text-sm ${
                          isCancelledEvent
                            ? "font-semibold text-error"
                            : isFirst
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/80"
                        }`}
                      >
                        {ev.statusTitle}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {ev.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>

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
