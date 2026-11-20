"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  LoadingSpinner,
  ErrorState,
  TrackingProgressTrack,
} from "@/components/ui";
import { useDataFetching } from "@/hooks";
import { getFloristOrderById, trackFloristShipment } from "@/lib/api/florist";
import { buildOrderTrackingTimeline } from "@/lib/order-tracking-timeline";
import { isValidShippingLabelUrl } from "@/lib/config/domain";
import {
  formatDate,
  formatDateTime,
  formatRupiah,
} from "@/lib/utils/formatters";

const ORDER_STEPS = [
  { key: "PENDING", label: "Dibuat" },
  { key: "PAID", label: "Dibayar" },
  { key: "PROCESSING", label: "Dirakit" },
  { key: "SHIPPED", label: "Dikirim" },
  { key: "DELIVERED", label: "Selesai" },
] as const;

function getActiveStepIndex(status: string, shipmentStatus?: string | null) {
  const effective = shipmentStatus || status;
  switch (effective) {
    case "DELIVERED":
      return 4;
    case "SHIPPED":
      return 3;
    case "PROCESSING":
    case "READY_TO_SHIP":
      return 2;
    case "PAID":
      return 1;
    default:
      return 0;
  }
}

const mapPaymentMethod: Record<string, string> = {
  MIDTRANS: "Pembayaran Online",
  BANK_TRANSFER: "Transfer Bank (VA)",
  CREDIT_CARD: "Kartu Kredit / Debit",
  GOPAY: "GoPay",
  SHOPEEPAY: "ShopeePay",
  QRIS: "QRIS",
  ECHANNEL: "Mandiri Bill Payment",
  PERMATA_VA: "Permata Virtual Account",
  BCA_VA: "BCA Virtual Account",
  BNI_VA: "BNI Virtual Account",
  BRI_VA: "BRI Virtual Account",
};

function formatPaymentMethod(method?: string | null): string {
  if (!method) return "-";
  const normalized = method.trim().toUpperCase();
  return mapPaymentMethod[normalized] || method.replaceAll("_", " ");
}

