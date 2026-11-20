"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Package, RefreshCw, Truck } from "lucide-react";
import {
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Pagination,
  SearchInput,
} from "@/components/ui";
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

const ORDERS_PER_PAGE = 10;

const ORDER_STATUS_FILTERS = [
  { value: "ALL", label: "Semua" },
  { value: "PAID", label: "Perlu Diproses" },
  { value: "PROCESSING", label: "Sedang Dirakit" },
  { value: "READY_TO_SHIP", label: "Siap Dikirim" },
  { value: "SHIPPED", label: "Dalam Pengiriman" },
  { value: "DELIVERED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
] as const;

// Halaman pengelolaan daftar pesanan masuk untuk toko florist
export default function FloristOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      order.orderNumber.toLowerCase().includes(query) ||
      order.user.name.toLowerCase().includes(query) ||
      order.user.email.toLowerCase().includes(query) ||
      order.items.some((item) => item.product.name.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const getPaymentStatusBadge = (status?: string, orderStatus?: string) => {
    if (orderStatus === "CANCELLED" || status === "FAILED") {
      return (
        <span className="inline-flex items-center rounded-full border border-error/25 bg-error/10 px-2.5 py-0.5 text-xs font-medium text-error">
          Dibatalkan
        </span>
      );
    }
    if (!status) {
      return (
        <span className="inline-flex items-center rounded-full border border-border bg-surface-container-low px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          Menunggu
        </span>
      );
    }
    const badges: Record<string, { label: string; className: string }> = {
      PAID: { label: "Lunas", className: "bg-success/10 text-success border-success/20" },
      PENDING: { label: "Menunggu", className: "bg-warning/10 text-warning border-warning/25" },
      FAILED: { label: "Dibatalkan", className: "bg-error/10 text-error border-error/25" },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const getFulfillmentStatusBadge = (order: Order) => {
    const effectiveStatus = order.shipment?.status || order.status;
    const badges: Record<string, { label: string; className: string }> = {
      PENDING: {
        label: "Menunggu Bayar",
        className: "bg-surface-container-low text-muted-foreground border-border",
      },
      PAID: {
        label: "Perlu Diproses",
        className: "bg-warning/10 text-warning border-warning/25",
      },
      PROCESSING: {
        label: "Sedang Dirakit",
        className: "bg-info/10 text-info border-info/25",
      },
      READY_TO_SHIP: {
        label: "Siap Dikirim",
        className: "bg-primary/10 text-primary border-primary/20",
      },
      SHIPPED: {
        label: "Dalam Pengiriman",
        className: "bg-info/10 text-info border-info/25",
      },
      DELIVERED: {
        label: "Selesai",
        className: "bg-success/10 text-success border-success/20",
      },
      CANCELLED: {
        label: "Dibatalkan",
        className: "bg-error/10 text-error border-error/25",
      },
    };
    const badge = badges[effectiveStatus] || {
      label: effectiveStatus,
      className: "bg-surface-container-low text-muted-foreground border-border",
    };
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const pendingProcessCount = orders.filter((o) => o.status === "PAID" && !o.shipment).length;
  const inDeliveryCount = orders.filter(
    (o) => o.status === "SHIPPED" || o.shipment?.status === "SHIPPED",
  ).length;
  const completedCount = orders.filter(
    (o) => o.status === "DELIVERED" || o.shipment?.status === "DELIVERED",
  ).length;

  const getFilterCount = (filterValue: string) => {
    if (filterValue === "ALL") return orders.length;
    return orders.filter((o) => o.status === filterValue).length;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Editorial Dark Header */}
      <section className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Operasional Pesanan
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Pesanan Customer
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Kelola pesanan masuk, pantau verifikasi pembayaran, dan terbitkan resi pengiriman ke customer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/florist/shipments"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Truck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Menu Pengiriman</span>
          </Link>
          <button
            type="button"
            onClick={fetchOrders}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Perbarui Data</span>
          </button>
        </div>
      </section>

      {/* Ringkasan Operasional */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Pesanan
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-foreground">
            {orders.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Seluruh riwayat transaksi
          </p>
        </div>
        <div
          className={`rounded-2xl border p-5 ${
            pendingProcessCount > 0
              ? "border-warning/35 bg-warning/[0.04]"
              : "border-border bg-surface"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Perlu Diproses
          </p>
          <p
            className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${
              pendingProcessCount > 0 ? "text-warning" : "text-foreground"
            }`}
          >
            {pendingProcessCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Lunas & belum dibuatkan resi
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dalam Pengiriman
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-info">
            {inDeliveryCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sedang diantar kurir
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Selesai Diterima
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-success">
            {completedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pesanan tuntas terkirim
          </p>
        </div>
      </div>

      {/* Filter Status Pills & Pencarian */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div
          role="group"
          aria-label="Filter status pesanan"
          className="flex flex-wrap gap-2"
        >
          {ORDER_STATUS_FILTERS.map((tab) => {
            const count = getFilterCount(tab.value);
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setCurrentPage(1);
                }}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[11px] tabular-nums ${
                    isActive
                      ? "bg-white/20 text-primary-foreground"
                      : "bg-surface-container-low text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <SearchInput
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setCurrentPage(1);
          }}
          placeholder="Cari nomor pesanan, nama customer, email, atau nama buket..."
        />
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
          icon={<Package className="h-6 w-6" aria-hidden="true" />}
          title={
            searchQuery || statusFilter !== "ALL"
              ? "Tidak ada pesanan yang sesuai"
              : "Belum ada pesanan masuk"
          }
          description={
            searchQuery || statusFilter !== "ALL"
              ? "Coba sesuaikan kata kunci pencarian atau pilih filter status lainnya."
              : "Pesanan baru dari customer akan otomatis muncul di sini setelah checkout."
          }
        />
      )}

      {/* Orders Table */}
      {!isLoading && !error && filteredOrders.length > 0 && (() => {
        const totalOrderPages = Math.max(
          1,
          Math.ceil(filteredOrders.length / ORDERS_PER_PAGE),
        );
        const safeOrderPage = Math.min(currentPage, totalOrderPages);
        const orderStart = (safeOrderPage - 1) * ORDERS_PER_PAGE;
        const paginatedOrders = filteredOrders.slice(
          orderStart,
          orderStart + ORDERS_PER_PAGE,
        );

        return (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-195 text-left text-sm">
                  <thead className="border-b border-border bg-surface-container-low/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">
                        Pesanan &amp; Produk
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Customer
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Waktu Pesan
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Total Tagihan
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-center">
                        Pembayaran
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-center">
                        Status Pesanan
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedOrders.map((order) => {
                      const totalItemsCount = order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      );
                      const firstProductName =
                        order.items[0]?.product.name || "Produk Buket";
                      const extraProductsCount = Math.max(0, order.items.length - 1);

                      return (
                        <tr
                          key={order.id}
                          className="transition-colors hover:bg-surface-container-low/40"
                        >
                          <td className="px-5 py-4">
                            <Link
                              href={`/florist/orders/${order.id}`}
                              className="font-mono text-xs font-bold text-foreground hover:text-primary hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                            <p className="mt-0.5 max-w-56 truncate text-xs text-muted-foreground">
                              {firstProductName}
                              {extraProductsCount > 0
                                ? ` (+${extraProductsCount} lainnya)`
                                : ""}{" "}
                              · {totalItemsCount} unit
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-foreground">
                              {order.user.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {order.user.email}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-xs tabular-nums text-muted-foreground">
                            <time dateTime={order.createdAt}>
                              {formatDateTime(order.createdAt)}
                            </time>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-foreground">
                            {formatRupiah(order.totalAmount)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {getPaymentStatusBadge(order.payment?.status, order.status)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {getFulfillmentStatusBadge(order)}
                              {order.shipment?.trackingNumber && (
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {order.shipment.courier}: {order.shipment.trackingNumber}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/florist/orders/${order.id}`}
                                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              >
                                Detail
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredOrders.length > ORDERS_PER_PAGE && (
              <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-3.5 sm:flex-row">
                <p className="text-xs tabular-nums text-muted-foreground">
                  Menampilkan {orderStart + 1}–
                  {Math.min(orderStart + ORDERS_PER_PAGE, filteredOrders.length)}{" "}
                  dari {filteredOrders.length} pesanan
                </p>
                <Pagination
                  currentPage={safeOrderPage}
                  totalPages={totalOrderPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  ariaLabel="Navigasi halaman pesanan"
                />
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
