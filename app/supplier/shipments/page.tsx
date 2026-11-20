"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/forms/Modal";
import TabNavigation from "@/components/ui/TabNavigation";
import DataStateWrapper from "@/components/ui/DataStateWrapper";
import SupplierDeliveryStatus from "@/components/ui/SupplierDeliveryStatus";
import ShipmentTrackingModal from "@/components/ui/ShipmentTrackingModal";
import SearchInput from "@/components/ui/SearchInput";
import Pagination from "@/components/ui/Pagination";
import { formatRupiah } from "@/lib/utils/formatters";
import {
  getSupplierShipments,
  getSupplierReadyToShipOrders,
  getSupplierBiteshipRates,
  autoCreateSupplierShipment,
  SupplierUnifiedShipment,
  SupplierReadyToShipOrder,
  SupplierBiteshipRate,
} from "@/lib/api/supplier";

const SHIPMENTS_PER_PAGE = 10;
const READY_ORDERS_PER_PAGE = 9;

export default function SupplierShipmentsPage() {
  const [shipments, setShipments] = useState<SupplierUnifiedShipment[]>([]);
  const [readyOrders, setReadyOrders] = useState<SupplierReadyToShipOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"shipments" | "ready">("shipments");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [shipmentsPage, setShipmentsPage] = useState(1);
  const [readyPage, setReadyPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] =
    useState<SupplierReadyToShipOrder | null>(null);
  const [availableRates, setAvailableRates] = useState<SupplierBiteshipRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal Tracking
  const [trackingShipment, setTrackingShipment] =
    useState<SupplierUnifiedShipment | null>(null);

  // Ambil data pengiriman dan pesanan siap kirim
  const fetchData = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const [shipmentList, readyList] = await Promise.all([
        getSupplierShipments(),
        getSupplierReadyToShipOrders(),
      ]);
      setShipments(shipmentList);
      setReadyOrders(readyList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat data pengiriman",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchData());
  }, []);

  // Buka modal buat resi — langsung ambil tarif kurir
  const openCreateModal = async (order: SupplierReadyToShipOrder) => {
    setSelectedOrder(order);
    setAvailableRates([]);
    setSelectedRate("");
    setModalError(null);
    setIsModalOpen(true);

    setIsFetchingRates(true);
    try {
      const rates = await getSupplierBiteshipRates(order.orderType, order.id);
      setAvailableRates(rates);
      if (rates.length > 0) {
        setSelectedRate(rates[0].rate_id);
      }
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Gagal mengambil tarif kurir",
      );
    } finally {
      setIsFetchingRates(false);
    }
  };

  // Submit pembuatan pengiriman & penerbitan resi
  const handleShipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      setIsSubmitting(true);
      setModalError(null);

      const rateObj = availableRates.find((r) => r.rate_id === selectedRate);
      if (!rateObj) {
        throw new Error("Pilih opsi layanan kurir terlebih dahulu");
      }

      const result = await autoCreateSupplierShipment({
        orderType: selectedOrder.orderType,
        orderId: selectedOrder.id,
        courierCompany: rateObj.courier.code,
        courierType: rateObj.courier.service_code,
      });

      const orderNumber = selectedOrder.orderNumber;
      setIsModalOpen(false);
      setSelectedOrder(null);
      setActionSuccess(
        `Resi pengiriman untuk ${orderNumber} berhasil dibuat (${result.courier} · ${result.trackingNumber || "Menunggu nomor resi"}).`,
      );
      await fetchData(true);
      setActiveTab("shipments");
      setShipmentsPage(1);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Gagal memproses pengiriman",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buka modal pelacakan
  const handleOpenTracking = (shipment: SupplierUnifiedShipment) => {
    setTrackingShipment(shipment);
  };

  // Hitung metrik statistik
  const bookedShipments = useMemo(
    () => shipments.filter((s) => s.biteshipOrderId),
    [shipments],
  );
  const shippedCount = bookedShipments.filter(
    (s) => s.status === "SHIPPED",
  ).length;
  const totalShipments = bookedShipments.length;
  const bookedCount = bookedShipments.filter((s) => s.status === "PAID").length;
  const deliveredCount = bookedShipments.filter(
    (s) => s.status === "DELIVERED",
  ).length;
  const readyCount = readyOrders.length;

  // Filter data tabel
  const filteredShipments = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return bookedShipments.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (!keyword) return true;
      return (
        s.orderNumber.toLowerCase().includes(keyword) ||
        s.recipient.name.toLowerCase().includes(keyword) ||
        s.itemName.toLowerCase().includes(keyword) ||
        (s.trackingNumber?.toLowerCase().includes(keyword) ?? false)
      );
    });
  }, [bookedShipments, searchQuery, statusFilter]);

  const shipmentsTotalPages = Math.max(
    1,
    Math.ceil(filteredShipments.length / SHIPMENTS_PER_PAGE),
  );
  const safeShipmentsPage = Math.min(shipmentsPage, shipmentsTotalPages);
  const paginatedShipments = useMemo(() => {
    const start = (safeShipmentsPage - 1) * SHIPMENTS_PER_PAGE;
    return filteredShipments.slice(start, start + SHIPMENTS_PER_PAGE);
  }, [filteredShipments, safeShipmentsPage]);

  const readyTotalPages = Math.max(
    1,
    Math.ceil(readyOrders.length / READY_ORDERS_PER_PAGE),
  );
  const safeReadyPage = Math.min(readyPage, readyTotalPages);
  const paginatedReadyOrders = useMemo(() => {
    const start = (safeReadyPage - 1) * READY_ORDERS_PER_PAGE;
    return readyOrders.slice(start, start + READY_ORDERS_PER_PAGE);
  }, [readyOrders, safeReadyPage]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Logistik &amp; Pengiriman Pasokan
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Pengiriman
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Pilih kurir, terbitkan resi, cetak label, dan pantau pengiriman ke
            florist.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void fetchData(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isRefreshing && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* Panel Statistik Pengiriman */}
      <div className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="p-5 border-b border-r lg:border-b-0 border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Pengiriman
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {totalShipments}{" "}
            <span className="text-xs font-normal tabular-nums text-muted-foreground">
              ({deliveredCount} selesai)
            </span>
          </p>
        </div>
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Perlu Dibuat Resi
          </p>
          <p
            className={`mt-2 text-3xl font-bold tabular-nums ${
              readyCount > 0 ? "text-warning" : "text-foreground"
            }`}
          >
            {readyCount}
          </p>
        </div>
        <div className="p-5 border-r border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Menunggu Kurir
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-primary">
            {bookedCount}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Dalam Perjalanan
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-primary">
            {shippedCount}
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success"
        >
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-xs font-semibold underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Navigasi Tab */}
      <TabNavigation
        tabs={[
          {
            id: "shipments",
            label: "Daftar Pengiriman",
            badge: totalShipments,
          },
          {
            id: "ready",
            label: "Perlu dibuat resi",
            badge: readyCount,
          },
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as "shipments" | "ready")}
      />

      {/* TAB 1: DAFTAR PENGIRIMAN */}
      {activeTab === "shipments" && (
        <div className="space-y-4">
          {/* Bar Filter & Pencarian */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                setShipmentsPage(1);
              }}
              placeholder="Cari order, florist, atau no. resi..."
              className="max-w-md"
            />
            <div className="flex flex-wrap gap-2">
              {["ALL", "PAID", "SHIPPED", "DELIVERED"].map((st) => {
                const isActive = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setStatusFilter(st);
                      setShipmentsPage(1);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-muted-foreground hover:bg-surface-container-low hover:text-foreground"
                    }`}
                  >
                    {st === "ALL"
                      ? "Semua"
                      : st === "PAID"
                        ? "Menunggu Kurir"
                        : st === "SHIPPED"
                          ? "Dalam Perjalanan"
                          : "Selesai"}
                  </button>
                );
              })}
            </div>
          </div>

          <DataStateWrapper
            isLoading={isLoading && bookedShipments.length === 0}
            error={error}
            isEmpty={filteredShipments.length === 0}
            emptyTitle={
              searchQuery || statusFilter !== "ALL"
                ? "Tidak ada pengiriman yang cocok"
                : "Belum ada pengiriman"
            }
            emptyDescription={
              searchQuery || statusFilter !== "ALL"
                ? "Ubah kata kunci pencarian atau pilih filter status lainnya."
                : "Daftar pengiriman akan tampil setelah pesanan florist lunas dan Anda menerbitkan resi."
            }
            onRetry={() => void fetchData()}
          >
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[850px]">
                    <thead className="border-b border-border bg-surface-container-lowest text-xs font-medium uppercase text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-5 py-4">
                          No. Order &amp; Tipe
                        </th>
                        <th scope="col" className="px-5 py-4">
                          Florist Penerima
                        </th>
                        <th scope="col" className="px-5 py-4">
                          Bunga &amp; Bobot
                        </th>
                        <th scope="col" className="px-5 py-4">
                          Kurir &amp; Resi
                        </th>
                        <th scope="col" className="px-5 py-4">
                          Status
                        </th>
                        <th scope="col" className="px-5 py-4 text-right">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedShipments.map((s) => (
                        <tr
                          key={s.id}
                          className="hover:bg-surface-container-lowest/50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-mono text-xs font-bold text-foreground">
                              {s.orderNumber}
                            </p>
                            <span className="mt-1 inline-block rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                              {s.orderType === "PREORDER"
                                ? "Pre-Order Panen"
                                : "Penjualan Stok"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-foreground">
                              {s.recipient.name}
                            </p>
                            <p className="max-w-[200px] truncate text-[11px] text-muted-foreground">
                              {s.recipient.address}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-medium text-foreground">
                              {s.itemName}
                            </p>
                            <p className="text-[11px] tabular-nums text-muted-foreground">
                              {(s.weight / 1000).toFixed(1)} kg •{" "}
                              {formatRupiah(s.totalAmount)}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">
                                {s.courier}
                              </span>
                              {s.service && (
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                  {s.service}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                              {s.trackingNumber || "Menunggu resi"}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <SupplierDeliveryStatus
                              status={s.status}
                              booked={true}
                              bookedAt={s.shippedAt}
                              deliveredAt={s.deliveredAt}
                            />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Tombol Lacak */}
                              {s.biteshipOrderId && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenTracking(s)}
                                  className="inline-flex min-h-8 items-center rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-container"
                                  title="Lacak Perjalanan Paket"
                                >
                                  Lacak
                                </button>
                              )}

                              {/* Tautan Native Cetak Label AWB */}
                              {s.biteshipOrderId && (
                                <a
                                  href={`/api/supplier/shipments/${s.id}/label`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex min-h-8 items-center rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-container"
                                  title="Cetak Label Pengiriman AWB"
                                >
                                  Label
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Pagination
                currentPage={safeShipmentsPage}
                totalPages={shipmentsTotalPages}
                onPageChange={setShipmentsPage}
                ariaLabel="Navigasi halaman daftar pengiriman"
              />
            </div>
          </DataStateWrapper>
        </div>
      )}

      {/* TAB 2: SIAP DIKIRIM (PERLU RESI) */}
      {activeTab === "ready" && (
        <DataStateWrapper
          isLoading={isLoading && readyOrders.length === 0}
          error={error}
          isEmpty={readyOrders.length === 0}
          emptyTitle="Tidak ada pesanan yang perlu dikirim"
          emptyDescription="Saat pesanan florist sudah lunas (baik penjualan stok maupun pre-order panen), kartu pesanan akan tampil di sini untuk dibuatkan resi."
          onRetry={() => void fetchData()}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedReadyOrders.map((order) => (
                <article
                  key={order.id}
                  className="flex flex-col justify-between space-y-4 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-bold text-foreground">
                          {order.orderNumber}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Florist: <strong className="text-foreground">{order.buyer.name}</strong>
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-md border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                        LUNAS
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
                      <p className="font-semibold text-foreground">
                        {order.itemName}
                      </p>
                      <p className="truncate text-muted-foreground">
                        {order.buyer.address || "Alamat florist belum dilengkapi"}
                      </p>
                      <div className="flex justify-between pt-1">
                        <span className="text-muted-foreground">
                          Kuantitas &amp; Berat:
                        </span>
                        <span className="font-medium tabular-nums text-foreground">
                          {order.quantity.toLocaleString("id-ID")} tangkai (~
                          {(order.weight / 1000).toFixed(1)} kg)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Nilai:</span>
                        <span className="font-bold tabular-nums text-foreground">
                          {formatRupiah(order.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCreateModal(order)}
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-sm bg-primary py-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Buat Resi
                  </button>
                </article>
              ))}
            </div>

            <Pagination
              currentPage={safeReadyPage}
              totalPages={readyTotalPages}
              onPageChange={setReadyPage}
              ariaLabel="Navigasi halaman pesanan perlu dibuat resi"
            />
          </div>
        </DataStateWrapper>
      )}

      {/* MODAL BUAT RESI PENGIRIMAN */}
      <Modal
        isOpen={isModalOpen && Boolean(selectedOrder)}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        headerVariant="dark"
        kicker="Pengiriman Kurir"
        title="Buat Resi Pengiriman"
        subtitle={
          selectedOrder
            ? `${selectedOrder.orderNumber} · ${selectedOrder.buyer.name}`
            : undefined
        }
        size="sm"
      >
        {selectedOrder && (
          <div className="space-y-4">
            {modalError && (
              <div
                role="alert"
                className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error"
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleShipmentSubmit} className="space-y-4">
              {/* Ringkasan Tujuan */}
              <div className="rounded-xl bg-surface-container-low p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Florist Penerima:</span>
                  <span className="text-right font-semibold text-foreground">
                    {selectedOrder.buyer.name}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Alamat Tujuan:</span>
                  <span className="max-w-[240px] truncate text-right text-foreground">
                    {selectedOrder.buyer.address || "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Barang:</span>
                  <span className="text-right font-semibold text-foreground">
                    {selectedOrder.itemName}
                  </span>
                </div>
              </div>

              {/* Pilih Layanan Kurir */}
              <div className="space-y-3">
                <p className="block text-xs font-semibold text-foreground">
                  Pilih Layanan Kurir
                </p>

                {isFetchingRates ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-muted-foreground">
                    <Loader2
                      className="h-5 w-5 animate-spin text-primary"
                      aria-hidden="true"
                    />
                    <span>
                      Menghitung ongkir dari kebun ke toko florist...
                    </span>
                  </div>
                ) : availableRates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Layanan kurir belum tersedia untuk rute ini atau kode pos
                    tujuan belum sesuai.
                  </div>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {availableRates.map((r) => (
                      <label
                        key={r.rate_id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
                          selectedRate === r.rate_id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="courier_rate"
                            value={r.rate_id}
                            checked={selectedRate === r.rate_id}
                            onChange={() => setSelectedRate(r.rate_id)}
                            className="text-primary focus:ring-primary"
                          />
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {r.courier.name} ({r.courier.service_name})
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Estimasi tiba: {r.estimated_days}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold tabular-nums text-primary">
                          {formatRupiah(r.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedRate}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  <span>Terbitkan Resi</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* MODAL PELACAKAN PENGIRIMAN */}
      {trackingShipment && (
        <ShipmentTrackingModal
          isOpen={Boolean(trackingShipment)}
          onClose={() => setTrackingShipment(null)}
          shipmentId={trackingShipment.id}
          orderNumber={trackingShipment.orderNumber}
          orderType={trackingShipment.orderType}
          courierName={trackingShipment.courier}
          trackingNumber={trackingShipment.trackingNumber}
          currentStatus={trackingShipment.status}
          recipientName={trackingShipment.recipient?.name}
          recipientAddress={trackingShipment.recipient?.address}
          shippedAt={trackingShipment.shippedAt}
          deliveredAt={trackingShipment.deliveredAt}
          userRole="SUPPLIER"
          onStatusUpdated={() => void fetchData(true)}
        />
      )}
    </div>
  );
}
