"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { LoadingSpinner, ErrorState, EmptyState, SearchInput } from "@/components/ui";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";
import { formatDateTime, formatRupiah } from "@/lib/utils/formatters";

// Interface data pesanan customer untuk dashboard florist
interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      image: string;
    };
  }>;
  payment: {
    status: string;
    method: string;
  } | null;
  shipment: {
    id: string;
    status: string;
    courier: string;
    trackingNumber: string | null;
  } | null;
}

// Halaman pengelolaan daftar pesanan masuk untuk toko florist
export default function FloristOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchOrders = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadOrders() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchPaginatedCollection<Order>("/api/florist/orders", "orders");
        if (!cancelled) {
          setOrders(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat pesanan");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      order.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getPaymentStatusBadge = (status?: string, orderStatus?: string) => {
    if (orderStatus === "CANCELLED" || status === "FAILED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          Dibatalkan
        </span>
      );
    }
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-low text-muted-foreground border border-border">
          Menunggu
        </span>
      );
    }
    const badges: Record<string, { label: string; className: string }> = {
      PAID: { label: "Lunas", className: "bg-success/10 text-success border-success/20" },
      PENDING: { label: "Menunggu", className: "bg-amber-50 text-amber-700 border-amber-200" },
      FAILED: { label: "Dibatalkan", className: "bg-red-50 text-red-700 border-red-200" },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const getShipmentStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-low text-muted-foreground border border-border">
          Belum Dikirim
        </span>
      );
    }
    const badges: Record<string, { label: string; className: string }> = {
      PROCESSING: { label: "Sedang Dirakit", className: "bg-blue-50 text-blue-700 border-blue-200" },
      READY_TO_SHIP: { label: "Siap Dikirim", className: "bg-primary/10 text-primary border-primary/20" },
      SHIPPED: { label: "Dalam Pengiriman", className: "bg-sky-50 text-sky-700 border-sky-200" },
      DELIVERED: { label: "Selesai", className: "bg-success/10 text-success border-success/20" },
    };
    const badge = badges[status] || badges.PROCESSING;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const pendingProcessCount = orders.filter((o) => o.status === "PAID" && !o.shipment).length;
  const inDeliveryCount = orders.filter((o) => o.shipment?.status === "SHIPPED").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Restrained Dark Header for Rhythm */}
      <div className="flex flex-col gap-6 rounded-[24px] bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Operasional Pesanan
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Pesanan
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Pesanan masuk, pembayaran, dan pengiriman ke customer.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/florist/shipments"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10"
          >
            Buka Pengiriman
          </Link>
          <button
            type="button"
            onClick={fetchOrders}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Perbarui Data
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Pesanan</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{orders.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Semua riwayat pesanan</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Perlu Diproses</p>
          <p className={`mt-2 text-3xl font-bold tracking-tight ${pendingProcessCount > 0 ? "text-amber-600" : "text-foreground"}`}>
            {pendingProcessCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Sudah dibayar & belum ada shipment</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dalam Pengiriman</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {inDeliveryCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Sedang dibawa kurir ekspedisi</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-56">
            <label htmlFor="order-status-filter" className="sr-only">Filter Status</label>
            <select
              id="order-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-container-low px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">Semua Status Pesanan</option>
              <option value="PAID">Perlu Diproses (Lunas)</option>
              <option value="PROCESSING">Sedang Dirakit</option>
              <option value="READY_TO_SHIP">Siap Dikirim</option>
              <option value="SHIPPED">Dalam Pengiriman</option>
              <option value="DELIVERED">Selesai Diterima</option>
            </select>
          </div>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari nomor pesanan, nama customer, atau email..."
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && <LoadingSpinner message="Memuat daftar pesanan..." />}

      {/* Error State */}
      {error && !isLoading && (
        <ErrorState
          title="Gagal Memuat Pesanan"
          error={error}
          onRetry={fetchOrders}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredOrders.length === 0 && (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title={searchQuery || statusFilter !== "ALL" ? "Tidak ada pesanan yang sesuai" : "Belum ada pesanan masuk"}
          description={
            searchQuery || statusFilter !== "ALL"
              ? "Coba sesuaikan kata kunci pencarian atau ganti filter status."
              : "Pesanan baru dari customer akan otomatis muncul di sini setelah pembayaran berhasil diverifikasi."
          }
        />
      )}

      {/* Orders Table */}
      {!isLoading && !error && filteredOrders.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead className="border-b border-border bg-surface-container-low/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3.5">No. Pesanan</th>
                  <th scope="col" className="px-5 py-3.5">Customer</th>
                  <th scope="col" className="px-5 py-3.5">Tanggal</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Total Tagihan</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Status Bayar</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Status Kirim</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-surface-container-low/40">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-foreground">
                      {order.orderNumber}
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <p className="font-medium text-foreground">{order.user.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-foreground">
                      {formatRupiah(order.totalAmount)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {getPaymentStatusBadge(order.payment?.status, order.status)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {getShipmentStatusBadge(order.shipment?.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/florist/orders/${order.id}`}
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
