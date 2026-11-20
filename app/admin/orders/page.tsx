"use client";

import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import FilterBar from "@/components/ui/FilterBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import TabNavigation from "@/components/ui/TabNavigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CheckCircle2,
  CreditCard,
  Eye,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type MonitoringTab = "B2C" | "B2B";

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
  REFUNDED: {
    label: "Refund",
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

  return (
    <div className="space-y-6">
      {/* Header Pengawasan */}
      <header className="flex flex-col gap-4 rounded-2xl bg-surface-dark p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold tracking-wider text-kicker uppercase">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Platform Observer (Read-Only)
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Monitoring Pesanan B2C &amp; Pasokan B2B
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-white/70">
            Pantau status transaksi pelanggan, pembayaran Midtrans, resi kurir
            Biteship, serta alur stok &amp; pre-order kebun tanpa intervensi
            operasional.
          </p>
        </div>

        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50 sm:self-center"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>Muat Ulang</span>
        </button>
      </header>

      {/* Panel Kontrol Filter & Tab */}
      <section className="surface-panel space-y-5">
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
            <span className="mr-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Saluran Pasokan:
            </span>
            <button
              type="button"
              onClick={() => handleSupplyTypeChange("DIRECT")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                supplyType === "DIRECT"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border bg-surface text-muted-foreground hover:bg-surface-container hover:text-foreground"
              }`}
            >
              <Package className="h-4 w-4" aria-hidden="true" />
              <span>Pembelian Stok Langsung</span>
            </button>
            <button
              type="button"
              onClick={() => handleSupplyTypeChange("PREORDER")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                supplyType === "PREORDER"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border bg-surface text-muted-foreground hover:bg-surface-container hover:text-foreground"
              }`}
            >
              <Sprout className="h-4 w-4" aria-hidden="true" />
              <span>Pre-Order Panen Kebun</span>
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
            icon={<ShoppingBag className="h-6 w-6" />}
            title="Belum ada pesanan B2C yang sesuai"
            description="Tidak ditemukan transaksi pesanan pelanggan dengan filter atau kata kunci pencarian saat ini."
          />
        ) : (
          <section className="space-y-4">
            {/* Tabel Desktop B2C */}
            <div className="surface-panel hidden overflow-hidden p-0 md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface-container-low text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3.5">Pesanan</th>
                      <th className="px-4 py-3.5">Pelanggan (Masked)</th>
                      <th className="px-4 py-3.5">Toko Florist &amp; Item</th>
                      <th className="px-4 py-3.5">Pembayaran Midtrans</th>
                      <th className="px-4 py-3.5">Logistik Biteship</th>
                      <th className="px-4 py-3.5">Total</th>
                      <th className="px-4 py-3.5 text-right">Observasi</th>
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
                            {formatDateTime(order.createdAt)}
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
                            <div className="text-xs text-muted-foreground">
                              {order.customer.maskedPhone}
                            </div>
                          )}
                          {order.destination && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {order.destination.city}, {order.destination.province}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <div className="font-medium text-foreground">
                            {order.items[0]?.floristName || "-"}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {order.items.length} item produk
                            {order.items[0]
                              ? ` • ${order.items[0].productName}`
                              : ""}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          {order.payment ? (
                            <div className="space-y-1">
                              {renderStatusBadge(order.payment.status)}
                              <div className="text-xs text-muted-foreground uppercase">
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
                              <div className="text-xs font-medium text-foreground uppercase">
                                {order.shipment.courier}
                                {order.shipment.service
                                  ? ` (${order.shipment.service})`
                                  : ""}
                              </div>
                              <div className="text-xs text-muted-foreground">
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
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                              Anomali
                            </span>
                          ) : (
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-success">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              Sinkron
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right align-top">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Lihat Detail</span>
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
                    <span className="text-muted-foreground">Total Pesanan</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatRupiah(order.totalAmount)}
                    </span>
                  </div>
                  {order.reconciliation.hasAnomaly && (
                    <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{order.reconciliation.anomalyNote}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="btn-secondary inline-flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Lihat Detail Observasi</span>
                  </button>
                </article>
              ))}
            </div>
          </section>
        )
      ) : !b2bData || b2bData.items.length === 0 ? (
        <EmptyState
          icon={<Sprout className="h-6 w-6" />}
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
          <div className="surface-panel hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-container-low text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3.5">Komoditas &amp; Status</th>
                    <th className="px-4 py-3.5">Supplier Kebun</th>
                    <th className="px-4 py-3.5">Pembeli Florist</th>
                    <th className="px-4 py-3.5">Tahap Pembayaran</th>
                    <th className="px-4 py-3.5">Pengiriman B2B</th>
                    <th className="px-4 py-3.5">Nilai &amp; Audit</th>
                    <th className="px-4 py-3.5 text-right">Observasi</th>
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
                          {item.quantity} {item.unit}
                          {item.variety ? ` • ${item.variety}` : ""}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {renderStatusBadge(item.status)}
                        </div>
                        {item.harvestDate && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Panen: {formatDate(item.harvestDate)}
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
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              DP: {formatRupiah(item.paymentSummary.depositAmount)}
                            </div>
                          )}
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Bukti tercatat:{" "}
                          {item.paymentSummary.hasPaymentProof ? "Ya" : "Tidak"}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {item.shipment.courier || item.shipment.trackingNumber ? (
                          <div className="space-y-0.5 text-xs">
                            <div className="font-medium text-foreground uppercase">
                              {item.shipment.courier || "Kurir"}{" "}
                              {item.shipment.service
                                ? `(${item.shipment.service})`
                                : ""}
                            </div>
                            <div className="text-muted-foreground">
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
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            Anomali
                          </span>
                        ) : (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-success">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            Sinkron
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right align-top">
                        <button
                          type="button"
                          onClick={() => setSelectedSupply(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Lihat Detail</span>
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
                  <span className="text-muted-foreground">
                    {item.quantity} {item.unit}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatRupiah(item.totalPrice)}
                  </span>
                </div>
                {item.reconciliation.hasAnomaly && (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.reconciliation.anomalyNote}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSupply(item)}
                  className="btn-secondary inline-flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Lihat Detail Observasi</span>
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Paginasi */}
      {activePagination && activePagination.totalPages > 1 && (
        <div className="surface-panel flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
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
      <Dialog
        open={selectedOrder !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Detail Observasi Pesanan {selectedOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Mode pengawasan read-only. Perubahan status pembayaran dan kurir
              hanya dipicu oleh gateway Midtrans/Biteship dan pemilik toko.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 text-sm">
              {/* Banner Rekonsiliasi */}
              <div
                className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                  selectedOrder.reconciliation.hasAnomaly
                    ? "border-warning/30 bg-warning/10 text-warning"
                    : "border-success/25 bg-success/10 text-success"
                }`}
              >
                {selectedOrder.reconciliation.hasAnomaly ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
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
                </div>
              </div>

              {/* Informasi Pelanggan & Destinasi */}
              <div className="grid gap-3 rounded-xl border border-border bg-surface-container-low p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Pelanggan (Masked PII)
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {selectedOrder.customer.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedOrder.customer.maskedEmail}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedOrder.customer.maskedPhone || "No. HP tidak tersedia"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Tujuan Pengiriman
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {selectedOrder.destination
                      ? `${selectedOrder.destination.city}, ${selectedOrder.destination.province}`
                      : "Tidak tersedia"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dibuat: {formatDateTime(selectedOrder.createdAt)}
                  </p>
                </div>
              </div>

              {/* Daftar Produk */}
              <div className="space-y-2 rounded-xl border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Rincian Produk ({selectedOrder.items.length})
                </p>
                <div className="divide-y divide-border">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Florist: {item.floristName} • {item.quantity} ×{" "}
                          {formatRupiah(item.price)}
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums text-foreground">
                        {formatRupiah(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 border-t border-border pt-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatRupiah(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Ongkos Kirim</span>
                    <span>{formatRupiah(selectedOrder.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Diskon Kupon</span>
                    <span>-{formatRupiah(selectedOrder.discount)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-bold text-foreground">
                    <span>Total Pesanan</span>
                    <span>{formatRupiah(selectedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Pembayaran & Pengiriman */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                    <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Pembayaran Midtrans</span>
                  </div>
                  {selectedOrder.payment ? (
                    <div className="space-y-1 text-xs">
                      <div>{renderStatusBadge(selectedOrder.payment.status)}</div>
                      <p className="text-foreground">
                        Metode: {selectedOrder.payment.method}
                      </p>
                      <p className="text-muted-foreground">
                        Dibayar: {formatDateTime(selectedOrder.payment.paidAt)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Belum ada rekaman pembayaran.
                    </p>
                  )}
                </div>

                <div className="space-y-2 rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                    <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Logistik Biteship</span>
                  </div>
                  {selectedOrder.shipment ? (
                    <div className="space-y-1 text-xs">
                      <div>{renderStatusBadge(selectedOrder.shipment.status)}</div>
                      <p className="text-foreground uppercase">
                        {selectedOrder.shipment.courier}{" "}
                        {selectedOrder.shipment.service || ""}
                      </p>
                      <p className="text-muted-foreground">
                        Resi: {selectedOrder.shipment.trackingNumber || "-"}
                      </p>
                      <p className="text-muted-foreground">
                        Booking Biteship:{" "}
                        {selectedOrder.shipment.hasBiteshipOrder ? "Aktif" : "Belum"}
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

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Tutup
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detail Observasi Pasokan B2B */}
      <Dialog
        open={selectedSupply !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSupply(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Detail Pasokan B2B — {selectedSupply?.flowerName}
            </DialogTitle>
            <DialogDescription>
              Observasi alur stok kebun ke florist secara read-only sesuai
              kebijakan RBAC admin.
            </DialogDescription>
          </DialogHeader>

          {selectedSupply && (
            <div className="space-y-4 text-sm">
              <div
                className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                  selectedSupply.reconciliation.hasAnomaly
                    ? "border-warning/30 bg-warning/10 text-warning"
                    : "border-success/25 bg-success/10 text-success"
                }`}
              >
                {selectedSupply.reconciliation.hasAnomaly ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
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

              <div className="grid gap-3 rounded-xl border border-border bg-surface-container-low p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Supplier Kebun
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {selectedSupply.supplier.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedSupply.supplier.maskedEmail}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Florist Pembeli
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {selectedSupply.florist.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedSupply.florist.maskedEmail}
                  </p>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border p-4 text-xs">
                <p className="font-semibold text-muted-foreground uppercase">
                  Rincian Komoditas &amp; Nilai
                </p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jenis Saluran</span>
                  <span className="font-medium text-foreground">
                    {selectedSupply.type === "DIRECT"
                      ? "Pembelian Stok Langsung"
                      : "Pre-Order Panen Kebun"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume &amp; Harga</span>
                  <span className="font-medium text-foreground">
                    {selectedSupply.quantity} {selectedSupply.unit} ×{" "}
                    {formatRupiah(selectedSupply.pricePerUnit)}
                  </span>
                </div>
                {selectedSupply.harvestDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Panen</span>
                    <span className="font-medium text-foreground">
                      {formatDate(selectedSupply.harvestDate)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
                  <span>Total Nilai Kontrak</span>
                  <span>{formatRupiah(selectedSupply.totalPrice)}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 rounded-xl border border-border p-4 text-xs">
                  <p className="font-semibold text-muted-foreground uppercase">
                    Tahapan Pembayaran
                  </p>
                  <div>{renderStatusBadge(selectedSupply.status)}</div>
                  {selectedSupply.paymentSummary.depositAmount !== null && (
                    <p className="text-foreground">
                      DP: {formatRupiah(selectedSupply.paymentSummary.depositAmount)}{" "}
                      ({formatDateTime(selectedSupply.paymentSummary.depositPaidAt)})
                    </p>
                  )}
                  {selectedSupply.paymentSummary.remainingAmount !== null && (
                    <p className="text-foreground">
                      Sisa:{" "}
                      {formatRupiah(selectedSupply.paymentSummary.remainingAmount)}{" "}
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

                <div className="space-y-1.5 rounded-xl border border-border p-4 text-xs">
                  <p className="font-semibold text-muted-foreground uppercase">
                    Logistik Pengiriman B2B
                  </p>
                  <p className="text-foreground uppercase">
                    Kurir: {selectedSupply.shipment.courier || "-"}{" "}
                    {selectedSupply.shipment.service
                      ? `(${selectedSupply.shipment.service})`
                      : ""}
                  </p>
                  <p className="text-muted-foreground">
                    Nomor Resi: {selectedSupply.shipment.trackingNumber || "-"}
                  </p>
                  <p className="text-muted-foreground">
                    Dikirim: {formatDateTime(selectedSupply.shipment.shippedAt)}
                  </p>
                  <p className="text-muted-foreground">
                    Diterima: {formatDateTime(selectedSupply.shipment.deliveredAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Tutup
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
