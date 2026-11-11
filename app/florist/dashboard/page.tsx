"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Boxes,
  Truck,
  MapPin,
  RotateCcw,
} from "lucide-react";

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

export default function FloristDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        return {
          label: "Perlu Diproses",
          color: "bg-primary/10 text-primary border-primary/20",
        };
      case "PROCESSING":
        return {
          label: "Sedang Dirakit",
          color: "bg-tertiary/10 text-tertiary border-tertiary/20",
        };
      case "READY_TO_SHIP":
        return {
          label: "Siap Dikirim",
          color: "bg-secondary/15 text-secondary border-secondary/30",
        };
      case "SHIPPED":
        return {
          label: "Dalam Pengiriman",
          color: "bg-tertiary/15 text-tertiary border-tertiary/30",
        };
      case "DELIVERED":
        return {
          label: "Selesai",
          color: "bg-success/10 text-success border-success/20",
        };
      case "PENDING":
        return {
          label: "Menunggu Bayar",
          color: "bg-warning/10 text-warning border-warning/20",
        };
      default:
        return {
          label: status,
          color: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-surface-container border-t-primary"></div>
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Memuat ringkasan performa toko...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-error/20 bg-error/5 p-8 text-center max-w-xl mx-auto">
        <AlertTriangle className="h-10 w-10 text-error mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground mb-1">
          Gagal Memuat Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary inline-flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Coba Muat Ulang</span>
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
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Ringkasan Operasional
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau arus pesanan, pendapatan toko, dan ketersediaan stok bunga
            secara real-time.
          </p>
          {floristInfo?.address && (
            <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>
                {floristInfo.shopName} • {floristInfo.address.fullAddress}, {floristInfo.address.city}, {floristInfo.address.province} {floristInfo.address.postalCode}
              </span>
            </p>
          )}
          <Link href="/florist/settings/shop" className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline">
            Kelola profil & alamat toko
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/florist/orders"
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Kelola Pesanan</span>
          </Link>
          <Link
            href="/florist/inventory"
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Boxes className="h-4 w-4" />
            <span>Inventori Bunga</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Pendapatan
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {formatRupiah(summary.totalRevenue)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Dari {summary.totalOrders} total pesanan customer
          </p>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Perlu Diproses
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {summary.pendingOrders}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Pesanan masuk yang siap dirakit & dikirim
          </p>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Katalog Produk
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {summary.activeProducts}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Produk buket & karangan aktif di etalase
          </p>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Peringatan Stok
            </span>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                summary.lowStockProducts > 0
                  ? "bg-warning/15 text-warning"
                  : "bg-success/15 text-success"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {summary.lowStockProducts}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {summary.lowStockProducts > 0
              ? "Bahan baku mendekati batas minimum"
              : "Semua persediaan bunga dalam kondisi aman"}
          </p>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Pesanan Masuk Terbaru
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              5 pesanan terakhir yang dipesan oleh customer
            </p>
          </div>
          <Link
            href="/florist/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <span>Semua Pesanan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-muted-foreground mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Belum ada pesanan masuk
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Pesanan dari customer akan otomatis muncul di sini begitu
              pembayaran berhasil dikonfirmasi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low/50 text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">No. Pesanan</th>
                  <th className="px-6 py-3.5 font-semibold">Customer</th>
                  <th className="px-6 py-3.5 font-semibold">Tanggal</th>
                  <th className="px-6 py-3.5 font-semibold">Total Tagihan</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-surface-container-low/40 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-foreground">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">
                          {order.user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.user.email}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">
                        {formatRupiah(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/florist/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                        >
                          <span>Lihat Detail</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
