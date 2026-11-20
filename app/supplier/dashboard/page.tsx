"use client";
import { getSupplierDashboard } from "@/lib/api/supplier";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";
import { LoadingSpinner, ErrorState, StatusBadge } from "@/components/ui";
import { useDataFetching } from "@/hooks";
import Link from "next/link";

export default function SupplierDashboardPage() {
  const { data, isLoading, error, refetch } = useDataFetching(
    (signal) => getSupplierDashboard(signal),
    [],
  );

  if (isLoading) {
    return <LoadingSpinner message="Memuat ringkasan kebun & penjualan..." />;
  }

  // Tampilan jika terjadi kegagalan koneksi atau error server
  if (error || !data) {
    return (
      <ErrorState
        title="Ringkasan belum dapat dimuat"
        error={error || "Data ringkasan tidak ditemukan"}
        onRetry={() => void refetch()}
      />
    );
  }

  const summary = data.summary || {
    totalRevenue: 0,
    totalSales: 0,
    stockSold: 0,
    activeStocks: 0,
    lowStockAlert: 0,
    pendingTransactions: 0,
    readyToShipCount: 0,
    averageOrderValue: 0,
  };

  const harvestMetrics = data.harvestMetrics || {
    activeAnnouncements: 0,
    confirmedPreOrders: 0,
    pendingPreOrders: 0,
  };
  const topStocks = data.charts?.topStocks || [];
  const recentSales = data.recentSales || [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 lg:space-y-10">
      {/* Header Banner Dasbor Supplier */}
      <div className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-9 sm:py-10 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Portal Operasional Mitra Kebun
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Ringkasan Kebun
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
            Pantau stok kebun, jadwal panen, pesanan masuk, dan pengiriman ke
            florist.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/supplier/stocks"
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Kelola Stok Bunga
          </Link>
          <Link
            href="/supplier/harvest-announcements"
            className="inline-flex min-h-11 items-center justify-center rounded-sm border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Jadwal Panen
          </Link>
        </div>
      </div>

      {/* Bagian 1: Kartu Tindakan Prioritas */}
      <section aria-labelledby="prioritas-heading">
        <h2
          id="prioritas-heading"
          className="mb-4 text-lg font-semibold text-foreground"
        >
          Perlu Tindakan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Siap Dikirim (Perlu Resi) */}
          <Link
            href="/supplier/shipments"
            className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary/40"
          >
            <p className="text-sm font-medium text-muted-foreground">
              Siap Dikirim (Perlu Resi)
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {summary.readyToShipCount ?? 0}
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary group-hover:underline">
              <span>Buat resi sekarang</span>
              <span aria-hidden="true">→</span>
            </div>
          </Link>

          {/* Pre-Order Panen Menunggu Konfirmasi */}
          <Link
            href="/supplier/harvest-announcements"
            className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary/40"
          >
            <p className="text-sm font-medium text-muted-foreground">
              Pre-Order Menunggu
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {harvestMetrics.pendingPreOrders ?? 0}
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary group-hover:underline">
              <span>Tinjau pre-order</span>
              <span aria-hidden="true">→</span>
            </div>
          </Link>

          {/* Stok Menipis */}
          <Link
            href="/supplier/stocks"
            className="m-card group rounded-2xl border border-border bg-surface p-6 hover:border-primary/40"
          >
            <p className="text-sm font-medium text-muted-foreground">
              Stok Menipis (&lt; 50)
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {summary.lowStockAlert}
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary group-hover:underline">
              <span>Perbarui stok</span>
              <span aria-hidden="true">→</span>
            </div>
          </Link>

          {/* Menunggu Pembayaran Florist */}
          <Link
            href="/supplier/sales"
            className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary/40"
          >
            <p className="text-sm font-medium text-muted-foreground">
              Menunggu Pembayaran
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {summary.pendingTransactions}
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary group-hover:underline">
              <span>Lihat transaksi</span>
              <span aria-hidden="true">→</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Bagian 2: Ringkasan Metrik Finansial & Operasional */}
      <section aria-labelledby="kinerja-heading">
        <h2
          id="kinerja-heading"
          className="mb-4 text-lg font-semibold text-foreground"
        >
          Kinerja Penjualan & Pasokan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Total Pendapatan Lunas
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
              {formatRupiah(summary.totalRevenue)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Dari pesanan yang sudah lunas &amp; dikirim
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Total Bunga Terjual
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {summary.stockSold.toLocaleString("id-ID")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Tangkai bunga dipasok ke florist
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Rata-rata Nilai Pesanan
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
              {formatRupiah(summary.averageOrderValue)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Per transaksi pembelian florist
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Varietas Aktif
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {summary.activeStocks}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Tersedia dipesan oleh florist
            </p>
          </div>
        </div>
      </section>

      {/* Bagian 3: Bunga Terlaris & Jadwal Panen */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Kolom Kiri: 5 Varietas Bunga Terlaris */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="pb-4 border-b border-border">
            <h3 className="text-base font-semibold tracking-normal text-foreground">
              5 Bunga Terlaris
            </h3>
            <p className="text-xs text-muted-foreground">
              Berdasarkan jumlah tangkai yang terjual
            </p>
          </div>
          <div className="mt-4 divide-y divide-border">
            {topStocks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada data penjualan tercatat.
              </p>
            ) : (
              topStocks.map((stock) => (
                <div
                  key={stock.id}
                  className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 pr-3">
                    <p className="truncate text-sm font-medium text-foreground">
                      {stock.name}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      Varietas: {stock.variety || "Standar"} • Sisa stok:{" "}
                      {stock.quantity.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {stock.totalSold.toLocaleString("id-ID")} terjual
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatRupiah(stock.pricePerUnit)} / unit
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom Kanan: Status Rencana Panen */}
        <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-border">
              <h3 className="text-base font-semibold tracking-normal text-foreground">
                Status Pengumuman Panen
              </h3>
              <p className="text-xs text-muted-foreground">
                Publikasi rencana panen mendatang untuk toko florist
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-surface-container-low p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  Pengumuman Aktif
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
                  {harvestMetrics.activeAnnouncements}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dapat di-pre-order
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  Pre-Order Dikonfirmasi
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
                  {harvestMetrics.confirmedPreOrders}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Menunggu DP &amp; panen
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <Link
              href="/supplier/harvest-announcements"
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-surface-container py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-high"
            >
              <span>Kelola Jadwal Panen</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Bagian 4: Riwayat Penjualan Terkini */}
      <section
        aria-labelledby="sales-heading"
        className="overflow-hidden rounded-2xl border border-border bg-surface"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <h2
              id="sales-heading"
              className="text-lg font-semibold text-foreground"
            >
              Transaksi Penjualan Terkini
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pembelian bahan baku bunga terbaru dari toko florist.
            </p>
          </div>
          <Link
            href="/supplier/sales"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Lihat semua penjualan &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          {recentSales.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Belum ada riwayat transaksi penjualan dari florist.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-container-lowest text-xs font-medium text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Tanggal
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Florist
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Bunga &amp; Jumlah
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Total Harga
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-surface-container-lowest/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      <time dateTime={sale.createdAt} className="tabular-nums">
                        {formatDate(sale.createdAt)}
                      </time>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-foreground">
                        {sale.florist.name}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">
                        {sale.stock.name}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {sale.quantity.toLocaleString("id-ID")}{" "}
                        {sale.stock.unit || "tangkai"} (
                        {sale.stock.variety || "Standar"})
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold tabular-nums text-foreground">
                      {formatRupiah(sale.totalPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        status={sale.status}
                        variant="shipment"
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href="/supplier/sales"
                        className="font-semibold text-primary hover:underline"
                      >
                        Rincian
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
