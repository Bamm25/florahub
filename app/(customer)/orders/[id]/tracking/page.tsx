"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getOrderDetail,
  getOrderShipment,
  type Shipment,
} from "@/lib/api/orders";
import {
  ArrowLeft,
  Copy,
  Check,
  CheckCircle2,
  MapPin,
  XCircle,
} from "lucide-react";
import Link from "next/link";

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
  const [copied, setCopied] = useState(false);
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
          updatedAt: (orderRes.data.order as any).updatedAt || orderRes.data.order.createdAt,
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy order ID ke clipboard dengan feedback visual
  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  // Render loading skeleton untuk tracking page
  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container-custom py-8">
        <div className="h-8 w-40 animate-pulse rounded bg-surface-container" />
        <div className="mt-4 h-32 animate-pulse rounded-xl bg-surface-container" />
        <div className="mt-4 h-64 animate-pulse rounded-xl bg-surface-container" />
      </div>
    );
  }

  // Render error state jika order tidak ditemukan
  if (errorMessage || !order) {
    return (
      <div className="container-custom section-spacing">
        <div className="card-elevated text-center max-w-2xl mx-auto">
          <p className="text-error mb-4">{errorMessage || "Pesanan tidak ditemukan"}</p>
          <button
            onClick={() => router.push(`/orders/${orderId}`)}
            className="btn-primary"
          >
            Kembali ke Rincian Pesanan
          </button>
        </div>
      </div>
    );
  }

  const customerCity = order.address?.city || "Surabaya";
  const courierName = shipment?.courier || "FloraHub Jatim Express";

  const createdDate = new Date(order.createdAt);
  const estDays = shipment?.estimatedDays || 2;
  const estimatedArrival = new Date(createdDate);
  estimatedArrival.setDate(createdDate.getDate() + estDays);

  const formattedEstArrival = estimatedArrival.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });

  const isCancelled = order.status === "CANCELLED";
  let activeStep = 1;
  const isDelivered =
    order.status === "DELIVERED" || shipment?.status === "DELIVERED";
  const isOutForDelivery =
    shipment?.status === "IN_TRANSIT" || order.status === "SHIPPED";

  if (isDelivered) {
    activeStep = 3;
  } else if (isOutForDelivery) {
    activeStep = 2;
  }

  const events: TimelineEvent[] = [];

  const formatEventDate = (d: Date) => ({
    dateStr: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
    timeStr: d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  // Build timeline events berdasarkan order status untuk display riwayat
  if (isCancelled) {
    const cancelDate = new Date(order.updatedAt);
    const { dateStr, timeStr } = formatEventDate(cancelDate);
    events.push({
      id: "ev-cancelled",
      dateStr,
      timeStr,
      statusTitle: "Pesanan Dibatalkan",
      description: "Pesanan telah dibatalkan. Jika Anda sudah melakukan pembayaran, dana akan dikembalikan dalam 3-7 hari kerja.",
      isLatest: true,
      stepCategory: "created",
    });
  }

  if (isDelivered) {
    const deliveryDate = shipment?.deliveredAt
      ? new Date(shipment.deliveredAt)
      : new Date();
    const { dateStr, timeStr } = formatEventDate(deliveryDate);
    events.push({
      id: "ev-delivered",
      dateStr,
      timeStr,
      statusTitle: "Pesanan Tiba di Alamat Tujuan",
      description: `Pesanan telah diterima oleh penerima (${order.address?.recipientName || "Yang Bersangkutan"}). Paket selesai diantar.`,
      isLatest: events.length === 0,
      stepCategory: "delivered",
    });
  }

  if (isDelivered || isOutForDelivery) {
    const outDate = new Date(createdDate.getTime() + 14 * 3600 * 1000);
    const { dateStr, timeStr } = formatEventDate(outDate);
    events.push({
      id: "ev-out",
      dateStr,
      timeStr,
      statusTitle: "Pesanan Dalam Proses Pengantaran",
      description: `Kurir ${courierName} sedang membawa paket menuju alamat tujuan Anda di Kota ${customerCity}.`,
      isLatest: events.length === 0,
      stepCategory: "delivering",
    });
  }

  if (isDelivered || isOutForDelivery || shipment) {
    const transitDate = new Date(createdDate.getTime() + 8 * 3600 * 1000);
    const { dateStr, timeStr } = formatEventDate(transitDate);
    events.push({
      id: "ev-hub-2",
      dateStr,
      timeStr,
      statusTitle: "Tiba di Hub Transit Jawa Timur",
      description: `Diproses di Hub Logistik Jawa Timur (Hub Surabaya Waru / Sidoarjo Gateway).`,
      isLatest: events.length === 0,
      stepCategory: "transit",
    });

    const firstMileDate = new Date(createdDate.getTime() + 4 * 3600 * 1000);
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
  }

  if (order.status !== "PENDING") {
    const processDate = new Date(createdDate.getTime() + 1 * 3600 * 1000);
    const { dateStr, timeStr } = formatEventDate(processDate);
    events.push({
      id: "ev-proc",
      dateStr,
      timeStr,
      statusTitle: "Bunga Sedang Dirangkai & Dikemas",
      description: "Florist telah memotong dan merangkai bunga segar dengan kemasan berpendingin.",
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
    description: "Pesanan telah dikonfirmasi dan pembayaran telah berhasil diverifikasi.",
    isLatest: events.length === 0,
    stepCategory: "created",
  });

  return (
    <div className="min-h-screen bg-surface-container-low pb-16">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface px-4 py-3 shadow-sm">
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="rounded-full p-1.5 text-muted-foreground transition hover:bg-surface-container"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-foreground">Status Pengiriman</h1>
      </div>

      <div className="container-custom pt-6 pb-8 space-y-5">
        {/* Order ID Copy Section */}
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Order ID</span>
            <span className="text-xs text-muted-foreground">ID Referensi Transaksi</span>
          </div>
          
          <div className="flex items-center gap-3">
            <code className="flex-1 text-base font-mono font-semibold text-foreground bg-surface px-3 py-2 rounded border border-border">
              {order.orderNumber}
            </code>
            
            <button
              onClick={() => handleCopyOrderId(order.orderNumber)}
              className="btn-outline flex items-center gap-2 text-sm px-4 py-2 whitespace-nowrap"
              title="Salin Order ID"
            >
              {copiedOrderId ? (
                <>
                  <Check className="w-4 h-4 text-success" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin ID</span>
                </>
              )}
            </button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Gunakan Order ID ini untuk mencari atau memfilter pesanan di menu Riwayat Pesanan.
          </p>
        </div>

        {/* 1. Header Estimasi & Horizontal Stepper */}
        <div className="card-elevated p-6">
          <div className="mb-5">
            <p className="text-xl font-bold text-foreground leading-tight">
              {isDelivered
                ? "Pesanan telah tiba di tujuan"
                : `Pesanan tiba pada ${formattedEstArrival}`}
            </p>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">
              Marketplace Multi-Florist • Area Service Jawa Timur
            </p>
            {!isDelivered && (
              <p className="text-xs text-muted-foreground mt-2">
                * Estimasi pengiriman dapat berubah tergantung kondisi kurir
              </p>
            )}
          </div>

          <div className="relative mt-7 px-4">
            <div className="absolute left-10 right-10 top-3.5 h-1 bg-border -z-0 rounded-full">
              <div
                className="h-full bg-success transition-all duration-500 rounded-full"
                style={{
                  width:
                    activeStep === 1 ? "0%" : activeStep === 2 ? "50%" : "100%",
                }}
              />
            </div>

            <div className="flex justify-between items-center relative z-10">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white transition shadow-sm ${
                    activeStep >= 1
                      ? "bg-success ring-4 ring-success/20"
                      : "bg-muted-foreground/40"
                  }`}
                >
                  <Check className="h-4 w-4" />
                </div>
                <span
                  className={`mt-2.5 text-center text-[13px] font-medium leading-tight ${
                    activeStep >= 1
                      ? "text-success font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  Sedang Dikirim
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white transition shadow-sm ${
                    activeStep >= 2
                      ? "bg-success ring-4 ring-success/20"
                      : "bg-muted-foreground/40"
                  }`}
                >
                  {activeStep >= 2 ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
                <span
                  className={`mt-2.5 text-center text-[13px] font-medium leading-tight ${
                    activeStep >= 2
                      ? "text-success font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  Menuju Alamatmu
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white transition shadow-sm ${
                    activeStep === 3
                      ? "bg-success ring-4 ring-success/20"
                      : "bg-muted-foreground/40"
                  }`}
                >
                  {activeStep === 3 ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
                <span
                  className={`mt-2.5 text-center text-[13px] font-medium leading-tight ${
                    activeStep === 3
                      ? "text-success font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  Pesanan Tiba
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Kartu Kurir & Nomor Resi */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={order.items[0]?.product.image || "/placeholder.png"}
                alt={order.items[0]?.product.name || "Produk"}
                className="h-14 w-14 rounded-lg border border-border object-cover shadow-sm"
              />
              <div>
                <p className="text-sm font-bold text-foreground">{courierName}</p>
                <div className="mt-1">
                  {shipment?.trackingNumber ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">No. Resi:</span>
                      <span className="font-mono text-xs text-foreground/80 font-medium">
                        {shipment.trackingNumber}
                      </span>
                      <button
                        onClick={() => handleCopyResi(shipment.trackingNumber!)}
                        className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2 py-1 text-[11px] font-semibold text-foreground/80 hover:bg-surface-container-low transition"
                        title="Salin Nomor Resi"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3 text-success" />
                            <span className="text-success">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Salin Resi</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Nomor resi belum tersedia — menunggu florist memproses pesanan
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link
              href={`/orders/${orderId}`}
              className="whitespace-nowrap rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-foreground/80 transition hover:bg-surface-container-low shadow-sm"
            >
              Rincian Pesanan
            </Link>
          </div>
        </div>

        {/* 3. Timeline Vertikal */}
        <div className="card-elevated p-6">
          <h2 className="text-base font-bold text-foreground border-b border-border pb-3 mb-5">
            Riwayat Pengiriman
          </h2>

          <div className="relative pl-7 space-y-7">
            <div className="absolute left-[13px] top-3 bottom-3 w-[3px] bg-border rounded-full" />

            {events.map((ev, index) => {
              const isFirst = index === 0;
              const isCancelledEvent = ev.id === "ev-cancelled";

              return (
                <div key={ev.id} className="relative flex items-start gap-4">
                  <div className="absolute -left-7 mt-0.5">
                    {isCancelledEvent ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-error/10 text-error ring-4 ring-error/20 shadow-sm">
                        <XCircle className="h-4.5 w-4.5" />
                      </div>
                    ) : isFirst ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success text-white ring-4 ring-success/20 shadow-sm">
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </div>
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-muted-foreground/50 ring-2 ring-white shadow-sm" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          isCancelledEvent
                            ? "text-error"
                            : isFirst
                              ? "text-success"
                              : "text-muted-foreground"
                        }`}
                      >
                        {ev.dateStr} • {ev.timeStr}
                      </span>
                    </div>

                    <p
                      className={`mt-1.5 text-sm leading-snug ${
                        isCancelledEvent
                          ? "font-bold text-error"
                          : isFirst
                            ? "font-bold text-foreground"
                            : "font-semibold text-foreground/90"
                      }`}
                    >
                      {ev.statusTitle}
                    </p>

                    <p
                      className={`mt-1 text-xs leading-relaxed ${
                        isCancelledEvent
                          ? "text-error/80"
                          : isFirst
                            ? "text-foreground/80"
                            : "text-muted-foreground"
                      }`}
                    >
                      {ev.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Alamat */}
        {order.address && (
          <div className="card-elevated p-5 flex items-start gap-3">
            <MapPin className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div className="text-xs text-foreground/80 space-y-1 leading-relaxed">
              <p className="font-bold text-foreground text-sm">
                Alamat Tujuan: {order.address.recipientName} (
                {order.address.phone})
              </p>
              <p>{order.address.fullAddress}</p>
              <p className="font-semibold text-success">
                {order.address.city}, {order.address.province}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
