"use client";

import Modal from "@/components/forms/Modal";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import FilterBar from "@/components/ui/FilterBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import TabNavigation from "@/components/ui/TabNavigation";
import TrackingProgressTrack from "@/components/ui/TrackingProgressTrack";
import {
  fetchAdminOrders,
  fetchAdminSupplyOrders,
  type AdminB2COrderItem,
  type AdminOrdersPage,
  type AdminOrderStatus,
  type AdminSupplyItem,
  type AdminSupplyPage,
  type AdminSupplyType,
} from "@/lib/api/admin";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/utils/formatters";
import {
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type MonitoringTab = "B2C" | "B2B";

const B2C_TRACKING_STEPS = [
  "Pesanan Dibuat",
  "Pembayaran Lunas",
  "Dikirim Kurir",
  "Pesanan Selesai",
] as const;

const B2B_DIRECT_STEPS = [
  "Pesanan Dibuat",
  "Pembayaran Lunas",
  "Dikirim Kurir",
  "Diterima Florist",
] as const;

const B2B_PREORDER_STEPS = [
  "Pre-Order Dibuat",
  "DP & Pelunasan",
  "Dikirim Kurir",
  "Diterima Florist",
] as const;

const b2cStatusFilters = [
  { id: "ALL", label: "Semua Status" },
  { id: "PENDING", label: "Menunggu Bayar" },
  { id: "PAID", label: "Dibayar" },
  { id: "PROCESSING", label: "Diproses" },
  { id: "READY_TO_SHIP", label: "Siap Kirim" },
  { id: "SHIPPED", label: "Dikirim" },
  { id: "DELIVERED", label: "Selesai" },
  { id: "CANCELLED", label: "Dibatalkan" },
];

const directSupplyStatusFilters = [
  { id: "ALL", label: "Semua Status" },
  { id: "PENDING", label: "Menunggu" },
  { id: "PAID", label: "Dibayar" },
  { id: "SHIPPED", label: "Dikirim" },
  { id: "DELIVERED", label: "Diterima" },
  { id: "CANCELLED", label: "Dibatalkan" },
];

const preOrderSupplyStatusFilters = [
  { id: "ALL", label: "Semua Status" },
  { id: "PENDING", label: "Menunggu Konfirmasi" },
  { id: "CONFIRMED", label: "Menunggu DP" },
  { id: "DEPOSIT_PAID", label: "DP Dibayar" },
  { id: "PAID", label: "Lunas" },
  { id: "SHIPPED", label: "Dikirim" },
  { id: "DELIVERED", label: "Diterima" },
  { id: "CANCELLED", label: "Dibatalkan" },
  { id: "EXPIRED", label: "Kedaluwarsa" },
];

const statusDisplayMap: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Menunggu",
    className: "border-warning/25 bg-warning/10 text-warning",
  },
  CONFIRMED: {
    label: "Menunggu DP",
    className: "border-warning/25 bg-warning/10 text-warning",
  },
  DEPOSIT_PAID: {
    label: "DP Dibayar",
    className: "border-primary/25 bg-primary/10 text-primary",
  },
  PAID: {
    label: "Lunas / Dibayar",
    className: "border-success/25 bg-success/10 text-success",
  },
  PROCESSING: {
    label: "Diproses",
    className: "border-primary/25 bg-primary/10 text-primary",
  },
  READY_TO_SHIP: {
    label: "Siap Kirim",
    className: "border-primary/25 bg-primary/10 text-primary",
  },
  SHIPPED: {
    label: "Dikirim",
    className: "border-info/25 bg-info/10 text-info",
  },
  DELIVERED: {
    label: "Selesai / Diterima",
    className: "border-success/25 bg-success/10 text-success",
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "border-error/25 bg-error/10 text-error",
  },
  FAILED: {
    label: "Gagal",
    className: "border-error/25 bg-error/10 text-error",
  },
  EXPIRED: {
    label: "Kedaluwarsa",
    className: "border-border bg-surface-container text-muted-foreground",
  },
};

