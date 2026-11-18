"use client";

import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { LoadingSpinner, ErrorState } from "@/components/ui";
import { useDataFetching } from "@/hooks";
import { getFloristOrderById } from "@/lib/api/florist";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/utils/formatters";

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border bg-success/10 text-success border-success/20">
            Lunas
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200">
            Sedang Dirakit
          </span>
        );
      case "READY_TO_SHIP":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border bg-primary/10 text-primary border-primary/20">
            Siap Dikirim
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border bg-sky-50 text-sky-700 border-sky-200">
            Dalam Pengiriman
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border bg-success/10 text-success border-success/20">
            Selesai
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-200">
            Dibatalkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
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
          <Link
            href="/florist/orders"
            className="btn-secondary text-xs"
          >
            Kembali ke Daftar
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      {/* Restrained Dark Header for Rhythm */}
      <div className="flex flex-col gap-6 rounded-[24px] bg-surface-dark p-6 text-white sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Link
            href="/florist/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-kicker transition-colors hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Daftar Pesanan
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Pesanan {order.orderNumber}
            </h1>
            {getStatusBadge(order.status)}
          </div>
          <p className="text-xs text-white/70 sm:text-sm">
            Dibuat pada {formatDateTime(order.createdAt)} • Customer: {order.user.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {order.status === "PAID" && !order.shipment && (
            <Link
              href="/florist/shipments"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Buat Pengiriman
            </Link>
          )}
          {order.shipment && (
            <Link
              href="/florist/shipments"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              Kelola Pengiriman
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <h2 className="text-base font-semibold text-foreground">
                Produk yang Dipesan
              </h2>
              <span className="text-xs font-medium text-muted-foreground">
                {order.items.length} item
              </span>
            </div>
            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    width={72}
                    height={72}
                    unoptimized
                    className="h-18 w-18 rounded-xl object-cover border border-border bg-surface-container-low shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{item.product.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRupiah(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">{formatRupiah(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Info */}
          {order.shipment && (
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
                <h2 className="text-base font-semibold text-foreground">
                  Informasi Pengiriman
                </h2>
                {getStatusBadge(order.shipment.status)}
              </div>
              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Kurir & Layanan</span>
                  <span className="font-medium text-foreground">
                    {order.shipment.courier} {order.shipment.service && `(${order.shipment.service})`}
                  </span>
                </div>
                {order.shipment.trackingNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">No. Resi Pelacakan</span>
                    <span className="font-mono text-xs font-semibold text-foreground bg-surface-container-low px-2.5 py-1 rounded-lg border border-border">
                      {order.shipment.trackingNumber}
                    </span>
                  </div>
                )}
                {order.shipment.shippedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Waktu Dikirim</span>
                    <span className="text-xs text-foreground">{formatDate(order.shipment.shippedAt)}</span>
                  </div>
                )}
                {order.shipment.deliveredAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Waktu Diterima</span>
                    <span className="text-xs text-foreground">{formatDate(order.shipment.deliveredAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Informasi Customer
            </h2>
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-foreground">{order.user.name}</p>
              <p className="text-xs text-muted-foreground">{order.user.email}</p>
              {order.user.phone && <p className="text-xs text-muted-foreground">{order.user.phone}</p>}
            </div>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Alamat Tujuan
              </h2>
              <div className="space-y-1 text-sm text-foreground">
                <p className="font-semibold">{order.shippingAddress.recipientName}</p>
                <p className="text-xs text-muted-foreground">{order.shippingAddress.phone}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{order.shippingAddress.fullAddress}</p>
                <p className="text-xs text-muted-foreground">
                  {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
                </p>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Rincian Pembayaran
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal Produk</span>
                <span className="text-foreground">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Biaya Pengiriman</span>
                <span className="text-foreground">{formatRupiah(order.shippingCost)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-baseline">
                <span className="font-semibold text-foreground">Total Pembayaran</span>
                <span className="text-xl font-bold text-primary">{formatRupiah(order.totalAmount)}</span>
              </div>
              {order.payment && (
                <div className="border-t border-border pt-3 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Metode Bayar</span>
                    <span className="text-foreground font-medium">{order.payment.method}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Status Verifikasi</span>
                    {getStatusBadge(order.status === "CANCELLED" || order.payment.status === "FAILED" ? "CANCELLED" : order.payment.status)}
                  </div>
                  {order.payment.paidAt && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Waktu Lunas</span>
                      <span className="text-foreground">{formatDate(order.payment.paidAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            {order.status === "PAID" && !order.shipment && (
              <Link
                href="/florist/shipments"
                className="inline-flex w-full min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Buat Pengiriman Sekarang
              </Link>
            )}
            {order.shipment && (
              <Link
                href="/florist/shipments"
                className="inline-flex w-full min-h-12 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low"
              >
                Kelola di Menu Pengiriman
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
