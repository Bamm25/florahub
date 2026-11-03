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
  Truck,
  MapPin,
} from "lucide-react";
import Link from "next/link";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
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

interface TimelineEvent {
  id: string;
  dateStr: string;
  timeStr: string;
  statusTitle: string;
  description: string;
  isLatest: boolean;
  stepCategory: "created" | "transit" | "delivering" | "delivered";
}

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=/orders/${orderId}/tracking`);
      return;
    }

    async function loadTrackingData() {
      try {
        setIsLoading(true);
        const orderRes = await getOrderDetail(orderId);
        setOrder(orderRes.data.order);

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

  const handleCopyResi = (resi: string) => {
    navigator.clipboard.writeText(resi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 h-32 animate-pulse rounded-xl bg-gray-100" />
        <div className="mt-4 h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (errorMessage || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-red-600">{errorMessage || "Pesanan tidak ditemukan"}</p>
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
        >
          Kembali ke Rincian Pesanan
        </button>
      </div>
    );
  }

  const customerCity = order.address?.city || "Surabaya";
  const courierName = shipment?.courier || "FloraHub Jatim Express";
  const trackingNo =
    shipment?.trackingNumber ||
    `FH-JTM-${order.orderNumber.replace(/[^0-9]/g, "") || "88219"}`;

  const createdDate = new Date(order.createdAt);
  const estDays = shipment?.estimatedDays || 2;
  const estimatedArrival = new Date(createdDate);
  estimatedArrival.setDate(createdDate.getDate() + estDays);

  const formattedEstArrival = estimatedArrival.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });

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
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="rounded-full p-1.5 text-gray-600 transition hover:bg-gray-100"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Status Pengiriman</h1>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-6 pb-8 space-y-5">
        {/* 1. Header Estimasi & Horizontal Stepper */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
          <div className="mb-5">
            <p className="text-xl font-bold text-gray-900 leading-tight">
              {isDelivered
                ? "Pesanan telah tiba di tujuan"
                : `Pesanan tiba pada ${formattedEstArrival}`}
            </p>
            <p className="text-sm text-gray-600 mt-1.5 font-medium">
              Marketplace Multi-Florist • Area Service Jawa Timur
            </p>
          </div>

          <div className="relative mt-7 px-4">
            <div className="absolute left-10 right-10 top-3.5 h-1 bg-gray-200 -z-0 rounded-full">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
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
                      ? "bg-emerald-500 ring-4 ring-emerald-100"
                      : "bg-gray-300"
                  }`}
                >
                  <Check className="h-4 w-4" />
                </div>
                <span
                  className={`mt-2.5 text-center text-[13px] font-medium leading-tight ${
                    activeStep >= 1
                      ? "text-emerald-700 font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  Sedang Dikirim
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white transition shadow-sm ${
                    activeStep >= 2
                      ? "bg-emerald-500 ring-4 ring-emerald-100"
                      : "bg-gray-300"
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
                      ? "text-emerald-700 font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  Menuju Alamatmu
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white transition shadow-sm ${
                    activeStep === 3
                      ? "bg-emerald-500 ring-4 ring-emerald-100"
                      : "bg-gray-300"
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
                      ? "text-emerald-700 font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  Pesanan Tiba
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Kartu Kurir & Nomor Resi */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={order.items[0]?.product.image || "/placeholder.png"}
                alt={order.items[0]?.product.name || "Produk"}
                className="h-14 w-14 rounded-lg border border-gray-100 object-cover shadow-sm"
              />
              <div>
                <p className="text-sm font-bold text-gray-900">{courierName}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-700 font-medium">
                    {trackingNo}
                  </span>
                  <button
                    onClick={() => handleCopyResi(trackingNo)}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-200 transition"
                    title="Salin Resi"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <Link
              href={`/orders/${orderId}`}
              className="whitespace-nowrap rounded-lg border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm"
            >
              Rincian Pesanan
            </Link>
          </div>
        </div>

        {/* 3. Timeline Vertikal */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
          <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-5">
            Riwayat Pengiriman
          </h2>

          <div className="relative pl-7 space-y-7">
            <div className="absolute left-[13px] top-3 bottom-3 w-[3px] bg-gray-300 rounded-full" />

            {events.map((ev, index) => {
              const isFirst = index === 0;

              return (
                <div key={ev.id} className="relative flex items-start gap-4">
                  <div className="absolute -left-7 mt-0.5">
                    {isFirst ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-emerald-100 shadow-sm">
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </div>
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-gray-400 ring-2 ring-white shadow-sm" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          isFirst ? "text-emerald-700" : "text-gray-600"
                        }`}
                      >
                        {ev.dateStr} • {ev.timeStr}
                      </span>
                    </div>

                    <p
                      className={`mt-1.5 text-sm leading-snug ${
                        isFirst
                          ? "font-bold text-gray-900"
                          : "font-semibold text-gray-800"
                      }`}
                    >
                      {ev.statusTitle}
                    </p>

                    <p
                      className={`mt-1 text-xs leading-relaxed ${
                        isFirst ? "text-gray-700" : "text-gray-600"
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
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-md flex items-start gap-3">
            <MapPin className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-700 space-y-1 leading-relaxed">
              <p className="font-bold text-gray-900 text-sm">
                Alamat Tujuan: {order.address.recipientName} (
                {order.address.phone})
              </p>
              <p>{order.address.fullAddress}</p>
              <p className="font-semibold text-emerald-700">
                {order.address.city}, {order.address.province}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