function renderStatusBadge(status: string) {
  const cfg = statusDisplayMap[status] ?? {
    label: status,
    className: "border-border bg-surface-container text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function getB2CTrackingProgress(order: AdminB2COrderItem) {
  const isCancelled = order.status === "CANCELLED";
  const isCompletedAll = order.status === "DELIVERED";
  let activeStepIndex = 0;

  if (isCompletedAll) {
    activeStepIndex = 3;
  } else if (order.status === "SHIPPED") {
    activeStepIndex = 2;
  } else if (
    ["PAID", "PROCESSING", "READY_TO_SHIP"].includes(order.status) ||
    order.payment?.status === "PAID"
  ) {
    activeStepIndex = 1;
  }

  return { isCancelled, isCompletedAll, activeStepIndex };
}

function getB2BTrackingProgress(supply: AdminSupplyItem) {
  const isCancelled =
    supply.status === "CANCELLED" || supply.status === "EXPIRED";
  const isCompletedAll = supply.status === "DELIVERED";
  let activeStepIndex = 0;

  if (isCompletedAll) {
    activeStepIndex = 3;
  } else if (supply.status === "SHIPPED") {
    activeStepIndex = 2;
  } else if (
    (supply.type === "DIRECT" && supply.status === "PAID") ||
    (supply.type === "PREORDER" &&
      ["DEPOSIT_PAID", "PAID"].includes(supply.status))
  ) {
    activeStepIndex = 1;
  }

  return {
    steps: supply.type === "PREORDER" ? B2B_PREORDER_STEPS : B2B_DIRECT_STEPS,
    isCancelled,
    isCompletedAll,
    activeStepIndex,
  };
}

export default function AdminOrdersMonitoringPage() {
  const [activeTab, setActiveTab] = useState<MonitoringTab>("B2C");
  const [supplyType, setSupplyType] = useState<AdminSupplyType>("DIRECT");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [b2cData, setB2cData] = useState<AdminOrdersPage | null>(null);
  const [b2bData, setB2bData] = useState<AdminSupplyPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedOrder, setSelectedOrder] = useState<AdminB2COrderItem | null>(
    null,
  );
  const [selectedSupply, setSelectedSupply] = useState<AdminSupplyItem | null>(
    null,
  );

  // Debounce pencarian agar tidak membanjiri API saat mengetik
  useEffect(() => {
    if (query.trim() === search) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setSearch(query.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (query.trim() !== search) return;
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          if (activeTab === "B2C") {
            const res = await fetchAdminOrders(
              {
                page,
                limit: 20,
                status:
                  statusFilter === "ALL"
                    ? undefined
                    : (statusFilter as AdminOrderStatus),
                search: search || undefined,
              },
              controller.signal,
            );
            if (!controller.signal.aborted) {
              setB2cData(res);
              setError(null);
              setLoading(false);
            }
          } else {
            const res = await fetchAdminSupplyOrders(
              {
                type: supplyType,
                page,
                limit: 20,
                status: statusFilter === "ALL" ? undefined : statusFilter,
                search: search || undefined,
              },
              controller.signal,
            );
            if (!controller.signal.aborted) {
              setB2bData(res);
              setError(null);
              setLoading(false);
            }
          }
        } catch (err) {
          if (
            controller.signal.aborted ||
            (err instanceof Error && err.name === "AbortError")
          ) {
            return;
          }
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat data monitoring transaksi",
          );
          setLoading(false);
        }
      })();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeTab, supplyType, statusFilter, page, search, query, refreshKey]);

  const handleTabChange = (nextTabId: string) => {
    const nextTab = nextTabId === "B2B" ? "B2B" : "B2C";
    if (nextTab === activeTab) return;
    setLoading(true);
    setError(null);
    setActiveTab(nextTab);
    setStatusFilter("ALL");
    setPage(1);
  };

  const handleSupplyTypeChange = (nextType: AdminSupplyType) => {
    if (nextType === supplyType) return;
    setLoading(true);
    setError(null);
    setSupplyType(nextType);
    setStatusFilter("ALL");
    setPage(1);
  };

  const activeFilters =
    activeTab === "B2C"
      ? b2cStatusFilters
      : supplyType === "DIRECT"
        ? directSupplyStatusFilters
        : preOrderSupplyStatusFilters;

  const activePagination =
    activeTab === "B2C" ? b2cData?.pagination : b2bData?.pagination;

  const b2cAnomalyCount =
    b2cData?.orders.filter((item) => item.reconciliation.hasAnomaly).length ?? 0;
  const b2bAnomalyCount =
    b2bData?.items.filter((item) => item.reconciliation.hasAnomaly).length ?? 0;

  const selectedOrderProgress = selectedOrder
    ? getB2CTrackingProgress(selectedOrder)
    : null;
  const selectedSupplyProgress = selectedSupply
    ? getB2BTrackingProgress(selectedSupply)
    : null;

  return (
    <div className="space-y-6">
      {/* Header Editorial Gelap */}
      <header className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Pengawasan Transaksi · Read-Only
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Pesanan B2C &amp; Pasokan B2B
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
            Pantau status transaksi pelanggan, verifikasi pembayaran, resi kurir
            pengiriman, serta alur stok dan pre-order kebun secara read-only.
          </p>
        </div>

        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-sm border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50 lg:self-end"
        >
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          <span>Muat Ulang</span>
        </button>
      </header>

      {/* Panel Kontrol Filter & Tab */}
      <section
        aria-label="Kontrol tab dan filter pengawasan"
        className="surface-panel space-y-5"
      >
        <TabNavigation
          tabs={[
            {
              id: "B2C",
              label: "Pesanan Pelanggan (B2C)",
              badge: activeTab === "B2C" ? b2cAnomalyCount : undefined,
            },
            {
              id: "B2B",
              label: "Rantai Pasok Kebun (B2B)",
              badge: activeTab === "B2B" ? b2bAnomalyCount : undefined,
            },
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        {activeTab === "B2B" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Saluran Pasokan:
            </span>
            <button
              type="button"
              aria-pressed={supplyType === "DIRECT"}
              onClick={() => handleSupplyTypeChange("DIRECT")}
              className={`inline-flex min-h-10 items-center justify-center rounded-sm px-4 py-2 text-sm font-semibold transition-colors ${
                supplyType === "DIRECT"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-surface text-muted-foreground hover:bg-surface-container hover:text-foreground"
              }`}
            >
              Pembelian Stok Langsung
            </button>
            <button
              type="button"
              aria-pressed={supplyType === "PREORDER"}
              onClick={() => handleSupplyTypeChange("PREORDER")}
              className={`inline-flex min-h-10 items-center justify-center rounded-sm px-4 py-2 text-sm font-semibold transition-colors ${
                supplyType === "PREORDER"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-surface text-muted-foreground hover:bg-surface-container hover:text-foreground"
              }`}
            >
              Pre-Order Panen Kebun
            </button>
          </div>
        )}

        <div className="space-y-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={
              activeTab === "B2C"
                ? "Cari nomor pesanan, nama, email pelanggan, atau produk..."
                : "Cari nama bunga, varietas, supplier kebun, toko florist, atau resi..."
            }
          />
          <FilterBar
            filters={activeFilters}
            activeFilter={statusFilter}
            onChange={(nextStatus) => {
              setLoading(true);
              setStatusFilter(nextStatus);
              setPage(1);
            }}
          />
        </div>
      </section>

      {/* Area Konten Utama */}
      {loading ? (
        <div className="surface-panel py-14">
          <LoadingSpinner
            message={
              activeTab === "B2C"
                ? "Memuat data pesanan pelanggan B2C..."
                : "Memuat pergerakan rantai pasok B2B..."
            }
          />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : activeTab === "B2C" ? (
        !b2cData || b2cData.orders.length === 0 ? (
          <EmptyState
            title="Belum ada pesanan B2C yang sesuai"
            description="Tidak ditemukan transaksi pesanan pelanggan dengan filter atau kata kunci pencarian saat ini."
          />
        ) : (
          <section className="space-y-4">
            {/* Tabel Desktop B2C */}
            <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
              <div
                tabIndex={0}
                role="region"
                aria-label="Tabel pengawasan pesanan B2C"
                className="overflow-x-auto"
              >
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface-container-low text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3.5">
                        Pesanan
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Pelanggan
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Toko Florist &amp; Item
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Pembayaran
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Logistik Pengiriman
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Total
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-right">
                        Observasi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {b2cData.orders.map((order) => (
                      <tr
                        key={order.id}
                        className="transition-colors hover:bg-surface-dim"
                      >
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-semibold text-foreground">
                            {order.orderNumber}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {renderStatusBadge(order.status)}
                            {order.isPreorder && (
                              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                Pre-Order
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            <time
                              dateTime={order.createdAt}
                              className="tabular-nums"
                            >
                              {formatDateTime(order.createdAt)}
                            </time>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <div className="font-medium text-foreground">
                            {order.customer.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.customer.maskedEmail}
                          </div>
                          {order.customer.maskedPhone && (
                            <div className="text-xs tabular-nums text-muted-foreground">
                              {order.customer.maskedPhone}
                            </div>
                          )}
                          {order.destination && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {order.destination.city},{" "}
                              {order.destination.province}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <div className="font-medium text-foreground">
                            {order.items[0]?.floristName || "-"}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            <span className="tabular-nums">
                              {order.items.length}
                            </span>{" "}
                            item produk
                            {order.items[0]
                              ? ` · ${order.items[0].productName}`
                              : ""}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          {order.payment ? (
                            <div className="space-y-1">
                              {renderStatusBadge(order.payment.status)}
                              <div className="text-xs uppercase text-muted-foreground">
                                {order.payment.method}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Belum ada rekaman bayar
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          {order.shipment ? (
                            <div className="space-y-1">
                              {renderStatusBadge(order.shipment.status)}
                              <div className="text-xs font-medium uppercase text-foreground">
                                {order.shipment.courier}
                                {order.shipment.service
                                  ? ` (${order.shipment.service})`
                                  : ""}
                              </div>
                              <div className="text-xs tabular-nums text-muted-foreground">
                                Resi: {order.shipment.trackingNumber || "-"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Belum dijadwalkan
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <div className="font-semibold tabular-nums text-foreground">
                            {formatRupiah(order.totalAmount)}
                          </div>
                          {order.reconciliation.hasAnomaly ? (
                            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-warning"
                                aria-hidden="true"
                              />
                              Anomali
                            </span>
                          ) : (
                            <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-success">
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-success"
                                aria-hidden="true"
                              />
                              Sinkron
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right align-top">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex min-h-9 items-center justify-center rounded-sm border border-border bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                          >
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kartu Mobile B2C */}
            <div className="space-y-3 md:hidden">
              {b2cData.orders.map((order) => (
                <article key={order.id} className="surface-panel space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.customer.name} ({order.customer.maskedEmail})
                      </p>
                    </div>
                    {renderStatusBadge(order.status)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <time
                      dateTime={order.createdAt}
                      className="text-xs tabular-nums text-muted-foreground"
                    >
                      {formatDateTime(order.createdAt)}
                    </time>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatRupiah(order.totalAmount)}
                    </span>
                  </div>
                  {order.reconciliation.hasAnomaly && (
                    <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                      <AlertTriangle
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{order.reconciliation.anomalyNote}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    Lihat Detail Observasi
                  </button>
                </article>
              ))}
            </div>
          </section>
        )
      ) : !b2bData || b2bData.items.length === 0 ? (
        <EmptyState
          title="Belum ada data pasokan B2B yang sesuai"
          description={
            supplyType === "DIRECT"
              ? "Tidak ditemukan transaksi pembelian stok bunga langsung pada filter saat ini."
              : "Tidak ditemukan kontrak pre-order panen kebun pada filter saat ini."
          }
        />
      ) : (
        <section className="space-y-4">
          {/* Tabel Desktop B2B */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
            <div
              tabIndex={0}
              role="region"
              aria-label="Tabel pengawasan pasokan B2B"
              className="overflow-x-auto"
            >
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-container-low text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">
                      Komoditas &amp; Status
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Supplier Kebun
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Pembeli Florist
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Tahap Pembayaran
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Pengiriman B2B
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Nilai &amp; Audit
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Observasi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {b2bData.items.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-surface-dim"
                    >
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-semibold text-foreground">
                          {item.flowerName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="tabular-nums">{item.quantity}</span>{" "}
                          {item.unit}
                          {item.variety ? ` · ${item.variety}` : ""}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {renderStatusBadge(item.status)}
                        </div>
                        {item.harvestDate && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Panen:{" "}
                            <time
                              dateTime={item.harvestDate}
                              className="tabular-nums"
                            >
                              {formatDate(item.harvestDate)}
                            </time>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <div className="font-medium text-foreground">
                          {item.supplier.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.supplier.maskedEmail}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <div className="font-medium text-foreground">
                          {item.florist.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.florist.maskedEmail}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <div className="text-xs font-semibold text-foreground">
                          {item.paymentSummary.stage === "FULL_PAID"
                            ? "Lunas Penuh"
                            : item.paymentSummary.stage === "DEPOSIT_PAID"
                              ? "DP Terbayar"
                              : item.paymentSummary.stage === "CANCELLED"
                                ? "Dibatalkan"
                                : "Belum Lunas"}
                        </div>
                        {item.type === "PREORDER" &&
                          item.paymentSummary.depositAmount !== null && (
                            <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                              DP: {formatRupiah(item.paymentSummary.depositAmount)}
                            </div>
                          )}
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Bukti tercatat:{" "}
                          {item.paymentSummary.hasPaymentProof ? "Ya" : "Tidak"}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {item.shipment.courier ||
                        item.shipment.trackingNumber ? (
                          <div className="space-y-0.5 text-xs">
                            <div className="font-medium uppercase text-foreground">
                              {item.shipment.courier || "Kurir"}{" "}
                              {item.shipment.service
                                ? `(${item.shipment.service})`
                                : ""}
                            </div>
                            <div className="tabular-nums text-muted-foreground">
                              Resi: {item.shipment.trackingNumber || "-"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Belum ada resi
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <div className="font-semibold tabular-nums text-foreground">
                          {formatRupiah(item.totalPrice)}
                        </div>
                        {item.reconciliation.hasAnomaly ? (
                          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-warning"
                              aria-hidden="true"
                            />
                            Anomali
                          </span>
                        ) : (
                          <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-success">
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-success"
                              aria-hidden="true"
                            />
                            Sinkron
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right align-top">
                        <button
                          type="button"
                          onClick={() => setSelectedSupply(item)}
                          className="inline-flex min-h-9 items-center justify-center rounded-sm border border-border bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kartu Mobile B2B */}
          <div className="space-y-3 md:hidden">
            {b2bData.items.map((item) => (
              <article key={item.id} className="surface-panel space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {item.flowerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.supplier.name} → {item.florist.name}
                    </p>
                  </div>
                  {renderStatusBadge(item.status)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="tabular-nums text-muted-foreground">
                    {item.quantity} {item.unit}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatRupiah(item.totalPrice)}
                  </span>
                </div>
                {item.reconciliation.hasAnomaly && (
                  <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    <AlertTriangle
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item.reconciliation.anomalyNote}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSupply(item)}
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  Lihat Detail Observasi
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Paginasi */}
      {activePagination && activePagination.totalPages > 1 && (
        <div className="surface-panel flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs tabular-nums text-muted-foreground">
            Menampilkan halaman {activePagination.page} dari{" "}
            {activePagination.totalPages} ({activePagination.total} total data)
          </p>
          <Pagination
            currentPage={activePagination.page}
            totalPages={activePagination.totalPages}
            disabled={loading}
            onPageChange={(nextPage) => {
              setLoading(true);
              setPage(nextPage);
            }}
          />
        </div>
      )}

      {/* Modal Detail Observasi Pesanan B2C */}
      <Modal
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        headerVariant="dark"
        bodyClassName="bg-background"
        size="lg"
        kicker="Observasi Pesanan B2C · Read-Only"
        title={selectedOrder ? selectedOrder.orderNumber : ""}
        subtitle={
          selectedOrder
            ? `Mode pengawasan baca-saja · Dibuat ${formatDateTime(selectedOrder.createdAt)}`
            : undefined
        }
        headerContent={
          selectedOrder &&
          selectedOrderProgress &&
          !selectedOrderProgress.isCancelled ? (
            <TrackingProgressTrack
              steps={B2C_TRACKING_STEPS}
              activeStepIndex={selectedOrderProgress.activeStepIndex}
              isCompletedAll={selectedOrderProgress.isCompletedAll}
              ariaLabel="Tahapan pesanan B2C"
            />
          ) : undefined
        }
        footer={
          <button
            type="button"
            onClick={() => setSelectedOrder(null)}
            className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low"
          >
            Tutup
          </button>
        }
      >
        {selectedOrder && (
          <div className="space-y-4 text-sm">
            {/* Banner Rekonsiliasi */}
            <div
              className={`flex items-start gap-3 rounded-md border p-3.5 ${
                selectedOrder.reconciliation.hasAnomaly
                  ? "border-warning/30 bg-warning/10 text-warning"
                  : "border-success/25 bg-success/10 text-success"
              }`}
            >
              {selectedOrder.reconciliation.hasAnomaly && (
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              )}
              <div>
                <p className="font-semibold">
                  {selectedOrder.reconciliation.hasAnomaly
                    ? "Terdeteksi Anomali Rekonsiliasi"
                    : "Status Pesanan, Pembayaran & Resi Sinkron"}
                </p>
                {selectedOrder.reconciliation.anomalyNote && (
                  <p className="mt-0.5 text-xs">
                    {selectedOrder.reconciliation.anomalyNote}
                  </p>
                )}
                <p className="mt-1 text-xs opacity-80">
                  Perubahan status pembayaran dan kurir hanya dipicu oleh sistem
                  pembayaran, kurir ekspedisi, dan pemilik toko.
                </p>
              </div>
            </div>

            {/* Informasi Pelanggan & Destinasi */}
            <dl className="grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">
                  Informasi Pelanggan
                </dt>
                <dd className="mt-1 font-medium text-foreground">
                  {selectedOrder.customer.name}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  {selectedOrder.customer.maskedEmail}
                </dd>
                <dd className="text-xs tabular-nums text-muted-foreground">
                  {selectedOrder.customer.maskedPhone || "No. HP tidak tersedia"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">
                  Tujuan Pengiriman
                </dt>
                <dd className="mt-1 font-medium text-foreground">
                  {selectedOrder.destination
                    ? `${selectedOrder.destination.city}, ${selectedOrder.destination.province}`
                    : "Tidak tersedia"}
                </dd>
                <dd className="mt-1 text-xs text-muted-foreground">
                  Dibuat:{" "}
                  <time
                    dateTime={selectedOrder.createdAt}
                    className="tabular-nums"
                  >
                    {formatDateTime(selectedOrder.createdAt)}
                  </time>
                </dd>
              </div>
            </dl>

            {/* Daftar Produk */}
            <div className="space-y-2 rounded-md border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Rincian Produk ({selectedOrder.items.length})
              </p>
              <div className="divide-y divide-border">
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 py-2.5"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {item.productName}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        Florist: {item.floristName} · {item.quantity} ×{" "}
                        {formatRupiah(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums text-foreground">
                      {formatRupiah(item.subtotal)}
                    </p>
                  </div>
                ))}
              </div>
              <dl className="space-y-1 border-t border-border pt-2.5 text-xs tabular-nums">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Subtotal</dt>
                  <dd>{formatRupiah(selectedOrder.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Ongkos Kirim</dt>
                  <dd>{formatRupiah(selectedOrder.shippingCost)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Diskon Kupon</dt>
                  <dd>-{formatRupiah(selectedOrder.discount)}</dd>
                </div>
                <div className="flex justify-between pt-1.5 text-sm font-bold text-foreground">
                  <dt>Total Pesanan</dt>
                  <dd>{formatRupiah(selectedOrder.totalAmount)}</dd>
                </div>
              </dl>
            </div>

            {/* Pembayaran & Pengiriman */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-md border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Informasi Pembayaran
                </p>
                {selectedOrder.payment ? (
                  <div className="space-y-1 text-xs">
                    <div>{renderStatusBadge(selectedOrder.payment.status)}</div>
                    <p className="text-foreground">
                      Metode: {selectedOrder.payment.method}
                    </p>
                    <p className="text-muted-foreground">
                      Dibayar:{" "}
                      {selectedOrder.payment.paidAt ? (
                        <time
                          dateTime={selectedOrder.payment.paidAt}
                          className="tabular-nums"
                        >
                          {formatDateTime(selectedOrder.payment.paidAt)}
                        </time>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Belum ada rekaman pembayaran.
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-md border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Logistik Pengiriman
                </p>
                {selectedOrder.shipment ? (
                  <div className="space-y-1 text-xs">
                    <div>{renderStatusBadge(selectedOrder.shipment.status)}</div>
                    <p className="uppercase text-foreground">
                      {selectedOrder.shipment.courier}{" "}
                      {selectedOrder.shipment.service || ""}
                    </p>
                    <p className="tabular-nums text-muted-foreground">
                      Resi: {selectedOrder.shipment.trackingNumber || "-"}
                    </p>
                    <p className="text-muted-foreground">
                      Booking Kurir:{" "}
                      {selectedOrder.shipment.hasBiteshipOrder
                        ? "Aktif"
                        : "Belum"}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Belum ada data pengiriman.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Detail Observasi Pasokan B2B */}
      <Modal
        isOpen={selectedSupply !== null}
        onClose={() => setSelectedSupply(null)}
        headerVariant="dark"
        bodyClassName="bg-background"
        size="lg"
        kicker="Observasi Pasokan B2B · Read-Only"
        title={selectedSupply ? selectedSupply.flowerName : ""}
        subtitle={
          selectedSupply
            ? `${selectedSupply.supplier.name} → ${selectedSupply.florist.name}`
            : undefined
        }
        headerContent={
          selectedSupply &&
          selectedSupplyProgress &&
          !selectedSupplyProgress.isCancelled ? (
            <TrackingProgressTrack
              steps={selectedSupplyProgress.steps}
              activeStepIndex={selectedSupplyProgress.activeStepIndex}
              isCompletedAll={selectedSupplyProgress.isCompletedAll}
              ariaLabel="Tahapan pasokan B2B"
            />
          ) : undefined
        }
        footer={
          <button
            type="button"
            onClick={() => setSelectedSupply(null)}
            className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low"
          >
            Tutup
          </button>
        }
      >
        {selectedSupply && (
          <div className="space-y-4 text-sm">
            <div
              className={`flex items-start gap-3 rounded-md border p-3.5 ${
                selectedSupply.reconciliation.hasAnomaly
                  ? "border-warning/30 bg-warning/10 text-warning"
                  : "border-success/25 bg-success/10 text-success"
              }`}
            >
              {selectedSupply.reconciliation.hasAnomaly && (
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              )}
              <div>
                <p className="font-semibold">
                  {selectedSupply.reconciliation.hasAnomaly
                    ? "Terdeteksi Anomali Rekonsiliasi B2B"
                    : "Tahapan Pembayaran & Pengiriman B2B Sinkron"}
                </p>
                {selectedSupply.reconciliation.anomalyNote && (
                  <p className="mt-0.5 text-xs">
                    {selectedSupply.reconciliation.anomalyNote}
                  </p>
                )}
              </div>
            </div>

            <dl className="grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">
                  Supplier Kebun
                </dt>
                <dd className="mt-1 font-medium text-foreground">
                  {selectedSupply.supplier.name}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  {selectedSupply.supplier.maskedEmail}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">
                  Florist Pembeli
                </dt>
                <dd className="mt-1 font-medium text-foreground">
                  {selectedSupply.florist.name}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  {selectedSupply.florist.maskedEmail}
                </dd>
              </div>
            </dl>

            <dl className="space-y-2 rounded-md border border-border bg-card p-4 text-xs">
              <div className="pb-1 font-semibold uppercase text-muted-foreground">
                Rincian Komoditas &amp; Nilai
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Jenis Saluran</dt>
                <dd className="font-medium text-foreground">
                  {selectedSupply.type === "DIRECT"
                    ? "Pembelian Stok Langsung"
                    : "Pre-Order Panen Kebun"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Volume &amp; Harga</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {selectedSupply.quantity} {selectedSupply.unit} ×{" "}
                  {formatRupiah(selectedSupply.pricePerUnit)}
                </dd>
              </div>
              {selectedSupply.harvestDate && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Target Panen</dt>
                  <dd className="font-medium text-foreground">
                    <time
                      dateTime={selectedSupply.harvestDate}
                      className="tabular-nums"
                    >
                      {formatDate(selectedSupply.harvestDate)}
                    </time>
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t border-border pt-2.5 text-sm font-bold text-foreground">
                <dt>Total Nilai Kontrak</dt>
                <dd className="tabular-nums">
                  {formatRupiah(selectedSupply.totalPrice)}
                </dd>
              </div>
            </dl>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 rounded-md border border-border bg-card p-4 text-xs">
                <p className="font-semibold uppercase text-muted-foreground">
                  Tahapan Pembayaran
                </p>
                <div>{renderStatusBadge(selectedSupply.status)}</div>
                {selectedSupply.paymentSummary.depositAmount !== null && (
                  <p className="tabular-nums text-foreground">
                    DP:{" "}
                    {formatRupiah(selectedSupply.paymentSummary.depositAmount)}{" "}
                    ({formatDateTime(selectedSupply.paymentSummary.depositPaidAt)})
                  </p>
                )}
                {selectedSupply.paymentSummary.remainingAmount !== null && (
                  <p className="tabular-nums text-foreground">
                    Sisa:{" "}
                    {formatRupiah(
                      selectedSupply.paymentSummary.remainingAmount,
                    )}{" "}
                    ({formatDateTime(selectedSupply.paymentSummary.finalPaidAt)})
                  </p>
                )}
                <p className="text-muted-foreground">
                  Bukti Pembayaran:{" "}
                  {selectedSupply.paymentSummary.hasPaymentProof
                    ? "Tercatat"
                    : "Belum ada"}
                </p>
              </div>

              <div className="space-y-1.5 rounded-md border border-border bg-card p-4 text-xs">
                <p className="font-semibold uppercase text-muted-foreground">
                  Logistik Pengiriman B2B
                </p>
                <p className="uppercase text-foreground">
                  Kurir: {selectedSupply.shipment.courier || "-"}{" "}
                  {selectedSupply.shipment.service
                    ? `(${selectedSupply.shipment.service})`
                    : ""}
                </p>
                <p className="tabular-nums text-muted-foreground">
                  Nomor Resi: {selectedSupply.shipment.trackingNumber || "-"}
                </p>
                <p className="tabular-nums text-muted-foreground">
                  Dikirim: {formatDateTime(selectedSupply.shipment.shippedAt)}
                </p>
                <p className="tabular-nums text-muted-foreground">
                  Diterima:{" "}
                  {formatDateTime(selectedSupply.shipment.deliveredAt)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
