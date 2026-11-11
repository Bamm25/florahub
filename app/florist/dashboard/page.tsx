"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Interface data ringkasan metrik dasbor toko florist
interface DashboardData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    productsSold: number;
    activeProducts: number;
    lowStockProducts: number;
    averageRating: number;
    pendingOrders: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    user: {
      name: string;
      email: string;
    };
  }>;
  floristInfo?: {
    shopName: string;
    shopDescription: string;
    logo: string | null;
    banner: string | null;
    name: string;
    email: string;
    phone: string;
    address: {
      recipientName: string;
      phone: string;
      fullAddress: string;
      city: string;
      province: string;
      postalCode: string;
    } | null;
  };
}

// Halaman dasbor utama operasional toko florist
export default function FloristDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ambil data ringkasan metrik toko dari endpoint API
  useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/florist/dashboard");
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat data dashboard");
        }
        setData(json.data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat data",
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return { label: "Perlu diproses", color: "bg-amber-50 text-amber-800 border-amber-200" };
      case "PROCESSING":
        return { label: "Sedang disiapkan", color: "bg-blue-50 text-blue-800 border-blue-200" };
      case "READY_TO_SHIP":
        return { label: "Siap dikirim", color: "bg-blue-50 text-blue-800 border-blue-200" };
      case "SHIPPED":
        return { label: "Dalam pengiriman", color: "bg-blue-50 text-blue-800 border-blue-200" };
      case "DELIVERED":
        return { label: "Selesai", color: "bg-green-50 text-green-800 border-green-200" };
      case "PENDING":
        return { label: "Menunggu pembayaran", color: "bg-amber-50 text-amber-800 border-amber-200" };
      case "CANCELLED":
        return { label: "Dibatalkan", color: "bg-surface-container-low text-muted-foreground border-border" };
      default:
        return { label: status.replaceAll("_", " "), color: "bg-surface-container-low text-muted-foreground border-border" };
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center" role="status">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Memuat ringkasan toko...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold text-foreground">Ringkasan belum dapat dimuat</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Coba lagi
        </button>
      </div>
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
    <div className="mx-auto max-w-7xl space-y-8 lg:space-y-10">
      <div className="flex flex-col gap-8 rounded-[24px] bg-[#10121b] px-6 py-9 text-white sm:px-9 sm:py-10 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b4aeff]">
            {floristInfo?.shopName || "Toko florist"}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Ringkasan toko
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
            Pesanan, produk, dan stok yang perlu Anda pantau.
          </p>
        </div>
        <Link
          href="/florist/orders"
          className="inline-flex min-h-12 w-fit items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b4aeff]"
        >
          Kelola pesanan
        </Link>
      </div>

      <section aria-labelledby="prioritas-heading">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 id="prioritas-heading" className="text-lg font-semibold text-foreground">Perlu diperhatikan</h2>
            <p className="mt-1 text-sm text-muted-foreground">Jumlah pesanan mencakup yang menunggu pembayaran dan sedang diproses.</p>
          </div>
          <Link href="/florist/inventory" className="text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Cek stok
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/florist/orders" className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <p className="text-sm font-medium text-muted-foreground">Pesanan belum selesai</p>
            <p className="mt-3 text-4xl font-bold tracking-tight text-foreground">{summary.pendingOrders}</p>
            <p className="mt-3 text-sm font-semibold text-primary group-hover:underline">Lihat pesanan</p>
          </Link>
          <Link href="/florist/products" className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <p className="text-sm font-medium text-muted-foreground">Produk dengan stok di bawah 10</p>
            <p className="mt-3 text-4xl font-bold tracking-tight text-foreground">{summary.lowStockProducts}</p>
            <p className="mt-3 text-sm font-semibold text-primary group-hover:underline">Periksa produk</p>
          </Link>
        </div>
      </section>

      <section aria-labelledby="kinerja-heading">
        <h2 id="kinerja-heading" className="mb-4 text-lg font-semibold text-foreground">Kinerja toko</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted-foreground">Pendapatan dari pesanan selesai</p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{formatRupiah(summary.totalRevenue)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Bukan total seluruh pesanan</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted-foreground">Total pesanan</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{summary.totalOrders}</p>
            <p className="mt-2 text-xs text-muted-foreground">Semua status</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted-foreground">Produk aktif</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{summary.activeProducts}</p>
            <p className="mt-2 text-xs text-muted-foreground">Tampil di katalog</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="recent-heading" className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <h2 id="recent-heading" className="text-lg font-semibold text-foreground">Pesanan terbaru</h2>
            <p className="mt-1 text-sm text-muted-foreground">Lima pesanan terakhir, termasuk yang belum dibayar.</p>
          </div>
          <Link href="/florist/orders" className="text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Semua pesanan
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-6 py-12">
            <p className="text-sm font-semibold text-foreground">Belum ada pesanan</p>
            <p className="mt-1 text-sm text-muted-foreground">Pesanan baru akan muncul di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-sm">
              <thead className="border-b border-border bg-surface-container-low/50 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium sm:px-6">Pesanan</th>
                  <th scope="col" className="px-5 py-3 font-medium sm:px-6">Pembeli</th>
                  <th scope="col" className="px-5 py-3 font-medium sm:px-6">Tanggal</th>
                  <th scope="col" className="px-5 py-3 font-medium sm:px-6">Total pesanan</th>
                  <th scope="col" className="px-5 py-3 font-medium sm:px-6">Status</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-surface-container-low/40">
                      <td className="px-5 py-4 font-semibold text-foreground sm:px-6">{order.orderNumber}</td>
                      <td className="px-5 py-4 sm:px-6">
                        <p className="font-medium text-foreground">{order.user.name}</p>
                        <p className="text-xs text-muted-foreground">{order.user.email}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground sm:px-6">
                        {new Date(order.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-foreground sm:px-6">{formatRupiah(order.totalAmount)}</td>
                      <td className="px-5 py-4 sm:px-6">
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right sm:px-6">
                        <Link href={`/florist/orders/${order.id}`} className="whitespace-nowrap text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                          Lihat detail
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

      {floristInfo?.address && (
        <p className="border-t border-border pt-5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Alamat toko:</span>{" "}
          {floristInfo.address.fullAddress}, {floristInfo.address.city}, {floristInfo.address.province} {floristInfo.address.postalCode}
          {" · "}
          <Link href="/florist/settings/shop" className="font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Ubah alamat</Link>
        </p>
      )}
      {!floristInfo?.address && (
        <p className="border-t border-border pt-5 text-sm text-muted-foreground">
          Alamat toko belum tersedia. <Link href="/florist/settings/shop" className="font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Lengkapi profil toko</Link>
        </p>
      )}
    </div>
  );
}
