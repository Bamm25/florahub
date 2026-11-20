"use client";

import { useEffect, useState, useMemo } from "react";
import { Eye, Receipt, Truck, Navigation } from "lucide-react";
import Modal from "@/components/forms/Modal";
import { getSupplierSales, StockTransactionItem } from "@/lib/api/supplier";
import StatusBadge from "@/components/ui/StatusBadge";
import SupplierDeliveryStatus from "@/components/ui/SupplierDeliveryStatus";
import ShipmentTrackingModal from "@/components/ui/ShipmentTrackingModal";
import {
  formatRupiah,
  formatDate,
  formatDateTime,
} from "@/lib/utils/formatters";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import FilterBar from "@/components/ui/FilterBar";

export default function SupplierSalesPage() {
  const [sales, setSales] = useState<StockTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Rincian pesanan; pembayaran hanya melalui Midtrans
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<StockTransactionItem | null>(
    null,
  );
  const [trackingSale, setTrackingSale] = useState<StockTransactionItem | null>(
    null,
  );

  // Ambil daftar riwayat penjualan dari backend
  const fetchSales = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getSupplierSales({ limit: 100 });
      setSales(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat riwayat transaksi penjualan",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchSales());
  }, []);

  // Filter data berdasarkan tab yang dipilih
  const filteredSales = useMemo(() => {
    if (activeFilter === "PENDING") {
      return sales.filter((sale) => sale.status === "PENDING");
    }
    if (activeFilter === "PAID") {
      return sales.filter((sale) => sale.status === "PAID");
    }
    if (activeFilter === "SHIPPED") {
      return sales.filter((sale) => sale.status === "SHIPPED");
    }
    if (activeFilter === "DELIVERED") {
      return sales.filter((sale) => sale.status === "DELIVERED");
    }
    if (activeFilter === "CANCELLED") {
      return sales.filter((sale) => sale.status === "CANCELLED");
    }
    return sales;
  }, [sales, activeFilter]);

  // Konfigurasi opsi FilterBar
  const filterOptions = [
    { id: "ALL", label: "Semua", count: sales.length },
    {
      id: "PENDING",
      label: "Menunggu Pembayaran",
      count: sales.filter((s) => s.status === "PENDING").length,
    },
    {
      id: "PAID",
      label: "Lunas (Siap Kirim)",
      count: sales.filter((s) => s.status === "PAID").length,
    },
    {
      id: "SHIPPED",
      label: "Resi Dibuat",
      count: sales.filter((s) => s.status === "SHIPPED").length,
    },
    {
      id: "DELIVERED",
      label: "Selesai",
      count: sales.filter((s) => s.status === "DELIVERED").length,
    },
  ];

  // Buka modal rincian transaksi penjualan
  const handleOpenModal = (sale: StockTransactionItem) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  // Loading & Error States
  if (isLoading) {
    return <LoadingSpinner message="Memuat data riwayat penjualan stok..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Riwayat Penjualan Gagal Dimuat"
        error={error}
        onRetry={fetchSales}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Penjualan Stok Bunga
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pantau pembelian stok florist dan pembayaran Midtrans.
        </p>
      </div>

      {/* Filter Kategori Status */}
      <FilterBar
        filters={filterOptions}
        activeFilter={activeFilter}
        onChange={setActiveFilter}
      />

      {/* Tabel Riwayat Penjualan */}
      {filteredSales.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-10 w-10 text-muted-foreground" />}
          title={
            activeFilter !== "ALL"
              ? "Tidak ada transaksi dalam filter ini"
              : "Belum ada transaksi penjualan"
          }
          description={
            activeFilter !== "ALL"
              ? "Pilih tab filter lainnya untuk melihat transaksi penjualan."
              : "Saat florist memesan bahan baku dari katalog stok Anda, transaksinya akan tercatat di sini."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-container-lowest text-xs font-medium uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="px-6 py-4">
                    ID & Tanggal
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Florist
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Bunga Dipesan
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Total Tagihan
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-4 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSales.map((sale) => {
                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-surface-container-lowest/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-mono text-xs font-bold text-foreground">
                          #{sale.id.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(sale.createdAt)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-semibold text-foreground">
                          {sale.florist.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.florist.email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">
                          {sale.stock.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.quantity.toLocaleString("id-ID")} tangkai (
                          {formatRupiah(sale.pricePerUnit)} / tangkai)
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-foreground">
                        {formatRupiah(sale.totalPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sale.biteshipOrderId ? <SupplierDeliveryStatus status={sale.status} booked /> : <StatusBadge status={sale.status} variant="shipment" size="sm" />}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sale.status === "PAID" && !sale.biteshipOrderId && (
                            <a
                              href="/supplier/shipments"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span>Atur Pengiriman</span>
                            </a>
                          )}
                          {sale.biteshipOrderId && (
                            <button
                              type="button"
                              onClick={() => setTrackingSale(sale)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                            >
                              <Navigation className="h-3.5 w-3.5 text-primary" />
                              <span>Lacak & Kontrol Kurir</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenModal(sale)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-container transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Rincian</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rincian transaksi dan status pembayaran otomatis */}
      <Modal
        isOpen={isModalOpen && Boolean(selectedSale)}
        onClose={() => setIsModalOpen(false)}
        size="sm"
        title="Rincian Transaksi Penjualan"
        subtitle={selectedSale ? `ID: #${selectedSale.id}` : undefined}
        footer={
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-container"
          >
            Tutup
          </button>
        }
      >
        {selectedSale && (
          <div className="space-y-4 text-sm">
            {/* Rincian Pemesan & Bunga */}
            <div className="rounded-xl bg-surface-container-low p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Florist Pemesan:
                </span>
                <span className="font-semibold text-foreground">
                  {selectedSale.florist.name} ({selectedSale.florist.email})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bunga Dipesan:</span>
                <span className="font-semibold text-foreground">
                  {selectedSale.stock.name} (
                  {selectedSale.stock.variety || "Standar"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kuantitas:</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {selectedSale.quantity.toLocaleString("id-ID")} tangkai
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Waktu Pemesanan:
                </span>
                <span className="text-foreground">
                  {formatDateTime(selectedSale.createdAt)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
                <span>Total Tagihan:</span>
                <span className="text-foreground tabular-nums">
                  {formatRupiah(selectedSale.totalPrice)}
                </span>
              </div>
            </div>

            {selectedSale.status === "PENDING" && (
              <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                Menunggu pembayaran florist melalui Midtrans. Hanya pembayaran yang terverifikasi otomatis dapat diproses untuk pengiriman.
              </p>
            )}
            {selectedSale.biteshipOrderId && (
              <div className="rounded-xl border border-border bg-surface-container-low p-4 space-y-3">
                <SupplierDeliveryStatus
                  status={selectedSale.status}
                  booked={true}
                  courier={selectedSale.courier}
                  trackingNumber={selectedSale.trackingNumber}
                  bookedAt={selectedSale.shippedAt}
                  deliveredAt={selectedSale.deliveredAt}
                />
                <button
                  type="button"
                  onClick={() => {
                    const saleToTrack = selectedSale;
                    setIsModalOpen(false);
                    setTrackingSale(saleToTrack);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <Navigation className="h-4 w-4" />
                  <span>Buka Pelacakan & Kontrol Serah Terima Kurir</span>
                </button>
              </div>
            )}

            {/* Arahkan ke menu Pengiriman Biteship saat status Lunas (PAID) */}
            {selectedSale.status === "PAID" && !selectedSale.biteshipOrderId && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-xs text-foreground">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Truck className="h-4 w-4" />
                  <span>Pesanan Lunas — Siap Diproses untuk Pengiriman</span>
                </div>
                <p className="text-muted-foreground">
                  Buka menu Pengiriman untuk memilih kurir Biteship, menghitung ongkos kirim, dan menerbitkan resi otomatis.
                </p>
                <a
                  href="/supplier/shipments"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>Atur Pengiriman Biteship</span>
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL PELACAKAN PENGIRIMAN PASOKAN UNTUK SUPPLIER */}
      {trackingSale && (
        <ShipmentTrackingModal
          isOpen={Boolean(trackingSale)}
          onClose={() => setTrackingSale(null)}
          shipmentId={trackingSale.id}
          orderNumber={`SO-${trackingSale.id.slice(-8).toUpperCase()}`}
          orderType="DIRECT_SALE"
          courierName={trackingSale.courier}
          trackingNumber={trackingSale.trackingNumber}
          currentStatus={trackingSale.status}
          recipientName={trackingSale.florist?.name}
          shippedAt={trackingSale.shippedAt}
          deliveredAt={trackingSale.deliveredAt}
          userRole="SUPPLIER"
          onStatusUpdated={() => {
            void fetchSales();
          }}
        />
      )}
    </div>
  );
}
