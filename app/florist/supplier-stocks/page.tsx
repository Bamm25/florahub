"use client";

import { useEffect, useState } from "react";
import {
  Flower2,
  Search,
  ShoppingCart,
  Loader2,
  MapPin,
  Building2,
  Sparkles,
  Navigation,
  CheckCircle2,
  RefreshCw,
  Printer,
} from "lucide-react";
import Modal from "@/components/forms/Modal";
import DataStateWrapper from "@/components/ui/DataStateWrapper";
import Pagination from "@/components/ui/Pagination";
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
  getFloristStockPurchases,
  FloristStockPurchase,
  SupplierMarketplaceStock,
} from "@/lib/api/supplier";

const CATALOG_PER_PAGE = 9;
const PURCHASES_PER_PAGE = 10;

export default function FloristSupplierStocksPage() {
  const [stocks, setStocks] = useState<SupplierMarketplaceStock[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [catalogPage, setCatalogPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);
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
          } catch {

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogPage(1);
    fetchStocks();
  };

  const catalogTotalPages = Math.max(
    1,
    Math.ceil(stocks.length / CATALOG_PER_PAGE),
  );
  const safeCatalogPage = Math.min(catalogPage, catalogTotalPages);
  const catalogStart = (safeCatalogPage - 1) * CATALOG_PER_PAGE;
  const paginatedStocks = stocks.slice(
    catalogStart,
    catalogStart + CATALOG_PER_PAGE,
  );

  const purchasesTotalPages = Math.max(
    1,
    Math.ceil(purchases.length / PURCHASES_PER_PAGE),
  );
  const safePurchasesPage = Math.min(purchasesPage, purchasesTotalPages);
  const purchasesStart = (safePurchasesPage - 1) * PURCHASES_PER_PAGE;
  const paginatedPurchases = purchases.slice(
    purchasesStart,
    purchasesStart + PURCHASES_PER_PAGE,
  );

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
      <section className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Katalog Pasokan Langsung (Ready Stock)
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Beli Bunga dari Petani
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Pesan stok kebun, bayar melalui Midtrans, lalu pantau pengiriman kurir hingga bunga masuk ke inventaris studio Anda.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold tabular-nums text-white/85">
            Tersedia: <strong>{totalCount} Macam Bunga</strong>
          </span>
        </div>
      </section>

      {/* Toolbar Tab & Pencarian */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div
          role="group"
          aria-label="Tampilan pasokan kebun"
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            aria-pressed={activeTab === "catalog"}
            onClick={() => setActiveTab("catalog")}
            className={`min-h-10 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "catalog"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            Katalog Stok Kebun
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "orders"}
            onClick={() => {
              setActiveTab("orders");
              void fetchPurchases();
            }}
            className={`min-h-10 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "orders"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            Pesanan Saya ({purchases.length})
          </button>
        </div>

        {activeTab === "catalog" ? (
          <form
            onSubmit={handleSearchSubmit}
            className="flex w-full items-center gap-2 sm:max-w-md"
          >
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari bunga atau kebun supplier"
                placeholder="Cari bunga, varietas, atau kebun supplier..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCatalogPage(1);
                }}
                className="input-field w-full py-2 pl-9 text-xs"
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low"
            >
              Cari
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => void fetchPurchases()}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-container-low"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Perbarui Status</span>
          </button>
        )}
      </div>

      {activeTab === "orders" && (
        <section className="space-y-4" aria-label="Riwayat pembelian pasokan">
          {buySuccess && (
            <div
              role="status"
              className="rounded-xl border border-success/30 bg-success/10 p-3.5 text-xs font-medium text-success"
            >
              {buySuccess}
            </div>
          )}
          {buyError && (
            <div
              role="alert"
              className="rounded-xl border border-error/30 bg-error/5 p-3.5 text-xs font-medium text-error"
            >
              {buyError}
            </div>
          )}
          {purchaseError && (
            <div role="alert" className="text-xs text-error">
              {purchaseError}{" "}
              <button
                onClick={() => void fetchPurchases()}
                type="button"
                className="font-semibold underline"
              >
                Coba lagi
              </button>
            </div>
          )}
          {isLoadingPurchases && purchases.length === 0 && (
            <p role="status" className="text-xs text-muted-foreground">
              Memuat riwayat pesanan...
            </p>
          )}
          {!isLoadingPurchases && !purchaseError && purchases.length === 0 && (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
              <p className="text-sm font-semibold text-foreground">
                Belum ada pesanan stok kebun
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pilih bunga dari tab Katalog Stok Kebun untuk melakukan pengadaan bahan baku.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {paginatedPurchases.map((order) => (
              <article
                key={order.id}
                className="flex flex-col justify-between space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm shadow-xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-foreground">
                        {order.stock.name} ·{" "}
                        <span className="tabular-nums">
                          {order.quantity} {order.stock.unit || "tangkai"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {order.stock.supplier?.name} ·{" "}
                        <span className="font-mono">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
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
                      <StatusBadge
                        status={order.status}
                        variant="shipment"
                        size="sm"
                      />
                    )}
                  </div>

                  <div className="flex items-baseline justify-between border-t border-border pt-2.5">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      Dipesan{" "}
                      <time dateTime={order.createdAt}>
                        {formatDateTime(order.createdAt)}
                      </time>
                    </span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {formatRupiah(order.totalPrice)}
                    </span>
                  </div>
                </div>

                {order.status === "PENDING" && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs text-warning">
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

                {(order.biteshipOrderId ||
                  order.trackingNumber ||
                  order.courier) && (
                  <div className="space-y-2 border-t border-border pt-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setTrackingPurchase(order)}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                      >
                        <Navigation
                          className="h-3.5 w-3.5 text-primary"
                          aria-hidden="true"
                        />
                        <span>Lacak Posisi Bunga</span>
                      </button>
                      <a
                        href={`/api/supplier/shipments/${order.id}/label`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low"
                        title="Cetak Label Pengiriman AWB"
                      >
                        <Printer
                          className="h-3.5 w-3.5 text-primary"
                          aria-hidden="true"
                        />
                        <span>Label</span>
                      </a>

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
                  <p className="text-xs text-error pt-1">Pesanan dibatalkan.</p>
                )}
              </article>
            ))}
          </div>

          {purchases.length > PURCHASES_PER_PAGE && (
            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-3.5 sm:flex-row">
              <p className="text-xs tabular-nums text-muted-foreground">
                Menampilkan {purchasesStart + 1}–
                {Math.min(purchasesStart + PURCHASES_PER_PAGE, purchases.length)}{" "}
                dari {purchases.length} pesanan
              </p>
              <Pagination
                currentPage={safePurchasesPage}
                totalPages={purchasesTotalPages}
                onPageChange={(page) => {
                  setPurchasesPage(page);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                ariaLabel="Navigasi halaman pesanan pasokan kebun"
              />
            </div>
          )}
        </section>
      )}
      {activeTab === "catalog" && (
        <DataStateWrapper
          isLoading={isLoading && stocks.length === 0}
          error={error}
          isEmpty={stocks.length === 0}
          emptyIcon={<Flower2 className="h-12 w-12 text-muted-foreground" aria-hidden="true" />}
          emptyTitle="Belum ada pasokan bunga yang tersedia"
          emptyDescription="Supplier belum mendaftarkan katalog stok bunga ready stock saat ini."
          onRetry={fetchStocks}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {paginatedStocks.map((stock) => (
                <article
                  key={stock.id}
                  className="m-card flex flex-col justify-between space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-xs transition-colors hover:border-foreground/30"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {stock.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Varietas: {stock.variety}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                        <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
                        <span>Ready Stock</span>
                      </span>
                    </div>

                    <dl className="mt-4 space-y-2 border-t border-border pt-3.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <Building2
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span>Kebun Mitra</span>
                        </dt>
                        <dd className="font-semibold text-foreground">
                          {stock.supplier.name}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span>Lokasi</span>
                        </dt>
                        <dd className="truncate text-right text-foreground">
                          {stock.location} ({stock.supplier.city})
                        </dd>
                      </div>
                      <div className="flex justify-between pt-1.5">
                        <dt className="text-muted-foreground">Stok Tersedia</dt>
                        <dd className="font-bold tabular-nums text-foreground">
                          {stock.quantity.toLocaleString("id-ID")} {stock.unit}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <dt className="text-muted-foreground">Harga Satuan</dt>
                        <dd className="text-sm font-bold tabular-nums text-foreground">
                          {formatRupiah(stock.pricePerUnit)} / {stock.unit}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <button
                    type="button"
                    onClick={() => openBuyModal(stock)}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
                  >
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                    <span>Beli Pasokan Sekarang</span>
                  </button>
                </article>
              ))}
            </div>
            {stocks.length > CATALOG_PER_PAGE && (
              <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-3.5 sm:flex-row">
                <p className="text-xs tabular-nums text-muted-foreground">
                  Menampilkan {catalogStart + 1}–
                  {Math.min(catalogStart + CATALOG_PER_PAGE, stocks.length)} dari{" "}
                  {stocks.length} stok kebun
                </p>
                <Pagination
                  currentPage={safeCatalogPage}
                  totalPages={catalogTotalPages}
                  onPageChange={(page) => {
                    setCatalogPage(page);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  ariaLabel="Navigasi halaman katalog stok kebun"
                />
              </div>
            )}
          </div>
        </DataStateWrapper>
      )}

      {/* MODAL BELI PASOKAN BUNGA LANGSUNG */}
      <Modal
        isOpen={isBuyModalOpen && Boolean(selectedStock)}
        onClose={() => setIsBuyModalOpen(false)}
        headerVariant="dark"
        kicker="Pengadaan B2B"
        title="Beli Bunga Langsung"
        subtitle={
          selectedStock
            ? `${selectedStock.name} dari ${selectedStock.supplier.name}`
            : undefined
        }
        size="sm"
      >
        {selectedStock && (
          <form onSubmit={handleBuySubmit} className="space-y-4">
            {buyError && (
              <div
                role="alert"
                className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error"
              >
                {buyError}
              </div>
            )}

            <dl className="space-y-1.5 rounded-xl border border-border bg-surface-container-low p-3.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Bunga</dt>
                <dd className="font-semibold text-foreground">
                  {selectedStock.name}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Supplier</dt>
                <dd className="text-foreground">
                  {selectedStock.supplier.name}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Harga Satuan</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {formatRupiah(selectedStock.pricePerUnit)} /{" "}
                  {selectedStock.unit}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Maksimal Pesan</dt>
                <dd className="font-bold tabular-nums text-foreground">
                  {selectedStock.quantity.toLocaleString("id-ID")}{" "}
                  {selectedStock.unit}
                </dd>
              </div>
            </dl>

            <div>
              <label
                htmlFor="buy-stock-quantity"
                className="block text-xs font-semibold text-foreground"
              >
                Jumlah Tangkai yang Dibeli <span className="text-error">*</span>
              </label>
              <input
                id="buy-stock-quantity"
                type="number"
                min="1"
                max={selectedStock.quantity}
                required
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(e.target.value)}
                className="input-field mt-1 w-full text-xs font-semibold tabular-nums"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-xs">
              <span className="text-muted-foreground">Estimasi Total Harga</span>
              <span className="text-base font-bold tabular-nums text-foreground">
                {formatRupiah(
                  (parseInt(buyQuantity, 10) || 0) * selectedStock.pricePerUnit,
                )}
              </span>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setIsBuyModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                <span>Buat Pesanan & Bayar Midtrans</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
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
