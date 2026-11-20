"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import Modal from "@/components/forms/Modal";
import { getAllSupplierSales, StockTransactionItem } from "@/lib/api/supplier";
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
import SearchInput from "@/components/ui/SearchInput";
import Pagination from "@/components/ui/Pagination";

const ITEMS_PER_PAGE = 10;

export default function SupplierSalesPage() {
  const [sales, setSales] = useState<StockTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pencarian & Paginasi
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal rincian & pelacakan pesanan
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<StockTransactionItem | null>(
    null,
  );
  const [trackingSale, setTrackingSale] = useState<StockTransactionItem | null>(
    null,
  );

  // Ambil seluruh riwayat penjualan dari backend
  const fetchSales = async (silent = false) => {
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      const res = await getAllSupplierSales();
      setSales(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat riwayat transaksi penjualan",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchSales());
  }, []);

  // Ringkasan KPI
  const summaryStats = useMemo(() => {
    const total = sales.length;
    const readyCount = sales.filter((s) => s.status === "PAID").length;
    const shippedCount = sales.filter((s) => s.status === "SHIPPED").length;
    const deliveredCount = sales.filter((s) => s.status === "DELIVERED").length;
    return { total, readyCount, shippedCount, deliveredCount };
  }, [sales]);

  // Filter data berdasarkan pencarian dan kategori status
  const filteredSales = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return sales.filter((sale) => {
      if (activeFilter !== "ALL" && sale.status !== activeFilter) {
        return false;
      }
      if (!keyword) return true;
      const orderIdShort = sale.id.slice(-8).toLowerCase();
      return (
        sale.id.toLowerCase().includes(keyword) ||
        orderIdShort.includes(keyword) ||
        sale.florist.name.toLowerCase().includes(keyword) ||
        sale.florist.email.toLowerCase().includes(keyword) ||
        sale.stock.name.toLowerCase().includes(keyword) ||
        (sale.stock.variety?.toLowerCase().includes(keyword) ?? false)
      );
    });
  }, [sales, searchQuery, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSales = useMemo(() => {
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSales, safePage]);

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
      label: "Siap Kirim",
      count: sales.filter((s) => s.status === "PAID").length,
    },
    {
      id: "SHIPPED",
      label: "Dalam Pengiriman",
      count: sales.filter((s) => s.status === "SHIPPED").length,
    },
    {
      id: "DELIVERED",
      label: "Selesai",
      count: sales.filter((s) => s.status === "DELIVERED").length,
    },
    {
      id: "CANCELLED",
      label: "Dibatalkan",
      count: sales.filter((s) => s.status === "CANCELLED").length,
    },
  ];

  const handleOpenModal = (sale: StockTransactionItem) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <LoadingSpinner message="Memuat data riwayat penjualan stok..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Riwayat Penjualan Gagal Dimuat"
        error={error}
        onRetry={() => void fetchSales()}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Header Editorial Gelap */}
      <div className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Riwayat Pasokan
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Penjualan Stok Bunga
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Pantau pembelian stok langsung dari florist, status pembayaran, dan
            pengirimannya.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void fetchSales(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-white/20 bg-white/5 px-5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {isRefreshing && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            <span>Segarkan Data</span>
          </button>
          <Link
            href="/supplier/shipments"
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kelola Pengiriman
          </Link>
        </div>
      </div>

      {/* Ringkasan KPI 4-sel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="p-5 border-b border-r lg:border-b-0 border-border">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Transaksi
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {summaryStats.total}
          </p>
        </div>
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-border">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Siap Kirim
          </p>
          <p
            className={`mt-2 text-3xl font-bold tabular-nums ${
              summaryStats.readyCount > 0 ? "text-warning" : "text-foreground"
            }`}
          >
            {summaryStats.readyCount}
          </p>
        </div>
        <div className="p-5 border-r border-border">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dalam Pengiriman
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-primary">
            {summaryStats.shippedCount}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Selesai
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-success">
            {summaryStats.deliveredCount}
          </p>
        </div>
      </div>

      {/* Bar Pencarian & Filter Kategori Status */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setCurrentPage(1);
            }}
            placeholder="Cari nomor order, florist, atau bunga..."
            className="max-w-md"
          />
          {filteredSales.length > 0 && (
            <p className="text-xs tabular-nums text-muted-foreground">
              Menampilkan {(safePage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(safePage * ITEMS_PER_PAGE, filteredSales.length)} dari{" "}
              {filteredSales.length} transaksi
            </p>
          )}
        </div>
        <FilterBar
          filters={filterOptions}
          activeFilter={activeFilter}
          onChange={(filterId) => {
            setActiveFilter(filterId);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Tabel Riwayat Penjualan */}
      {filteredSales.length === 0 ? (
        <EmptyState
          title={
            searchQuery || activeFilter !== "ALL"
              ? "Tidak ada transaksi yang cocok"
              : "Belum ada transaksi penjualan"
          }
          description={
            searchQuery || activeFilter !== "ALL"
              ? "Coba ubah kata kunci pencarian atau pilih filter status lainnya."
              : "Saat florist memesan bahan baku dari katalog stok Anda, transaksinya akan tercatat di sini."
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-container-lowest text-xs font-medium uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      ID &amp; Tanggal
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
                  {paginatedSales.map((sale) => {
                    const unit = sale.stock.unit || "tangkai";
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
                            <time dateTime={sale.createdAt} className="tabular-nums">
                              {formatDate(sale.createdAt)}
                            </time>
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
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {sale.quantity.toLocaleString("id-ID")} {unit} (
                            {formatRupiah(sale.pricePerUnit)} / {unit})
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold tabular-nums text-foreground">
                          {formatRupiah(sale.totalPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {sale.biteshipOrderId ? (
                            <SupplierDeliveryStatus
                              status={sale.status}
                              booked
                            />
                          ) : (
                            <StatusBadge
                              status={sale.status}
                              variant="shipment"
                              size="sm"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {sale.status === "PAID" &&
                              !sale.biteshipOrderId && (
                                <Link
                                  href="/supplier/shipments"
                                  className="inline-flex min-h-8 items-center justify-center rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                                >
                                  Atur Pengiriman
                                </Link>
                              )}
                            {sale.biteshipOrderId && (
                              <button
                                type="button"
                                onClick={() => setTrackingSale(sale)}
                                className="inline-flex min-h-8 items-center justify-center rounded-sm border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                              >
                                Lacak Pengiriman
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenModal(sale)}
                              className="inline-flex min-h-8 items-center justify-center rounded-sm border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container"
                            >
                              Rincian
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

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            ariaLabel="Navigasi halaman penjualan stok"
          />
        </div>
      )}

      {/* Modal Rincian Transaksi */}
      <Modal
        isOpen={isModalOpen && Boolean(selectedSale)}
        onClose={() => setIsModalOpen(false)}
        size="sm"
        headerVariant="dark"
        kicker="Transaksi Pasokan"
        title="Rincian Transaksi Penjualan"
        subtitle={
          selectedSale ? `ID: #${selectedSale.id.slice(-8).toUpperCase()}` : undefined
        }
        footer={
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
          >
            Tutup
          </button>
        }
      >
        {selectedSale && (
          <div className="space-y-4 text-sm">
            {/* Rincian Pemesan & Bunga */}
            <div className="rounded-xl bg-surface-container-low p-4 space-y-2.5 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Florist Pemesan:</span>
                <span className="text-right font-semibold text-foreground">
                  {selectedSale.florist.name} ({selectedSale.florist.email})
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Bunga Dipesan:</span>
                <span className="text-right font-semibold text-foreground">
                  {selectedSale.stock.name} (
                  {selectedSale.stock.variety || "Standar"})
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Kuantitas:</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {selectedSale.quantity.toLocaleString("id-ID")}{" "}
                  {selectedSale.stock.unit || "tangkai"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Waktu Pemesanan:</span>
                <span className="text-foreground tabular-nums">
                  <time dateTime={selectedSale.createdAt}>
                    {formatDateTime(selectedSale.createdAt)}
                  </time>
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2.5 text-sm font-bold text-foreground">
                <span>Total Tagihan:</span>
                <span className="text-foreground tabular-nums">
                  {formatRupiah(selectedSale.totalPrice)}
                </span>
              </div>
            </div>

            {selectedSale.status === "PENDING" && (
              <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                Menunggu pembayaran dari florist. Pesanan baru dapat dikirim
                setelah pembayaran terkonfirmasi lunas.
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
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      const saleToTrack = selectedSale;
                      setIsModalOpen(false);
                      setTrackingSale(saleToTrack);
                    }}
                    className="flex-1 inline-flex min-h-10 items-center justify-center rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Lacak Pengiriman
                  </button>
                  <a
                    href={`/api/supplier/shipments/${selectedSale.id}/label`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container"
                  >
                    Cetak Label
                  </a>
                </div>
              </div>
            )}

            {/* Arahkan ke menu Pengiriman saat status Lunas (PAID) */}
            {selectedSale.status === "PAID" && !selectedSale.biteshipOrderId && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2.5 text-xs text-foreground">
                <p className="font-semibold text-primary">
                  Pesanan Lunas — Siap Dikirim
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Buka halaman Pengiriman untuk memilih layanan kurir, melihat
                  ongkos kirim, dan menerbitkan resi pengiriman.
                </p>
                <Link
                  href="/supplier/shipments"
                  className="inline-flex min-h-9 items-center justify-center rounded-sm bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Atur Pengiriman
                </Link>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Pelacakan Pengiriman Pasokan */}
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
            void fetchSales(true);
          }}
        />
      )}
    </div>
  );
}
