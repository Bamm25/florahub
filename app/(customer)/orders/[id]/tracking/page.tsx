"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  getOrderDetail,
  getOrderShipment,
  type Shipment,
} from "@/lib/api/orders";
import { ArrowLeft, Copy, Check } from "lucide-react";

// Interface untuk data order di halaman tracking pengiriman
interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      image: string;
    };
  }>;
  address: {
    recipientName: string;
    phone: string;
    fullAddress: string;
    city: string;
    province: string;
  } | null;
  payment: {
    status: string;
    paidAt: string | null;
  } | null;
}

// Interface untuk timeline event shipment status tracking
interface TimelineEvent {
  id: string;
  dateStr: string;
  timeStr: string;
  statusTitle: string;
  description: string;
  isLatest: boolean;
  stepCategory: "created" | "transit" | "delivering" | "delivered";
}

// Halaman tracking pengiriman dengan timeline dan stepper progress
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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedResi, setCopiedResi] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Redirect ke login jika belum auth, fetch order dan shipment data
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=/orders/${orderId}/tracking`);
      return;
    }

    async function loadTrackingData() {
      try {
        setIsLoading(true);
        const orderRes = await getOrderDetail(orderId);
        setOrder({
          ...orderRes.data.order,
          updatedAt:
            ("updatedAt" in orderRes.data.order ? (orderRes.data.order as { updatedAt?: string }).updatedAt : undefined) ||
            orderRes.data.order.createdAt,
        });

        try {
          const shipRes = await getOrderShipment(orderId);
          setShipment(shipRes.data.shipment);
        } catch {
          setShipment(null);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal memuat data pelacakan",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated") {
      loadTrackingData();
    }
  }, [authStatus, orderId, router]);

  // Copy nomor resi ke clipboard dengan feedback visual
  const handleCopyResi = (resi: string) => {
    navigator.clipboard.writeText(resi);
    setCopiedResi(true);
    setTimeout(() => setCopiedResi(false), 2000);
  };

  // Copy order ID ke clipboard dengan feedback visual
  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  // Render loading skeleton untuk tracking page
  if (authStatus === "loading" || isLoading) {
    return (
      <main className="container-custom section-spacing">
        <div className="h-6 w-32 animate-pulse rounded bg-surface-container mb-6" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface-container-low mb-6" />
        <div className="h-72 animate-pulse rounded-2xl bg-surface-container-low" />
      </main>
    );
  }

  // Render error state jika order tidak ditemukan
  if (errorMessage || !order) {
    return (
      <main className="container-custom section-spacing">
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-base font-semibold text-error">
            {errorMessage || "Pesanan tidak ditemukan"}
          </p>
          <div className="mt-5">
            <Link
              href={`/orders/${orderId}`}
              className="btn-primary h-10 px-5 text-sm"
            >
              Kembali ke Rincian Pesanan
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const customerCity = order.address?.city || "Surabaya";
  const courierName = shipment?.courier || "FloraHub Jatim Express";

  const createdDate = new Date(order.createdAt);
  const estDays = shipment?.estimatedDays || 2;
  const estimatedArrival = new Date(createdDate);
  estimatedArrival.setDate(createdDate.getDate() + estDays);

  const formattedEstArrival = estimatedArrival.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const isCancelled = order.status === "CANCELLED";
  const isDelivered =
    order.status === "DELIVERED" || shipment?.status === "DELIVERED";
  const isShipped =
    shipment?.status === "SHIPPED" ||
    shipment?.status === "IN_TRANSIT" ||
    (order.status === "SHIPPED" &&
      shipment?.status !== "PENDING" &&
      shipment?.status !== "PROCESSING");
  const isProcessing =
    order.status === "PROCESSING" ||
    shipment?.status === "PROCESSING" ||
    shipment?.status === "PENDING";

  let activeStep = 0;
  if (isDelivered) {
    activeStep = 3;
  } else if (isShipped) {
    activeStep = 2;
  } else if (isProcessing) {
    activeStep = 1;
  }

  const events: TimelineEvent[] = [];

  const formatEventDate = (d: Date) => ({
    dateStr: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
    timeStr: d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  // Perhitungan timeline waktu realistis & strictly ascending
  const startMs = createdDate.getTime();
  const deliveryDate = isDelivered
    ? shipment?.deliveredAt
      ? new Date(shipment.deliveredAt)
      : new Date()
    : null;
  const currentElapsedMs =
    isDelivered && deliveryDate
      ? Math.max(deliveryDate.getTime() - startMs, 60 * 1000)
      : Math.max(new Date(order.updatedAt || order.createdAt).getTime() - startMs, 60 * 1000);

  // Titik waktu perantara diproporsikan dari waktu riil agar selalu urut kronologis
  const processDate = new Date(startMs + Math.round(currentElapsedMs * 0.15));
  const firstMileDate = new Date(startMs + Math.round(currentElapsedMs * 0.4));
  const transitDate = new Date(startMs + Math.round(currentElapsedMs * 0.65));
  const outDate = new Date(startMs + Math.round(currentElapsedMs * 0.88));

  // Build timeline events berdasarkan order & shipment status aktual
  if (isCancelled) {
    const cancelDate = new Date(order.updatedAt);
    const { dateStr, timeStr } = formatEventDate(cancelDate);
    events.push({
      id: "ev-cancelled",
      dateStr,
      timeStr,
      statusTitle: "Pesanan Dibatalkan",
      description:
        "Pesanan telah dibatalkan. Jika Anda sudah melakukan pembayaran, dana akan dikembalikan dalam 3-7 hari kerja.",
      isLatest: true,
      stepCategory: "created",
    });
  }

  if (isDelivered && deliveryDate) {
    const { dateStr, timeStr } = formatEventDate(deliveryDate);
    events.push({
      id: "ev-delivered",
      dateStr,
      timeStr,
      statusTitle: "Pesanan Tiba di Alamat Tujuan",
      description: `Pesanan telah diterima oleh penerima (${order.address?.recipientName || "Penerima"}). Paket selesai diantar.`,
      isLatest: events.length === 0,
      stepCategory: "delivered",
    });
  }

  if (isDelivered || isShipped) {
    const { dateStr: outD, timeStr: outT } = formatEventDate(outDate);
    events.push({
      id: "ev-out",
      dateStr: outD,
      timeStr: outT,
      statusTitle: "Pesanan Dalam Proses Pengantaran",
      description: `Kurir ${courierName} sedang membawa paket menuju alamat tujuan Anda di Kota ${customerCity}.`,
      isLatest: events.length === 0,
      stepCategory: "delivering",
    });

    const { dateStr: trDate, timeStr: trTime } = formatEventDate(transitDate);
    events.push({
      id: "ev-hub-2",
      dateStr: trDate,
      timeStr: trTime,
      statusTitle: "Tiba di Hub Transit Jawa Timur",
      description:
        "Diproses di Hub Logistik Jawa Timur (Hub Surabaya Waru / Sidoarjo Gateway).",
      isLatest: events.length === 0,
      stepCategory: "transit",
    });

    const { dateStr: fmDate, timeStr: fmTime } = formatEventDate(firstMileDate);
    events.push({
      id: "ev-hub-1",
      dateStr: fmDate,
      timeStr: fmTime,
      statusTitle: "Diserahkan ke Jasa Kirim",
      description: `Paket bunga segar telah diserahkan oleh Florist ke ${courierName} First Mile Hub.`,
      isLatest: events.length === 0,
      stepCategory: "transit",
    });
  } else if (shipment?.trackingNumber) {
    const shipDate = new Date(("createdAt" in (shipment || {}) ? (shipment as { createdAt?: string }).createdAt : undefined) || createdDate);
    const { dateStr, timeStr } = formatEventDate(shipDate);
    events.push({
      id: "ev-awb-created",
      dateStr,
      timeStr,
      statusTitle: "Nomor Resi Diterbitkan & Menunggu Kurir",
      description: `Nomor resi ${shipment.trackingNumber} (${courierName}) telah diterbitkan. Paket bunga segar menunggu penjemputan oleh kurir.`,
      isLatest: events.length === 0,
      stepCategory: "transit",
    });
  }

  if (isDelivered || isShipped || isProcessing || order.status !== "PENDING") {
    const { dateStr, timeStr } = formatEventDate(processDate);
    events.push({
      id: "ev-proc",
      dateStr,
      timeStr,
      statusTitle: "Bunga Sedang Dirangkai & Dikemas",
      description:
        "Florist telah memotong dan merangkai bunga segar dengan kemasan berpendingin.",
      isLatest: events.length === 0,
      stepCategory: "created",
    });
  }

  const { dateStr: crDate, timeStr: crTime } = formatEventDate(createdDate);
  events.push({
    id: "ev-created",
    dateStr: crDate,
    timeStr: crTime,
    statusTitle: "Pesanan Berhasil Dibuat",
    description:
      "Pesanan telah dikonfirmasi dan pembayaran telah berhasil diverifikasi.",
    isLatest: events.length === 0,
    stepCategory: "created",
  });

  const steps = [
    { label: "Bunga Dirangkai", active: activeStep >= 1 },
    { label: "Dalam Perjalanan", active: activeStep >= 2 },
    { label: "Tiba di Tujuan", active: activeStep >= 3 },
  ];

  return (
    <main className="container-custom section-spacing">
      {/* Back button */}
      <nav aria-label="Navigasi" className="mb-6">
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Rincian Pesanan
        </Link>
      </nav>

      {/* Header Estimasi — aksen near-black */}
      <section
        aria-labelledby="tracking-heading"
        className="mb-8 rounded-2xl bg-[#10121b] p-6 text-white sm:p-8 border border-white/10"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Pelacakan Pengiriman
            </p>
            <h1
              id="tracking-heading"
              className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              {isCancelled
                ? "Pesanan Dibatalkan"
                : isDelivered
                  ? "Pesanan telah tiba di tujuan"
                  : `Estimasi tiba: ${formattedEstArrival}`}
            </h1>
            <p className="mt-1 text-xs text-white/70">
              Order #{order.orderNumber} · {courierName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyOrderId(order.orderNumber)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-medium text-white transition-colors hover:bg-white/10"
              title="Salin nomor pesanan"
            >
              {copiedOrderId ? (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Order ID</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stepper Progress Horizontal (tenang, tanpa glow) */}
        {!isCancelled && (
          <div className="mt-8 border-t border-white/10 pt-6">
            <ol className="grid grid-cols-3 gap-2">
              {steps.map((step, idx) => (
                <li key={step.label} className="text-left">
                  <div
                    className={`h-1.5 rounded-full ${
                      step.active ? "bg-primary" : "bg-white/15"
                    }`}
                  />
                  <p
                    className={`mt-2 text-xs ${
                      step.active
                        ? "font-semibold text-white"
                        : "text-white/40"
                    }`}
                  >
                    <span className="font-mono">{idx + 1}.</span> {step.label}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* Grid 2 Kolom: Detail Pengiriman & Timeline */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Kurir, Resi, Alamat */}
        <div className="space-y-6 lg:col-span-1">
          {/* Info Kurir & Resi */}
          <section
            aria-labelledby="courier-heading"
            className="rounded-2xl border border-border bg-card p-6"
          >
            <h2
              id="courier-heading"
              className="mb-4 border-b border-border pb-3 text-base font-semibold text-foreground"
            >
              Ekspedisi
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Jasa Kurir</p>
                <p className="font-semibold text-foreground">{courierName}</p>
                {shipment?.service && (
                  <p className="text-xs text-muted-foreground">
                    Layanan: {shipment.service}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Nomor Resi</p>
                {shipment?.trackingNumber ? (
                  <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-container-low px-3 py-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {shipment.trackingNumber}
                    </span>
                    <button
                      onClick={() => handleCopyResi(shipment.trackingNumber!)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      {copiedResi ? (
                        <>
                          <Check className="h-3 w-3 text-success" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="mt-0.5 text-xs italic text-muted-foreground">
                    Menunggu florist mencetak resi
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Alamat Pengiriman */}
          {order.address && (
            <section
              aria-labelledby="destination-heading"
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h2
                id="destination-heading"
                className="mb-3 border-b border-border pb-3 text-base font-semibold text-foreground"
              >
                Alamat tujuan
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
                {order.address.city}, {order.address.province}
              </p>
            </section>
          )}
        </div>

        {/* Kolom Kanan: Timeline Vertikal */}
        <section
          aria-labelledby="timeline-heading"
          className="rounded-2xl border border-border bg-card p-6 lg:col-span-2"
        >
          <h2
            id="timeline-heading"
            className="mb-6 border-b border-border pb-3 text-base font-semibold text-foreground"
          >
            Riwayat status pengiriman
          </h2>

          <ol className="relative ml-3 space-y-6 border-l border-border pl-6">
            {events.map((ev, index) => {
              const isFirst = index === 0;
              const isCancelledEvent = ev.id === "ev-cancelled";

              return (
                <li key={ev.id} className="relative">
                  {/* Titik indikator di garis timeline */}
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
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {ev.dateStr} · {ev.timeStr}
                    </p>
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
    </main>
  );
}
