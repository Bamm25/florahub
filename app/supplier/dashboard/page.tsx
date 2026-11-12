"use client";
import {
  getSupplierDashboard,
  StockTransactionItem,
  SupplierDashboardData,
} from "@/lib/api/supplier";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Sprout,
  TrendingUp,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SupplierDashboardPage() {
  const [data, setData] = useState<SupplierDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ambil data supplier
  useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoading(true);
        setError(null);
        const dashboardData = await getSupplierDashboard();
        setData(dashboardData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat ringkasan kebun",
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const getStatusBadge = (status: StockTransactionItem["status"]) => {
    switch (status) {
      case "PAID":
        return {
          label: "Lunas",
          color: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: CheckCircle2,
        };
      case "PENDING":
        return {
          label: "Menunggu Konfirmasi",
          color: "bg-amber-50 text-amber-800 border-amber-200",
          icon: Clock,
        };
      case "CANCELLED":
        return {
          label: "Dibatalkan",
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: Clock,
        };
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Memuat ringkasan kebun & penjualan..." />;
  }

  // Tampilan jika terjadi kegagalan koneksi atau error server
  if (error || !data) {
    return (
      <ErrorState
        title="Ringkasan belum dapat dimuat"
        error={error || "Data ringkasan tidak ditemukan"}
        onRetry={() => window.location.reload()}
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
    averageOrderValue: 0,
  };

  const harvestMetrics = data.harvestMetrics || {
    activeAnnouncements: 0,
    confirmedPreOrders: 0,
  };
  const topStocks = data.charts?.topStocks || [];
  const recentSales = data.recentSales || [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 lg:space-y-10">
      {/* Header Banner Dasbor Supplier */}
      <div className="flex flex-col gap-6 rounded-2xl bg-[#10121b] px-6 py-9 text-white sm:px-9 sm:py-10 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
            Portal Operasional Mitra Kebun
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Ringkasan Kebun & Pasokan
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
            Pantau stok bunga segar, konfirmasi pembayaran dari florist, dan
            kelola jadwal panen.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/supplier/stocks"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Kelola Stok Bunga
          </Link>
          <Link
            href="/supplier/harvest-announcements"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Menunggu Konfirmasi Pembayaran */}
          <Link
            href="/supplier/sales"
            className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-emerald-500/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Menunggu Konfirmasi Bayar
              </span>
              <span className="rounded-lg bg-amber-50 p-2 text-amber-700">
                <Clock className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
              {summary.pendingTransactions}
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:underline">
              <span>Periksa bukti transfer</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
          {/* Stok Menipis */}
          <Link
            href="/supplier/stocks"
            className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-emerald-500/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Stok Menipis (&lt; 50 unit)
              </span>
              <span className="rounded-lg bg-rose-50 p-2 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
              {summary.lowStockAlert}
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:underline">
              <span>Tambah stok bunga</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
          {/* Pre-Order Panen Terkonfirmasi */}
          <Link
            href="/supplier/harvest-announcements"
            className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-emerald-500/50 sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Pre-Order Terkonfirmasi
              </span>
              <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                <Calendar className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
              {harvestMetrics.confirmedPreOrders}
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:underline">
              <span>Lihat pesanan panen</span>
              <ArrowRight className="h-4 w-4" />
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
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {formatRupiah(summary.totalRevenue)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Dari transaksi berstatus lunas
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Total Bunga Terjual
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
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
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
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
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
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
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                5 Bunga Terlaris
              </h3>
              <p className="text-xs text-muted-foreground">
                Berdasarkan jumlah unit yang telah terbeli
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
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
                    <p className="text-xs text-muted-foreground">
                      Varietas: {stock.variety || "Standar"} • Sisa stok:{" "}
                      {stock.quantity}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-600">
                      {stock.totalSold.toLocaleString("id-ID")} terjual
                    </p>
                    <p className="text-xs text-muted-foreground">
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
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Status Pengumuman Panen
                </h3>
                <p className="text-xs text-muted-foreground">
                  Publikasi rencana panen mendatang ke jaringan florist
                </p>
              </div>
              <Sprout className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-surface-container-low p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  Pengumuman Aktif
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
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
                <p className="mt-2 text-3xl font-bold text-emerald-600">
                  {harvestMetrics.confirmedPreOrders}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Menunggu waktu panen
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <Link
              href="/supplier/harvest-announcements"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-high"
            >
              <span>Kelola Jadwal & Pengumuman Panen</span>
              <ArrowRight className="h-4 w-4" />
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
              Daftar pembelian bahan baku bunga terbaru oleh florist.
            </p>
          </div>
          <Link
            href="/supplier/sales"
            className="text-sm font-semibold text-emerald-600 hover:underline"
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
                    Bunga & Jumlah
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
                {recentSales.map((sale) => {
                  const statusInfo = getStatusBadge(sale.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-surface-container-lowest/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {formatDate(sale.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-foreground">
                          {sale.florist.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.florist.email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">
                          {sale.stock.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.quantity} unit (
                          {sale.stock.variety || "Standar"})
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-foreground">
                        {formatRupiah(sale.totalPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusInfo.color}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          href="/supplier/sales"
                          className="font-semibold text-emerald-600 hover:underline"
                        >
                          Rincian
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
