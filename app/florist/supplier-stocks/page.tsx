"use client";

import { useEffect, useState } from "react";
import {
  Flower2,
  Search,
  ShoppingCart,
  Loader2,
  X,
  MapPin,
  Building2,
  Sparkles,
  Navigation,
  CheckCircle2,
  RefreshCw,
  Printer,
} from "lucide-react";
import DataStateWrapper from "@/components/ui/DataStateWrapper";
import StatusBadge from "@/components/ui/StatusBadge";
import SupplierDeliveryStatus from "@/components/ui/SupplierDeliveryStatus";
import ShipmentTrackingModal from "@/components/ui/ShipmentTrackingModal";
import { formatRupiah, formatDateTime } from "@/lib/utils/formatters";
import {
  getSupplierStocksMarketplace,
  purchaseSupplierStock,
  getDirectSaleSnapToken,
  confirmDirectPurchaseMidtrans,
  receiveDirectPurchase,
  getSupplierShipmentLabel,
  getFloristStockPurchases,
  FloristStockPurchase,
  SupplierMarketplaceStock,
} from "@/lib/api/supplier";

export default function FloristSupplierStocksPage() {
  const [stocks, setStocks] = useState<SupplierMarketplaceStock[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const selectedVariety = "ALL";

  // Modal Pembelian Langsung
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] =
    useState<SupplierMarketplaceStock | null>(null);
  const [buyQuantity, setBuyQuantity] = useState("50");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<FloristStockPurchase[]>([]);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [trackingPurchase, setTrackingPurchase] = useState<FloristStockPurchase | null>(null);
  const [activeTab, setActiveTab] = useState<"catalog" | "orders">("catalog");
  const [buyError, setBuyError] = useState<string | null>(null);

  const fetchStocks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getSupplierStocksMarketplace({
        search: searchQuery,
        variety: selectedVariety,
      });
      setStocks(res.stocks);
      setTotalCount(res.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat pasokan supplier",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchStocks());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPurchases = async () => {
    setIsLoadingPurchases(true);
    try {
      setPurchaseError(null);
      setPurchases(await getFloristStockPurchases());
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : "Gagal memuat pesanan");
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  useEffect(() => { void Promise.resolve().then(() => fetchPurchases()); }, []);

  const openPayment = async (id: string) => {
    try {
      setPayingId(id);
      if (!window.snap) throw new Error("Midtrans Snap belum siap. Muat ulang halaman dan coba lagi.");
      const { snapToken } = await getDirectSaleSnapToken(id);
      window.snap.pay(snapToken, {
        onSuccess: async (result: { transaction_id?: string; order_id?: string }) => {
          try {
            await confirmDirectPurchaseMidtrans(id, result?.transaction_id || result?.order_id);
            setBuySuccess("Pembayaran Midtrans berhasil diverifikasi! Pesanan Anda kini berstatus Lunas.");
          } catch (confirmErr) {
            console.error("Auto confirm direct sale error:", confirmErr);
            setBuySuccess("Pembayaran diterima Midtrans. Klik 'Cek Status Pembayaran' jika status belum berubah.");
          }
          setActiveTab("orders");
          void fetchPurchases();
        },
        onPending: () => {
          setBuySuccess("Pembayaran masih menunggu penyelesaian (misalnya transfer VA). Selesaikan sesuai instruksi Midtrans.");
          setActiveTab("orders");
          void fetchPurchases();
        },
        onError: () => {
          setBuyError("Pembayaran Midtrans gagal atau dibatalkan.");
          void fetchPurchases();
        },
        onClose: () => {
          void fetchPurchases();
        },
      });
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : "Gagal membuka pembayaran Midtrans");
      setActiveTab("orders");
    } finally {
      setPayingId(null);
    }
  };

  const handleCheckStatus = async (id: string) => {
    try {
      setCheckingId(id);
      setBuyError(null);
      await confirmDirectPurchaseMidtrans(id);
      setBuySuccess("Status pembayaran berhasil diverifikasi dari Midtrans! Pesanan Anda kini Lunas.");
      await fetchPurchases();
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : "Pembayaran belum terverifikasi di Midtrans.");
    } finally {
      setCheckingId(null);
    }
  };

  const handleReceivePurchase = async (purchase: FloristStockPurchase) => {
    try {
      setReceivingId(purchase.id);
      setBuyError(null);
      await receiveDirectPurchase(purchase.id);
      setBuySuccess(`Bunga ${purchase.stock.name} berhasil dikonfirmasi diterima! Stok telah otomatis ditambahkan ke inventaris florist Anda.`);
      await fetchPurchases();
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : "Gagal mengonfirmasi penerimaan bunga");
    } finally {
      setReceivingId(null);
    }
  };

  const handlePrintLabel = async (purchase: FloristStockPurchase) => {
    try {
      if (purchase.biteshipLabelUrl) {
        window.open(purchase.biteshipLabelUrl, "_blank");
        return;
      }
      const labelUrl = await getSupplierShipmentLabel(purchase.id);
      if (labelUrl) {
        window.open(labelUrl, "_blank");
      } else {
        alert("Label pengiriman Biteship belum tersedia");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal membuka label pengiriman");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStocks();
  };

  const openBuyModal = (stock: SupplierMarketplaceStock) => {
    setSelectedStock(stock);
    setBuyQuantity(String(Math.min(50, stock.quantity)));
    setBuySuccess(null);
    setBuyError(null);
    setIsBuyModalOpen(true);
  };

  const handleBuySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;

    const qty = Number(buyQuantity);
    if (!Number.isSafeInteger(qty) || qty <= 0) {
      setBuyError("Kuantitas harus berupa angka positif");
      return;
    }

    if (qty > selectedStock.quantity) {
      setBuyError(`Stok kebun tidak mencukupi (tersedia: ${selectedStock.quantity} tangkai)`);
      return;
    }

    try {
      setIsSubmitting(true);
      setBuyError(null);
      const transaction = await purchaseSupplierStock(selectedStock.id, qty);
      setBuySuccess(`Pesanan ${qty} tangkai ${selectedStock.name} dibuat. Pembayaran belum lunas; lanjutkan lewat Midtrans.`);
      void fetchStocks();
      void fetchPurchases();
      setIsBuyModalOpen(false);
      setActiveTab("orders");
      await openPayment(transaction.id);
    } catch (err) {
      setBuyError(
        err instanceof Error ? err.message : "Gagal melakukan pembelian stok",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col gap-6 rounded-2xl bg-[#10121b] px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b4aeff]">
            Katalog Pasokan Langsung (Ready Stock)
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Beli Bunga dari Petani
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Pesan stok kebun, bayar melalui Midtrans, lalu pantau booking kurir Biteship. Stok masuk inventaris setelah pesanan benar-benar diterima.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-white/80 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
            Tersedia: <strong>{totalCount} Macam Bunga</strong>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Katalog dan pesanan pasokan">
        <button type="button" role="tab" aria-selected={activeTab === "catalog"} onClick={() => setActiveTab("catalog")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === "catalog" ? "bg-primary text-primary-foreground" : "border border-border bg-surface"}`}>Katalog stok</button>
        <button type="button" role="tab" aria-selected={activeTab === "orders"} onClick={() => { setActiveTab("orders"); fetchPurchases(); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === "orders" ? "bg-primary text-primary-foreground" : "border border-border bg-surface"}`}>Pesanan saya ({purchases.length})</button>
      </div>
      {activeTab === "orders" && (
        <section className="space-y-4" aria-label="Riwayat pembelian pasokan">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Riwayat pembelian</h2><button type="button" onClick={fetchPurchases} className="rounded-xl border border-border px-3 py-2 text-xs">Perbarui status</button></div>
          {buySuccess && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{buySuccess}</p>}
          {buyError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{buyError}</p>}
          {purchaseError && <p role="alert" className="text-rose-700">{purchaseError} <button onClick={fetchPurchases} type="button" className="underline">Coba lagi</button></p>}
          {isLoadingPurchases && purchases.length === 0 && <p role="status" className="text-xs text-muted-foreground">Memuat riwayat pesanan...</p>}
          {!isLoadingPurchases && !purchaseError && purchases.length === 0 && <p className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">Belum ada pesanan stok. Pilih bunga dari katalog untuk memulai.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {purchases.map((order) => (
              <article key={order.id} className="space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {order.stock.name} · {order.quantity} {order.stock.unit || "tangkai"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.stock.supplier?.name} · #{order.id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  {order.biteshipOrderId ? (
                    <SupplierDeliveryStatus
                      status={order.status}
                      booked
                      courier={order.courier}
                      trackingNumber={order.trackingNumber}
                      bookedAt={order.shippedAt}
                      deliveredAt={order.deliveredAt}
                    />
                  ) : (
                    <StatusBadge status={order.status} variant="shipment" size="sm" />
                  )}
                </div>

                <p className="font-semibold text-foreground">{formatRupiah(order.totalPrice)}</p>
                <p className="text-xs text-muted-foreground">Dipesan {formatDateTime(order.createdAt)}</p>

                {order.status === "PENDING" && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs text-amber-700">
                      Belum dibayar atau menunggu verifikasi Midtrans.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={payingId === order.id}
                        onClick={() => openPayment(order.id)}
                        className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {payingId === order.id ? "Membuka Midtrans..." : "Bayar melalui Midtrans"}
                      </button>
                      <button
                        type="button"
                        disabled={checkingId === order.id}
                        onClick={() => handleCheckStatus(order.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-container transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3 w-3 ${checkingId === order.id ? "animate-spin text-primary" : ""}`} />
                        <span>Cek Status Pembayaran</span>
                      </button>
                    </div>
                  </div>
                )}

                {order.status === "PAID" && !order.biteshipOrderId && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-medium text-primary">
                      Lunas 100% terverifikasi • Menunggu supplier menyiapkan kurir Biteship.
                    </p>
                  </div>
                )}

                {order.biteshipOrderId && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setTrackingPurchase(order)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Navigation className="h-3.5 w-3.5 text-primary" />
                        <span>Lacak Posisi Bunga</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintLabel(order)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-container transition-colors"
                        title="Cetak Label Pengiriman AWB"
                      >
                        <Printer className="h-3.5 w-3.5 text-primary" />
                        <span>Label</span>
                      </button>

                      {order.status === "SHIPPED" && (
                        <button
                          type="button"
                          disabled={receivingId === order.id}
                          onClick={() => handleReceivePurchase(order)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
                        >
                          {receivingId === order.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>Konfirmasi Bunga Diterima</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {order.status === "DELIVERED" && (
                  <p className="text-xs font-medium text-foreground pt-1">
                    Bunga telah diterima • Stok masuk ke inventaris bahan baku florist.
                  </p>
                )}
                {order.status === "CANCELLED" && (
                  <p className="text-xs text-rose-700 pt-1">Pesanan dibatalkan.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      {activeTab === "catalog" && <>
      {/* Filter & Pencarian */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari bunga, varietas, atau nama kebun supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 w-full text-xs"
          />
        </form>
        <button
          type="button"
          onClick={fetchStocks}
          className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-container"
        >
          Cari
        </button>
      </div>

      {/* Kartu Bunga Pasokan Supplier */}
      <DataStateWrapper
        isLoading={isLoading && stocks.length === 0}
        error={error}
        isEmpty={stocks.length === 0}
        emptyIcon={<Flower2 className="h-12 w-12 text-muted-foreground" />}
        emptyTitle="Belum ada pasokan bunga yang tersedia"
        emptyDescription="Supplier belum mendaftarkan katalog stok bunga ready stock saat ini."
        onRetry={fetchStocks}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stocks.map((stock) => (
            <div
              key={stock.id}
              className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {stock.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Varietas: {stock.variety}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>Ready Stock</span>
                  </span>
                </div>

                <div className="mt-4 space-y-2 pt-3 border-t border-border text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>Kebun: <strong>{stock.supplier.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>Lokasi: {stock.location} ({stock.supplier.city})</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-muted-foreground">Stok Tersedia:</span>
                    <span className="font-bold text-foreground">
                      {stock.quantity} {stock.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harga Satuan:</span>
                    <span className="font-bold text-foreground text-sm">
                      {formatRupiah(stock.pricePerUnit)} / {stock.unit}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openBuyModal(stock)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors shadow-xs"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Beli Pasokan Sekarang</span>
              </button>
            </div>
          ))}
        </div>
      </DataStateWrapper>

      </>}

      {/* MODAL BELI PASOKAN BUNGA LANGSUNG */}
      {isBuyModalOpen && selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  Beli Bunga Langsung
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsBuyModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-surface-container"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBuySubmit} className="mt-4 space-y-4">
                {buyError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    {buyError}
                  </div>
                )}

                <div className="rounded-xl bg-surface-container-low p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bunga:</span>
                    <span className="font-semibold text-foreground">{selectedStock.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier:</span>
                    <span className="text-foreground">{selectedStock.supplier.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harga Satuan:</span>
                    <span className="font-semibold text-foreground">
                      {formatRupiah(selectedStock.pricePerUnit)} / {selectedStock.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maksimal Pesan:</span>
                    <span className="font-bold text-foreground">
                      {selectedStock.quantity} {selectedStock.unit}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground">
                    Jumlah Tangkai yang Dibeli *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedStock.quantity}
                    required
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(e.target.value)}
                    className="input-field mt-1 w-full text-xs font-semibold"
                  />
                </div>

                <div className="rounded-xl border border-border p-3 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Estimasi Total Harga:</span>
                  <span className="text-base font-bold text-foreground">
                    {formatRupiah(
                      (parseInt(buyQuantity, 10) || 0) * selectedStock.pricePerUnit,
                    )}
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsBuyModalOpen(false)}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-container"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Buat Pesanan & Bayar Midtrans</span>
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}
      {/* MODAL PELACAKAN PENGIRIMAN PASOKAN UNTUK FLORIST */}
      {trackingPurchase && (
        <ShipmentTrackingModal
          isOpen={Boolean(trackingPurchase)}
          onClose={() => setTrackingPurchase(null)}
          shipmentId={trackingPurchase.id}
          orderNumber={`SO-${trackingPurchase.id.slice(-8).toUpperCase()}`}
          orderType="DIRECT_SALE"
          courierName={trackingPurchase.courier}
          trackingNumber={trackingPurchase.trackingNumber}
          currentStatus={trackingPurchase.status}
          recipientName="Toko Bunga Florist"
          shippedAt={trackingPurchase.shippedAt}
          deliveredAt={trackingPurchase.deliveredAt}
          userRole="FLORIST"
          onStatusUpdated={() => {
            void fetchPurchases();
          }}
        />
      )}
    </div>
  );
}
