"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Loader2,
  X,
  Truck,
  Printer,
  Navigation,
  Search,
} from "lucide-react";
import TabNavigation from "@/components/ui/TabNavigation";
import DataStateWrapper from "@/components/ui/DataStateWrapper";
import SupplierDeliveryStatus from "@/components/ui/SupplierDeliveryStatus";
import ShipmentTrackingModal from "@/components/ui/ShipmentTrackingModal";
import { formatRupiah } from "@/lib/utils/formatters";
import {
  getSupplierShipments,
  getSupplierReadyToShipOrders,
  getSupplierBiteshipRates,
  autoCreateSupplierShipment,
  getSupplierShipmentLabel,
  SupplierUnifiedShipment,
  SupplierReadyToShipOrder,
  SupplierBiteshipRate,
} from "@/lib/api/supplier";

export default function SupplierShipmentsPage() {
  const [shipments, setShipments] = useState<SupplierUnifiedShipment[]>([]);
  const [readyOrders, setReadyOrders] = useState<SupplierReadyToShipOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"shipments" | "ready">("shipments");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] =
    useState<SupplierReadyToShipOrder | null>(null);
  const [availableRates, setAvailableRates] = useState<SupplierBiteshipRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal Tracking
  const [trackingShipment, setTrackingShipment] =
    useState<SupplierUnifiedShipment | null>(null);

  // Ambil data pengiriman dan pesanan siap kirim
  const fetchData = async () => {
    setIsLoading(true);
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
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchData());
  }, []);

  // Buka modal buat resi — langsung ambil tarif Biteship
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

      setModalError(err instanceof Error ? err.message : "Gagal mengambil tarif Biteship");
    } finally {
      setIsFetchingRates(false);
    }
  };

  // Submit pengiriman via Biteship
  const handleShipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      setIsSubmitting(true);
      setModalError(null);

      const rateObj = availableRates.find((r) => r.rate_id === selectedRate);
      if (!rateObj) {
        throw new Error("Pilih opsi kurir pengiriman Biteship terlebih dahulu");
      }

      await autoCreateSupplierShipment({
        orderType: selectedOrder.orderType,
        orderId: selectedOrder.id,
        courierCompany: rateObj.courier.code,
        courierType: rateObj.courier.service_code,
      });

      setIsModalOpen(false);
      setSelectedOrder(null);
      await fetchData();
      setActiveTab("shipments");
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

  // Cetak label thermal AWB Biteship
  const handlePrintLabel = async (shipment: SupplierUnifiedShipment) => {
    try {
      if (shipment.biteshipLabelUrl) {
        window.open(shipment.biteshipLabelUrl, "_blank");
        return;
      }
      const labelUrl = await getSupplierShipmentLabel(shipment.id);
      if (labelUrl) {
        window.open(labelUrl, "_blank");
      } else {
        alert("Label pengiriman Biteship belum tersedia");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal membuka label pengiriman");
    }
  };

  // Hitung metrik statistik
  const bookedShipments = shipments.filter((s) => s.biteshipOrderId);
  const shippedCount = bookedShipments.filter((s) => s.status === "SHIPPED").length;
  const totalShipments = bookedShipments.length;
  const bookedCount = bookedShipments.filter((s) => s.status === "PAID").length;
  const deliveredCount = bookedShipments.filter((s) => s.status === "DELIVERED").length;
  const readyCount = readyOrders.length;

  // Filter data tabel
  const filteredShipments = bookedShipments.filter((s) => {
    const matchesSearch =
      s.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.recipient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.trackingNumber &&
        s.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col gap-6 rounded-2xl bg-[#10121b] px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b4aeff]">
            Logistik & Pengiriman Pasokan
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Pengiriman
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Buat resi, pilih kurir, dan pantau paket ke florist.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Segarkan Data
          </button>
        </div>
      </div>

      {/* Panel Statistik Pengiriman */}
      <div className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Booking
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {totalShipments} <span className="text-xs font-normal text-muted-foreground">({deliveredCount} selesai)</span>
          </p>
        </div>
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Perlu Dibuat Resi
          </p>
          <p className={`mt-2 text-3xl font-bold ${readyCount > 0 ? "text-amber-600" : "text-foreground"}`}>
            {readyCount}
          </p>
        </div>
        <div className="p-5 border-b sm:border-b-0 lg:border-r border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Menunggu Penjemputan
          </p>
          <p className="mt-2 text-3xl font-bold text-indigo-600">
            {bookedCount}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Dijemput Kurir / Dikirim
          </p>
          <p className="mt-2 text-3xl font-bold text-indigo-600">
            {shippedCount}
          </p>
        </div>
      </div>

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
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari order, florist, atau no. resi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 w-full text-xs"
              />
            </div>
            <div className="flex gap-2">
              {["ALL", "PAID", "SHIPPED", "DELIVERED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    statusFilter === st
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface border border-border text-muted-foreground hover:bg-surface-container"
                  }`}
                >
                  {st === "ALL"
                    ? "Semua"
                    : st === "PAID"
                    ? "Booking · Menunggu Jemput"
                    : st === "SHIPPED"
                    ? "Dijemput Kurir"
                    : "Selesai"}
                </button>
              ))}
            </div>
          </div>

          <DataStateWrapper
            isLoading={isLoading && bookedShipments.length === 0}
            error={error}
            isEmpty={filteredShipments.length === 0}
            emptyIcon={<Truck className="h-12 w-12 text-muted-foreground" />}
            emptyTitle="Belum ada booking Biteship"
            emptyDescription="Booking Biteship akan tampil setelah pesanan florist lunas dan supplier memilih kurir."
            onRetry={fetchData}
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[850px]">
                  <thead className="border-b border-border bg-surface-container-lowest text-xs font-medium uppercase text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-5 py-4">No. Order & Tipe</th>
                      <th scope="col" className="px-5 py-4">Florist Penerima</th>
                      <th scope="col" className="px-5 py-4">Bunga & Bobot</th>
                      <th scope="col" className="px-5 py-4">Kurir & Resi</th>
                      <th scope="col" className="px-5 py-4">Status</th>
                      <th scope="col" className="px-5 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredShipments.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-container-lowest/50">
                        <td className="px-5 py-4">
                          <p className="font-mono text-xs font-bold text-foreground">
                            {s.orderNumber}
                          </p>
                          <span className="inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-surface-container text-muted-foreground mt-0.5">
                            {s.orderType === "PREORDER" ? "Pre-Order Panen" : "Penjualan Stok"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-foreground text-xs">
                            {s.recipient.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {s.recipient.address}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-foreground text-xs">{s.itemName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {(s.weight / 1000).toFixed(1)} kg • {formatRupiah(s.totalAmount)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground text-xs">
                              {s.courier}
                            </span>
                            {s.biteshipOrderId && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                Biteship
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-muted-foreground mt-0.5">
                            {s.trackingNumber || "Menunggu resi"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <SupplierDeliveryStatus status={s.status} booked={true} bookedAt={s.shippedAt} deliveredAt={s.deliveredAt} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tombol Lacak */}
                            {s.biteshipOrderId && <button
                              type="button"
                              onClick={() => handleOpenTracking(s)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-surface-container text-foreground"
                              title="Lacak Perjalanan Paket"
                            >
                              <Navigation className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Lacak</span>
                            </button>}

                            {/* Tombol Cetak Label Biteship */}
                            {s.biteshipOrderId && (
                              <button
                                type="button"
                                onClick={() => handlePrintLabel(s)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-surface-container text-foreground"
                                title="Cetak Label Pengiriman AWB"
                              >
                                <Printer className="h-3.5 w-3.5 text-primary" />
                                <span>Label</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          emptyIcon={<Package className="h-12 w-12 text-muted-foreground" />}
          emptyTitle="Tidak ada pesanan yang perlu dikirim"
          emptyDescription="Saat pesanan florist telah lunas 100% (baik penjualan stok maupun pre-order panen), kartu pesanan akan muncul di sini untuk diterbitkan resi Biteship."
          onRetry={fetchData}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs font-bold text-foreground">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Florist: <strong>{order.buyer.name}</strong>
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      LUNAS 100%
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 pt-3 border-t border-border text-xs">
                    <p className="font-semibold text-foreground">{order.itemName}</p>
                    <p className="text-muted-foreground truncate">{order.buyer.address}</p>
                    <div className="flex justify-between pt-1">
                      <span className="text-muted-foreground">Kuantitas & Berat:</span>
                      <span className="font-medium text-foreground">
                        {order.quantity} tangkai (~{(order.weight / 1000).toFixed(1)} kg)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Nilai:</span>
                      <span className="font-bold text-foreground">
                        {formatRupiah(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openCreateModal(order)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors shadow-xs"
                >
                  <Truck className="h-4 w-4" />
                  <span>Buat Resi Shipment (Biteship)</span>
                </button>
              </div>
            ))}
          </div>
        </DataStateWrapper>
      )}

      {/* MODAL BOOKING BITESHIP */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  Buat Resi Pengiriman
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-surface-container"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {modalError}
              </div>
            )}

            <form onSubmit={handleShipmentSubmit} className="mt-4 space-y-4">
              {/* Ringkasan Tujuan */}
              <div className="rounded-xl bg-surface-container-low p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Florist Penerima:</span>
                  <span className="font-semibold text-foreground">{selectedOrder.buyer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alamat Tujuan:</span>
                  <span className="text-foreground truncate max-w-[240px]">{selectedOrder.buyer.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Barang:</span>
                  <span className="font-semibold text-foreground">{selectedOrder.itemName}</span>
                </div>
              </div>

              {/* Pilih Layanan Kurir Biteship */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-foreground">
                  Pilih Layanan Kurir Biteship (Tarif Real-Time)
                </label>

                {isFetchingRates ? (
                  <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Menghitung ongkir Biteship dari kebun ke florist...</span>
                  </div>
                ) : availableRates.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                    Kurir Biteship belum tersedia untuk rute ini atau kode pos tujuan belum sesuai.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {availableRates.map((r) => (
                      <label
                        key={r.rate_id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedRate === r.rate_id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="biteship_rate"
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
                        <span className="text-xs font-bold text-primary">
                          {formatRupiah(r.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-container"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedRate}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Terbitkan Resi Biteship Resmi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          userRole="SUPPLIER"
          onStatusUpdated={() => void fetchData()}
        />
      )}
    </div>
  );
}
