"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  Users,
  ShoppingBag,
  TicketPercent,
  ClipboardList,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Sprout,
  Store,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { fetchAdminStats, type AdminDashboardStats } from "@/lib/api/admin";
import { formatRupiah } from "@/lib/utils/formatters";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    try {
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
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchStats(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchStats]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchStats();
  };

  const quickLinks = [
    {
      title: "Manajemen Akun",
      description: "Pengawasan status aktif dan verifikasi pengguna platform",
      href: "/admin/users",
      icon: Users,
      badge: "User Directory",
    },
    {
      title: "Pesanan & Pasokan",
      description: "Observasi transaksi pesanan pembeli dan rantai pasok B2B",
      href: "/admin/orders",
      icon: ShoppingBag,
      badge: "B2C + B2B",
    },
    {
      title: "Kupon & Promosi",
      description: "Pengaturan kode promosi dan diskon belanja platform",
      href: "/admin/coupons",
      icon: TicketPercent,
      badge: "Marketing",
    },
    {
      title: "Log Audit Sistem",
      description: "Rekaman jejak aktivitas dan mutasi data sensitif admin",
      href: "/admin/audit-logs",
      icon: ClipboardList,
      badge: "Security",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner Operasional (FundedNext dark hero style) */}
      <section className="relative overflow-hidden rounded-2xl bg-surface-dark p-6 text-white sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold tracking-wider text-kicker uppercase">
              <ShieldAlert className="h-3.5 w-3.5" />
              Pusat Kendali Platform
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Selamat Datang, {session?.user?.name || "Administrator"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70 sm:text-base">
              Pantau volume transaksi customer, komitmen pasokan panen kebun,
              serta integritas operasional platform secara real-time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isLoading}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Segarkan Data</span>
          </button>
        </div>
        {/* Elemen Dekorasi Latar Belakang */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
          aria-hidden="true"
        />
      </section>
      {/* Kondisi Loading & Error */}
      {isLoading && !stats ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border bg-surface p-8">
          <LoadingSpinner />
        </div>
      ) : errorMessage && !stats ? (
        <ErrorState
          title="Gagal Memuat Analitik"
          error={errorMessage}
          onRetry={() => void handleRefresh()}
        />
      ) : stats ? (
        <>
          {/* 4 Kartu Metrik Utama Platform */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Pengguna */}
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Pengguna
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {stats.users.total}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-semibold text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  {stats.users.active} aktif
                </span>
                <span>•</span>
                <span>{stats.users.customers} customer</span>
              </div>
            </div>
            {/* GMV Lunas Customer (B2C) */}
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  GMV Terbayar B2C
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {formatRupiah(stats.b2cOrders.settledRevenue)}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {stats.b2cOrders.deliveredCount}
                </span>{" "}
                pesanan terkirim
              </div>
            </div>
            {/* Nilai Penjualan Stok B2B */}
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pasokan Stok B2B
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Store className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {formatRupiah(stats.b2bSupply.directSales.settledRevenue)}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {stats.b2bSupply.directSales.total}
                </span>{" "}
                transaksi langsung
              </div>
            </div>
            {/* Komitmen Pre-Order Panen B2B */}
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Komitmen Panen B2B
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Sprout className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {formatRupiah(stats.b2bSupply.preOrders.committedValue)}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {stats.b2bSupply.preOrders.total}
                </span>{" "}
                kontrak panen
              </div>
            </div>
          </div>
          {/* Breakdown Perbandingan Channel: B2C vs B2B */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Panel Pesanan Retail B2C */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">
                    Pesanan Retail Pembeli (B2C)
                  </h2>
                </div>
                <span className="rounded-md bg-surface-container px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  Customer $\rightarrow$ Florist
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/60 bg-surface-dim p-4">
                  <span className="text-xs text-muted-foreground">
                    Total Pesanan Masuk
                  </span>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {stats.b2cOrders.total}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface-dim p-4">
                  <span className="text-xs text-muted-foreground">
                    Pesanan Berhasil Sampai
                  </span>
                  <p className="mt-1 text-xl font-bold text-success">
                    {stats.b2cOrders.deliveredCount}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface-dim p-4">
                  <div className="flex items-center gap-1.5 text-xs text-amber-600">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Menunggu Pembayaran</span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {stats.b2cOrders.pendingCount}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface-dim p-4">
                  <div className="flex items-center gap-1.5 text-xs text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Pesanan Dibatalkan</span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {stats.b2cOrders.cancelledCount}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-dim px-4 py-3 text-xs text-muted-foreground">
                <span>Katalog Bunga Aktif di Etalase</span>
                <span className="font-bold text-foreground">
                  {stats.catalog.activeProducts} dari{" "}
                  {stats.catalog.totalProducts} produk (
                  {stats.catalog.totalCategories} kategori)
                </span>
              </div>
            </div>
            {/* Panel Rantai Pasok B2B */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <Sprout className="h-5 w-5 text-primary" />

                  <h2 className="text-base font-bold text-foreground">
                    Pasokan Petani Kebun (B2B)
                  </h2>
                </div>
                <span className="rounded-md bg-surface-container px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  Supplier $\rightarrow$ Florist
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/60 bg-surface-dim p-4">
                  <span className="text-xs text-muted-foreground">
                    Penjualan Stok Langsung
                  </span>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {stats.b2bSupply.directSales.total}
                  </p>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {stats.b2bSupply.directSales.pendingCount} menunggu bayar
                  </span>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface-dim p-4">
                  <span className="text-xs text-muted-foreground">
                    Pre-Order Panen Musiman
                  </span>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {stats.b2bSupply.preOrders.total}
                  </p>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {stats.b2bSupply.preOrders.waitingDepositCount} menunggu DP
                  </span>
                </div>
                <div className="col-span-2 rounded-xl border border-border/60 bg-surface-dim p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-foreground">
                        Pre-Order Perlu Respon Kebun
                      </span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Pesanan panen yang menunggu konfirmasi ketersediaan
                        supplier
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600">
                      {stats.b2bSupply.preOrders.pendingApprovalCount} pending
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-dim px-4 py-3 text-xs text-muted-foreground">
                <span>Mitra Usaha Terdaftar</span>
                <span className="font-bold text-foreground">
                  {stats.users.florists} Florist • {stats.users.suppliers} Kebun
                  Supplier
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}
      {/* Navigasi Modul Utama Platform */}
      <div>
        <h2 className="text-base font-bold text-foreground">
          Modul Operasional Admin
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pilih modul di bawah untuk mengelola data dan mengamati aktivitas
          sistem
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-md bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                  <span>Buka Modul</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
