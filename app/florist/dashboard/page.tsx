"use client";

import Link from "next/link";
import { LoadingSpinner, ErrorState } from "@/components/ui";
import { useDataFetching } from "@/hooks";
import { getFloristDashboard } from "@/lib/api/florist";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";

// Halaman dasbor utama operasional toko florist
export default function FloristDashboardPage() {
  const { data, isLoading, error, refetch } = useDataFetching(
    (signal) => getFloristDashboard(signal),
    [],
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return {
          label: "Perlu Diproses",
          color: "bg-warning/10 text-warning border-warning/25",
        };
      case "PROCESSING":
        return {
          label: "Sedang Dirakit",
          color: "bg-info/10 text-info border-info/25",
        };
      case "READY_TO_SHIP":
        return {
          label: "Siap Dikirim",
          color: "bg-primary/10 text-primary border-primary/20",
        };
      case "SHIPPED":
        return {
          label: "Dalam Pengiriman",
          color: "bg-info/10 text-info border-info/25",
        };
      case "DELIVERED":
        return {
          label: "Selesai",
          color: "bg-success/10 text-success border-success/20",
        };
      case "PENDING":
        return {
          label: "Menunggu Bayar",
          color: "bg-warning/10 text-warning border-warning/25",
        };
      case "CANCELLED":
        return {
          label: "Dibatalkan",
          color: "bg-surface-container-low text-muted-foreground border-border",
        };
      default:
        return {
          label: status.replaceAll("_", " "),
          color: "bg-surface-container-low text-muted-foreground border-border",
        };
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Memuat ringkasan toko..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Ringkasan belum dapat dimuat"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  const summary = data?.summary || {
    totalRevenue: 0,
    totalOrders: 0,
    productsSold: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    averageRating: 0,
    pendingOrders: 0,
  };

  const recentOrders = data?.recentOrders || [];
  const floristInfo = data?.floristInfo;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Editorial Dark Masthead */}
      <section className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            {floristInfo?.shopName || "Studio Florist"}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Ringkasan Operasional
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Pantau antrean pesanan aktif, ketersediaan stok buket, dan kinerja penjualan harian studio Anda.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/florist/products"
            className="inline-flex min-h-11 items-center justify-center rounded-sm border border-white/20 bg-white/5 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Katalog Produk
          </Link>
          <Link
            href="/florist/orders"
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Kelola Pesanan
          </Link>
        </div>
      </section>

      {/* Prioritas Operasional */}
      <section aria-labelledby="prioritas-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2
              id="prioritas-heading"
              className="text-lg font-bold tracking-tight text-foreground"
            >
              Prioritas Hari Ini
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Tindakan langsung untuk menjaga ketepatan pengiriman dan ketersediaan stok.
            </p>
          </div>
          <Link
            href="/florist/inventory"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span>Bahan Baku & Stok</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/florist/orders"
            className={`group flex flex-col justify-between rounded-2xl border p-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              summary.pendingOrders > 0
                ? "border-warning/35 bg-warning/[0.04] hover:border-warning/60"
                : "border-border bg-surface hover:border-foreground/30"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Antrean Pesanan Aktif
                </p>
                {summary.pendingOrders > 0 && (
                  <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-[11px] font-semibold text-warning">
                    Perlu Tindakan
                  </span>
                )}
              </div>
              <p
                className={`mt-3 text-4xl font-bold tracking-tight tabular-nums ${
                  summary.pendingOrders > 0 ? "text-warning" : "text-foreground"
                }`}
              >
                {summary.pendingOrders}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mencakup pesanan lunas yang perlu dirakit atau dibuatkan resi kurir.
              </p>
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:underline">
              <span>Buka Daftar Pesanan</span>
              <span aria-hidden="true">→</span>
            </p>
          </Link>

          <Link
            href="/florist/products"
            className={`group flex flex-col justify-between rounded-2xl border p-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              summary.lowStockProducts > 0
                ? "border-warning/35 bg-warning/[0.04] hover:border-warning/60"
                : "border-border bg-surface hover:border-foreground/30"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Produk Stok Menipis (&lt; 10)
                </p>
                {summary.lowStockProducts > 0 && (
                  <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-[11px] font-semibold text-warning">
                    Siapkan Produksi
                  </span>
                )}
              </div>
              <p
                className={`mt-3 text-4xl font-bold tracking-tight tabular-nums ${
                  summary.lowStockProducts > 0
                    ? "text-warning"
                    : "text-foreground"
                }`}
              >
                {summary.lowStockProducts}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Buket aktif dengan sisa stok di bawah 10 unit siap jual.
              </p>
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:underline">
              <span>Periksa Katalog Produk</span>
              <span aria-hidden="true">→</span>
            </p>
          </Link>
        </div>
      </section>

      {/* Kinerja Toko */}
      <section aria-labelledby="kinerja-heading" className="space-y-4">
        <h2
          id="kinerja-heading"
          className="text-lg font-bold tracking-tight text-foreground"
        >
          Kinerja Penjualan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pendapatan Selesai
            </p>
            <p className="mt-2.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {formatRupiah(summary.totalRevenue)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Dari pesanan berstatus selesai diterima
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Pesanan
            </p>
            <p className="mt-2.5 text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
              {summary.totalOrders.toLocaleString("id-ID")}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Akumulasi seluruh status pesanan
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Buket Terjual
            </p>
            <p className="mt-2.5 text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
              {summary.productsSold.toLocaleString("id-ID")}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Total unit produk pada pesanan selesai
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Produk Aktif
            </p>
            <p className="mt-2.5 text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
              {summary.activeProducts.toLocaleString("id-ID")}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Ditampilkan di katalog publik toko
            </p>
          </div>
        </div>
      </section>

      {/* Tabel Pesanan Terbaru */}
      <section
        aria-labelledby="recent-heading"
        className="overflow-hidden rounded-2xl border border-border bg-surface"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <h2
              id="recent-heading"
              className="text-base font-bold tracking-tight text-foreground sm:text-lg"
            >
              Pesanan Terbaru
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Lima transaksi terakhir yang masuk ke toko Anda.
            </p>
          </div>
          <Link
            href="/florist/orders"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span>Semua Pesanan</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">
              Belum ada pesanan masuk
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pesanan customer akan otomatis tercatat di sini setelah checkout.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-sm">
              <thead className="border-b border-border bg-surface-container-low/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3.5 sm:px-6">
                    No. Pesanan
                  </th>
                  <th scope="col" className="px-5 py-3.5 sm:px-6">
                    Customer
                  </th>
                  <th scope="col" className="px-5 py-3.5 sm:px-6">
                    Tanggal
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right sm:px-6">
                    Total Tagihan
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-center sm:px-6">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right sm:px-6">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  return (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-surface-container-low/40"
                    >
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-foreground sm:px-6">
                        {order.orderNumber}
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <p className="font-medium text-foreground">
                          {order.user.name}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs tabular-nums text-muted-foreground sm:px-6">
                        <time dateTime={order.createdAt}>
                          {formatDate(order.createdAt)}
                        </time>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-foreground sm:px-6">
                        {formatRupiah(order.totalAmount)}
                      </td>
                      <td className="px-5 py-4 text-center sm:px-6">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right sm:px-6">
                        <Link
                          href={`/florist/orders/${order.id}`}
                          className="inline-flex min-h-9 items-center justify-center rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          Lihat Detail
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Strip Informasi Lokasi Studio */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-semibold text-foreground">
            Alamat Asal Pengiriman Studio
          </p>
          {floristInfo?.address ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {floristInfo.address.fullAddress}, {floristInfo.address.city},{" "}
              {floristInfo.address.province} {floristInfo.address.postalCode}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-warning">
              Alamat asal pengiriman belum diatur. Lengkapi agar ongkos kirim kurir dapat dihitung otomatis.
            </p>
          )}
        </div>
        <Link
          href="/florist/settings/shop"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-sm border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {floristInfo?.address ? "Ubah Alamat Toko" : "Atur Alamat Toko"}
        </Link>
      </div>
    </div>
  );
}
