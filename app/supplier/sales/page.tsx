"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  Receipt,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  getSupplierSales,
  confirmSalePayment,
  StockTransactionItem,
} from "@/lib/api/supplier";
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

  // Modal Verifikasi Bukti Pembayaran
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<StockTransactionItem | null>(
    null,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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
    fetchSales();
  }, []);

  // Filter data berdasarkan tab yang dipilih
  const filteredSales = useMemo(() => {
    if (activeFilter === "PENDING") {
      return sales.filter((sale) => sale.status === "PENDING");
    }
    if (activeFilter === "PAID") {
      return sales.filter((sale) => sale.status === "PAID");
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
      label: "Menunggu Konfirmasi",
      count: sales.filter((s) => s.status === "PENDING").length,
    },
    {
      id: "PAID",
      label: "Lunas",
      count: sales.filter((s) => s.status === "PAID").length,
    },
    {
      id: "CANCELLED",
      label: "Dibatalkan",
      count: sales.filter((s) => s.status === "CANCELLED").length,
    },
  ];

  // Helper tampilan lencana status transaksi
  const getStatusBadge = (status: StockTransactionItem["status"]) => {
    switch (status) {
      case "PAID":
        return {
          label: "Lunas",
          color: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: CheckCircle2,
        };
      case "PENDING":
        return {
          label: "Menunggu Konfirmasi",
          color: "bg-amber-50 text-amber-800 border-amber-200",
          icon: Clock,
        };
      case "CANCELLED":
        return {
          label: "Dibatalkan",
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: Clock,
        };
    }
  };

  // Buka modal verifikasi bukti bayar
  const handleOpenModal = (sale: StockTransactionItem) => {
    setSelectedSale(sale);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Konfirmasi pembayaran lunas (memicu pemotongan stok otomatis di backend)
  const handleConfirmPayment = async () => {
    if (!selectedSale) return;

    try {
      setIsConfirming(true);
      setModalError(null);

      await confirmSalePayment(selectedSale.id);

      setIsModalOpen(false);
      setSelectedSale(null);
      await fetchSales();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Gagal mengonfirmasi pembayaran",
      );
    } finally {
      setIsConfirming(false);
    }
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
          Penjualan & Konfirmasi Pembayaran
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Periksa bukti transfer pembayaran dari florist dan konfirmasi
          pelunasan stok bunga.
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
                    Bukti Transfer
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
                  const statusInfo = getStatusBadge(sale.status);
                  const StatusIcon = statusInfo.icon;

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
                        {sale.paymentProof ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Sudah Unggah</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Belum Ada</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(sale)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-container"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>
                            {sale.status === "PENDING"
                              ? "Verifikasi"
                              : "Rincian"}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Verifikasi Pembayaran & Bukti Transfer */}
      {isModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Rincian Transaksi Penjualan
                </h2>
                <p className="font-mono text-xs text-muted-foreground">
                  ID: #{selectedSale.id}
                </p>
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
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="mt-4 space-y-4 text-sm">
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
                  <span className="font-semibold text-foreground">
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
                  <span className="text-emerald-600">
                    {formatRupiah(selectedSale.totalPrice)}
                  </span>
                </div>
              </div>

              {/* Bukti Pembayaran */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">
                  Bukti Pembayaran Florist:
                </p>
                {selectedSale.paymentProof ? (
                  <div className="rounded-xl border border-border p-3 text-center space-y-2">
                    <div className="max-h-56 overflow-hidden rounded-lg bg-black/5 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedSale.paymentProof}
                        alt="Bukti Transfer Florist"
                        className="max-h-56 w-auto object-contain"
                      />
                    </div>
                    <a
                      href={selectedSale.paymentProof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline pt-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Buka Bukti Ukuran Penuh</span>
                    </a>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    Florist belum mengunggah gambar bukti transfer pembayaran.
                  </div>
                )}
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-container"
              >
                Tutup
              </button>

              {selectedSale.status === "PENDING" && (
                <button
                  type="button"
                  disabled={isConfirming}
                  onClick={handleConfirmPayment}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isConfirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Konfirmasi Pembayaran Lunas</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
