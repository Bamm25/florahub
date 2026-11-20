"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { fetchAdminStats, type AdminDashboardStats } from "@/lib/api/admin";
import { formatRupiah } from "@/lib/utils/formatters";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStats = useCallback(
    async (signal?: AbortSignal, silent = false) => {
      try {
        if (silent) {
          setIsRefreshing(true);
        }
        const data = await fetchAdminStats(signal);
        if (!signal?.aborted) {
          setStats(data);
          setErrorMessage(null);
        }
      } catch (err) {
        if (
          signal?.aborted ||
          (err instanceof Error && err.name === "AbortError")
        ) {
          return;
        }
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Gagal memuat data analitik dasbor",
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchStats(controller.signal, false);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchStats]);

  const handleRefresh = async () => {
    if (stats) {
      await fetchStats(undefined, true);
    } else {
      setIsLoading(true);
      await fetchStats(undefined, false);
    }
  };

  if (isLoading && !stats) {
    return <LoadingSpinner message="Memuat ringkasan operasional platform..." />;
  }

  if (errorMessage && !stats) {
    return (
      <ErrorState
        title="Analitik Belum Dapat Dimuat"
        error={errorMessage}
        onRetry={() => void handleRefresh()}
      />
    );
  }

  const quickLinks = [
    {
      title: "Manajemen Akun",
      description: "Pengawasan status aktif dan verifikasi pengguna platform.",
      href: "/admin/users",
      badge: stats
        ? `${stats.users.total.toLocaleString("id-ID")} akun`
        : "Direktori Akun",
    },
    {
      title: "Pesanan & Pasokan",
      description: "Observasi transaksi pesanan pembeli dan rantai pasok B2B.",
      href: "/admin/orders",
      badge: stats
        ? `${stats.b2cOrders.total.toLocaleString("id-ID")} B2C · ${(
            stats.b2bSupply.directSales.total + stats.b2bSupply.preOrders.total
          ).toLocaleString("id-ID")} B2B`
        : "B2C & B2B",
    },
    {
      title: "Kupon & Promosi",
      description: "Pengaturan kode promosi dan taksonomi kategori platform.",
      href: "/admin/coupons",
      badge: stats
        ? `${stats.catalog.totalCategories.toLocaleString("id-ID")} kategori`
        : "Promosi & Katalog",
    },
    {
      title: "Log Audit Sistem",
      description: "Rekaman jejak aktivitas dan mutasi data sensitif admin.",
      href: "/admin/audit-logs",
      badge: "Jejak Sistem",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Editorial Gelap */}
      <section className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-9 sm:py-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Pusat Kendali Platform
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Selamat Datang, {session?.user?.name || "Administrator"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Pantau volume transaksi customer, komitmen pasokan panen kebun,
            serta integritas operasional seluruh ekosistem FloraHub.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing || isLoading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
          >
            {isRefreshing && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            <span>{isRefreshing ? "Menyegarkan..." : "Segarkan Data"}</span>
          </button>
          <Link
            href="/admin/orders"
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Pantau Pesanan
          </Link>
        </div>
      </section>

      {errorMessage && stats && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="text-xs font-semibold underline"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {stats && (
        <>
          {/* Strip KPI 4-Sel Terpadu */}
          <section aria-labelledby="kpi-platform-heading">
            <h2 id="kpi-platform-heading" className="sr-only">
              Ringkasan Kinerja Platform
            </h2>
            <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-surface sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Pengguna */}
              <div className="border-b border-border p-5 sm:border-r lg:border-b-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Pengguna
                </p>
                <p className="mt-3 text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                  {stats.users.total.toLocaleString("id-ID")}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold tabular-nums text-success">
                    {stats.users.active.toLocaleString("id-ID")} aktif
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {stats.users.customers.toLocaleString("id-ID")} customer
                  </span>
                </div>
              </div>

              {/* GMV Lunas Customer (B2C) */}
              <div className="border-b border-border p-5 lg:border-b-0 lg:border-r">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  GMV Terbayar B2C
                </p>
                <p className="mt-3 text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                  {formatRupiah(stats.b2cOrders.settledRevenue)}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">
                    {stats.b2cOrders.deliveredCount.toLocaleString("id-ID")}
                  </span>{" "}
                  pesanan sampai ke customer
                </div>
              </div>

              {/* Nilai Penjualan Stok B2B */}
              <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Pasokan Stok B2B
                </p>
                <p className="mt-3 text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                  {formatRupiah(stats.b2bSupply.directSales.settledRevenue)}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">
                    {stats.b2bSupply.directSales.total.toLocaleString("id-ID")}
                  </span>{" "}
                  transaksi langsung
                </div>
              </div>

              {/* Komitmen Pre-Order Panen B2B */}
              <div className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Komitmen Panen B2B
                </p>
                <p className="mt-3 text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                  {formatRupiah(stats.b2bSupply.preOrders.committedValue)}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">
                    {stats.b2bSupply.preOrders.total.toLocaleString("id-ID")}
                  </span>{" "}
                  kontrak pre-order panen
                </div>
              </div>
            </div>
          </section>

          {/* Breakdown Perbandingan Saluran: B2C vs B2B */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Panel Pesanan Retail B2C */}
            <section
              aria-labelledby="b2c-channel-heading"
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
                <h2
                  id="b2c-channel-heading"
                  className="text-base font-bold text-foreground"
                >
                  Pesanan Retail Pembeli (B2C)
                </h2>
                <span className="rounded-md border border-border bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  Customer → Florist
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3.5">
                <div className="rounded-md border border-border bg-surface-container-low/60 p-4">
                  <span className="text-xs text-muted-foreground">
                    Total Pesanan Masuk
                  </span>
                  <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                    {stats.b2cOrders.total.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-surface-container-low/60 p-4">
                  <span className="text-xs text-muted-foreground">
                    Pesanan Berhasil Sampai
                  </span>
                  <p className="mt-1 text-xl font-bold tabular-nums text-success">
                    {stats.b2cOrders.deliveredCount.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-surface-container-low/60 p-4">
                  <span className="text-xs font-medium text-warning">
                    Menunggu Pembayaran
                  </span>
                  <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                    {stats.b2cOrders.pendingCount.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-surface-container-low/60 p-4">
                  <span className="text-xs font-medium text-error">
                    Pesanan Dibatalkan
                  </span>
                  <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                    {stats.b2cOrders.cancelledCount.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface-container-low px-4 py-3 text-xs text-muted-foreground">
                <span>Katalog Bunga Aktif di Etalase</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {stats.catalog.activeProducts.toLocaleString("id-ID")} dari{" "}
                  {stats.catalog.totalProducts.toLocaleString("id-ID")} produk (
                  {stats.catalog.totalCategories.toLocaleString("id-ID")}{" "}
                  kategori)
                </span>
              </div>
            </section>

            {/* Panel Rantai Pasok B2B */}
            <section
              aria-labelledby="b2b-channel-heading"
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
                <h2
                  id="b2b-channel-heading"
                  className="text-base font-bold text-foreground"
                >
                  Pasokan Petani Kebun (B2B)
                </h2>
                <span className="rounded-md border border-border bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  Supplier → Florist
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3.5">
                <div className="rounded-md border border-border bg-surface-container-low/60 p-4">
                  <span className="text-xs text-muted-foreground">
                    Penjualan Stok Langsung
                  </span>
                  <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                    {stats.b2bSupply.directSales.total.toLocaleString("id-ID")}
                  </p>
                  <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                    {stats.b2bSupply.directSales.pendingCount.toLocaleString(
                      "id-ID",
                    )}{" "}
                    menunggu bayar
                  </span>
                </div>
                <div className="rounded-md border border-border bg-surface-container-low/60 p-4">
                  <span className="text-xs text-muted-foreground">
                    Pre-Order Panen Musiman
                  </span>
                  <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                    {stats.b2bSupply.preOrders.total.toLocaleString("id-ID")}
                  </p>
                  <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                    {stats.b2bSupply.preOrders.waitingDepositCount.toLocaleString(
                      "id-ID",
                    )}{" "}
                    menunggu DP
                  </span>
                </div>
                <div className="col-span-2 rounded-md border border-border bg-surface-container-low/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-foreground">
                        Pre-Order Perlu Respon Kebun
                      </span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Pesanan panen yang menunggu konfirmasi ketersediaan
                        supplier
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-warning/25 bg-warning/10 px-2.5 py-1 text-xs font-bold tabular-nums text-warning">
                      {stats.b2bSupply.preOrders.pendingApprovalCount.toLocaleString(
                        "id-ID",
                      )}{" "}
                      menunggu
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface-container-low px-4 py-3 text-xs text-muted-foreground">
                <span>Mitra Usaha Terdaftar</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {stats.users.florists.toLocaleString("id-ID")} Florist ·{" "}
                  {stats.users.suppliers.toLocaleString("id-ID")} Kebun Supplier
                </span>
              </div>
            </section>
          </div>
        </>
      )}

      {/* Navigasi Modul Utama Platform */}
      <section aria-labelledby="modul-admin-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2
              id="modul-admin-heading"
              className="text-lg font-semibold text-foreground"
            >
              Modul Operasional Admin
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pilih modul untuk mengelola pengguna, memantau transaksi, atau
              mengaudit aktivitas platform.
            </p>
          </div>
          <Link
            href="/admin/audit-logs"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Buka audit log →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="m-card group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 hover:border-primary/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md border border-border bg-surface-container-low px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                    {item.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                <span>Buka Modul</span>
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