// Halaman rincian pesanan florist dengan informasi produk, pemrosesan, dan pengiriman
export default function OrderDetailPage() {
  const { id: orderId } = useParams<{ id: string }>();
  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useDataFetching(
    (signal) => getFloristOrderById(orderId, signal),
    [orderId],
    { enabled: Boolean(orderId) },
  );

  const [copiedResi, setCopiedResi] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopyResi = (resi: string) => {
    void navigator.clipboard.writeText(resi);
    setCopiedResi(true);
    window.setTimeout(() => setCopiedResi(false), 2000);
  };

  const handleRefreshOrder = async () => {
    setIsRefreshing(true);
    try {
      if (order?.shipment?.biteshipOrderId) {
        await trackFloristShipment(order.shipment.id).catch(() => {});
      }
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            Lunas
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center rounded-full border border-info/25 bg-info/10 px-3 py-1 text-xs font-semibold text-info">
            Sedang Dirakit
          </span>
        );
      case "READY_TO_SHIP":
        return (
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Siap Dikirim
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center rounded-full border border-info/25 bg-info/10 px-3 py-1 text-xs font-semibold text-info">
            Dalam Pengiriman
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            Selesai
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center rounded-full border border-error/25 bg-error/10 px-3 py-1 text-xs font-semibold text-error">
            Dibatalkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
            Menunggu Bayar
          </span>
        );
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Memuat detail pesanan..." />;
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Gagal Memuat Detail Pesanan"
          error={error || "Data pesanan tidak ditemukan"}
          onRetry={() => void refetch()}
        />
        <div className="flex justify-center">
          <Link href="/florist/orders" className="btn-secondary text-xs">
            Kembali ke Daftar
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const isCancelled = order.status === "CANCELLED";
  const activeStepIndex = getActiveStepIndex(
    order.status,
    order.shipment?.status,
  );
  const trackingTimeline = buildOrderTrackingTimeline({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      address: order.shippingAddress,
      payment: order.payment,
    },
    shipment: order.shipment,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Editorial Dark Masthead */}
      <section className="rounded-[24px] border border-white/10 bg-surface-dark p-6 text-white sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <nav aria-label="Breadcrumbs">
              <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                <li>
                  <Link
                    href="/florist/orders"
                    className="transition-colors hover:text-white"
                  >
                    Pesanan Customer
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="font-mono text-kicker">
                  {order.orderNumber}
                </li>
              </ol>
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Pesanan {order.orderNumber}
              </h1>
              {getStatusBadge(order.status)}
            </div>

            <p className="text-xs tabular-nums text-white/70 sm:text-sm">
              Dibuat pada{" "}
              <time dateTime={order.createdAt}>
                {formatDateTime(order.createdAt)}
              </time>{" "}
              · Customer: <span className="font-semibold text-white">{order.user.name}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleRefreshOrder()}
              disabled={isRefreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-white/20 bg-white/5 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {isRefreshing && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              )}
              <span>Perbarui Data</span>
            </button>
            {order.status === "PAID" && !order.shipment && (
              <Link
                href={`/florist/shipments?orderId=${order.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Buat Pengiriman
              </Link>
            )}
            {order.shipment && (
              <Link
                href="/florist/shipments"
                className="inline-flex min-h-11 items-center justify-center rounded-sm border border-white/20 bg-white/5 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                Kelola Pengiriman
              </Link>
            )}
          </div>
        </div>

        {/* 5-Step Fulfillment Tracker */}
        {!isCancelled && (
          <TrackingProgressTrack
            steps={ORDER_STEPS.map((step) => step.label)}
            activeStepIndex={activeStepIndex}
            isCompletedAll={order.status === "DELIVERED"}
            ariaLabel="Tahapan pemrosesan pesanan"
            className="mt-7 pt-6"
          />
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Utama */}
        <div className="space-y-6 lg:col-span-8">
          {/* Daftar Produk */}
          <section className="rounded-2xl border border-border bg-surface p-6">
            <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground">
                  Produk yang Dipesan
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Rincian rangkaian bunga untuk disiapkan studio.
                </p>
              </div>
              <span className="rounded-full border border-border bg-surface-container-low px-3 py-1 text-xs font-semibold tabular-nums text-foreground">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} unit
              </span>
            </div>

            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-container-low">
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      sizes="64px"
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.product.slug ? (
                      <Link
                        href={`/products/${item.product.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-semibold text-foreground hover:text-primary hover:underline"
                      >
                        {item.product.name}
                      </Link>
                    ) : (
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {item.product.name}
                      </h3>
                    )}
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {formatRupiah(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {formatRupiah(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Catatan Pesanan Customer */}
          {order.notes && (
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Catatan Pesanan / Kartu Ucapan
              </h2>
              <p className="mt-2.5 rounded-xl border border-border bg-surface-container-low p-4 text-sm leading-relaxed text-foreground">
                {order.notes}
              </p>
            </section>
          )}

          {/* Informasi Pengiriman & Riwayat Pelacakan */}
          <section className="rounded-2xl border border-border bg-surface p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground">
                  Informasi & Riwayat Pengiriman
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Status logistik dan kronologi perjalanan paket dari awal hingga akhir.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {order.shipment &&
                  (Boolean(order.shipment.id) ||
                    order.shipment.biteshipOrderId ||
                    isValidShippingLabelUrl(order.shipment.biteshipLabelUrl)) && (
                    <a
                      href={`/api/florist/shipments/${order.shipment.id}/label`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low"
                    >
                      Cetak Label
                    </a>
                  )}
                {order.shipment && getStatusBadge(order.shipment.status)}
              </div>
            </div>

            {order.shipment ? (
              <div className="mb-6 grid gap-3 rounded-xl border border-border bg-surface-container-low/60 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Ekspedisi & Layanan
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {order.shipment.courier.toUpperCase()}
                    {order.shipment.service ? ` · ${order.shipment.service}` : ""}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nomor Resi (AWB)
                  </p>
                  {order.shipment.trackingNumber ? (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {order.shipment.trackingNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyResi(order.shipment!.trackingNumber!)
                        }
                        className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-surface"
                      >
                        {copiedResi ? (
                          <>
                            <Check className="h-3 w-3 text-success" aria-hidden="true" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Belum ada nomor resi
                    </p>
                  )}
                </div>

                {order.shipment.shippedAt && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Waktu Diserahkan ke Kurir
                    </p>
                    <p className="mt-1 text-xs tabular-nums text-foreground">
                      {formatDateTime(order.shipment.shippedAt)}
                    </p>
                  </div>
                )}

                {order.shipment.deliveredAt && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Waktu Diterima Customer
                    </p>
                    <p className="mt-1 text-xs tabular-nums text-foreground">
                      {formatDateTime(order.shipment.deliveredAt)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6 flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-foreground">
                  <p className="font-semibold">
                    Resi pengiriman belum diterbitkan
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    {order.status === "PAID"
                      ? "Pembayaran telah lunas. Segera buat pengiriman kurir agar pesanan dapat dijemput."
                      : "Pengiriman dapat dibuat setelah pembayaran pesanan terverifikasi lunas."}
                  </p>
                </div>
                {order.status === "PAID" && (
                  <Link
                    href={`/florist/shipments?orderId=${order.id}`}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Terbitkan Resi
                  </Link>
                )}
              </div>
            )}

            {/* Kronologi Timeline Start -> End */}
            <ol className="relative ml-3 space-y-6 border-l border-border pl-6">
              {trackingTimeline.map((event, idx) => {
                const isLatest = idx === 0;
                const isCancelledEvent = Boolean(event.isCancelled);
                return (
                  <li key={event.id} className="relative">
                    <span
                      className={`absolute -left-[31px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-surface ${
                        isCancelledEvent
                          ? "bg-error"
                          : isLatest
                            ? "bg-primary"
                            : "bg-border"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <time
                        dateTime={event.isoDate}
                        className="block text-xs tabular-nums text-muted-foreground"
                      >
                        {event.dateStr} · {event.timeStr}
                      </time>
                      <p
                        className={`mt-0.5 text-sm ${
                          isCancelledEvent
                            ? "font-semibold text-error"
                            : isLatest
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/80"
                        }`}
                      >
                        {event.statusTitle}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {/* Sidebar Kanan */}
        <div className="space-y-6 lg:col-span-4">
          {/* Dark Sticky Payment Receipt */}
          <section className="rounded-2xl border border-white/10 bg-surface-dark p-6 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-kicker">
              Ringkasan Tagihan
            </p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-white">
              Rincian Pembayaran
            </h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-white/70">Subtotal Produk</dt>
                <dd className="font-medium tabular-nums text-white">
                  {formatRupiah(subtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/70">Biaya Pengiriman</dt>
                <dd className="font-medium tabular-nums text-white">
                  {formatRupiah(order.shippingCost)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-white/10 pt-3.5">
                <dt className="font-semibold text-white">Total Pembayaran</dt>
                <dd className="text-xl font-bold tabular-nums text-kicker">
                  {formatRupiah(order.totalAmount)}
                </dd>
              </div>
            </dl>

            {order.payment && (
              <dl className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-white/65">Metode Pembayaran</dt>
                  <dd className="font-semibold text-white">
                    {formatPaymentMethod(order.payment.method)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-white/65">Status Verifikasi</dt>
                  <dd>
                    {getStatusBadge(
                      order.status === "CANCELLED" ||
                        order.payment.status === "FAILED"
                        ? "CANCELLED"
                        : order.payment.status,
                    )}
                  </dd>
                </div>
                {order.payment.paidAt && (
                  <div className="flex items-center justify-between">
                    <dt className="text-white/65">Waktu Lunas</dt>
                    <dd className="tabular-nums text-white/90">
                      {formatDate(order.payment.paidAt)}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </section>

          {/* Informasi Customer */}
          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Informasi Customer
            </h2>
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-semibold text-foreground">{order.user.name}</p>
              <p className="text-xs text-muted-foreground">{order.user.email}</p>
              {order.user.phone && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {order.user.phone}
                </p>
              )}
            </div>
          </section>

          {/* Alamat Tujuan */}
          {order.shippingAddress && (
            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Alamat Tujuan Pengiriman
                </h2>
                {order.shippingAddress.label && (
                  <span className="rounded-md border border-border bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-foreground">
                    {order.shippingAddress.label}
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-1 text-sm text-foreground">
                <p className="font-semibold">
                  {order.shippingAddress.recipientName}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {order.shippingAddress.phone}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {order.shippingAddress.fullAddress}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
                  {order.shippingAddress.postalCode}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
