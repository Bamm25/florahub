"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getOrderHistory } from "@/lib/api/orders";
import { OrderCard } from "@/components/customer/OrderCard";
import {
  SearchInput,
  EmptyState,
  LoadingSpinner,
  ErrorState,
  Pagination,
} from "@/components/ui";
import { Search } from "lucide-react";

// Interface untuk data order summary di halaman riwayat pesanan
interface OrderSummary {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  itemCount: number;
  createdAt: string;
  items: Array<{
    id: string;
    quantity?: number;
    product: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
  payment: {
    status: string;
  };
}

const STATUS_FILTERS: Array<{ id: string; label: string }> = [
  { id: "", label: "Semua" },
  { id: "PENDING", label: "Menunggu Bayar" },
  { id: "PAID", label: "Dibayar" },
  { id: "PROCESSING", label: "Diproses" },
  { id: "SHIPPED", label: "Dikirim" },
  { id: "DELIVERED", label: "Selesai" },
  { id: "CANCELLED", label: "Dibatalkan" },
];

// Halaman riwayat pesanan dengan filter status dan search
export default function OrderHistoryPage() {
  const router = useRouter();
  const { status } = useSession();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRetry = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Redirect ke login jika belum auth, fetch orders dengan pagination dan filter
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/orders");
      return;
    }

    if (status !== "authenticated") {
      return;
    }

    const controller = new AbortController();

    async function loadOrders() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getOrderHistory(
          {
            status: selectedStatus || undefined,
            page: currentPage,
            limit: 10,
          },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setOrders(response.data.orders);
          setTotalPages(response.data.pagination.totalPages);
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal memuat riwayat pesanan",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();
    return () => controller.abort();
  }, [status, selectedStatus, currentPage, router, refreshKey]);

  // Filter orders di client-side berdasarkan search query
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();

    return (
      (order.id && order.id.toLowerCase().includes(query)) ||
      (order.orderNumber && order.orderNumber.toLowerCase().includes(query)) ||
      order.items?.some((item) =>
        item.product?.name?.toLowerCase().includes(query),
      )
    );
  });

  // Render loading spinner untuk order list
  if (status === "loading" || isLoading) {
    return (
      <main className="container-custom section-spacing">
        <LoadingSpinner message="Memuat riwayat pesanan..." />
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="container-custom section-spacing">
        <ErrorState
          title="Gagal Memuat Riwayat Pesanan"
          error={errorMessage}
          onRetry={handleRetry}
        />
      </main>
    );
  }

  return (
    <main className="container-custom section-spacing">
      {/* Header Halaman */}
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Akun Saya
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Riwayat Pesanan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pantau status pesanan bunga, pembayaran, dan lacak pengiriman Anda di satu tempat.
        </p>
      </header>

      {/* Kontrol: Search Bar & Filter Status */}
      <div className="mb-6 space-y-4">
        <SearchInput
          placeholder="Cari pesanan (nomor order atau nama bunga)..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <div
          role="tablist"
          aria-label="Filter status pesanan"
          className="flex gap-1.5 overflow-x-auto pb-1 text-xs sm:text-sm"
        >
          {STATUS_FILTERS.map((tab) => {
            const isActive = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setSelectedStatus(tab.id);
                  setCurrentPage(1);
                }}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-surface-container-low text-muted-foreground hover:bg-surface-container hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Order List */}
      {orders.length === 0 ? (
        <section
          aria-label="Belum ada pesanan"
          className="rounded-2xl border border-dashed border-border bg-surface-container-low/60 p-12 text-center"
        >
          <h2 className="text-lg font-bold text-foreground">
            {selectedStatus ? "Tidak ada pesanan dengan status ini" : "Belum ada pesanan"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {selectedStatus
              ? "Coba pilih filter lain atau lihat seluruh pesanan Anda."
              : "Pilih karangan bunga segar dari florist pilihan di seluruh Jawa Timur."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {selectedStatus ? (
              <button
                onClick={() => setSelectedStatus("")}
                className="btn-secondary h-11 px-5 py-0 text-sm"
              >
                Tampilkan semua
              </button>
            ) : (
              <Link
                href="/products"
                className="btn-primary h-11 px-6 py-0 text-sm"
              >
                Jelajahi Bunga
              </Link>
            )}
          </div>
        </section>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Menampilkan {filteredOrders.length} dari {orders.length} pesanan
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-primary hover:underline"
              >
                Reset pencarian
              </button>
            )}
          </div>

          {filteredOrders.length === 0 && searchQuery ? (
            <EmptyState
              icon={<Search className="h-10 w-10 text-muted-foreground" />}
              title="Pesanan tidak ditemukan"
              description={`Tidak ada pesanan yang sesuai dengan kata kunci "${searchQuery}".`}
              action={{
                label: "Hapus pencarian",
                onClick: () => setSearchQuery(""),
              }}
            />
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onCancelled={(cancelledId) => {
                    setOrders((prev) =>
                      prev.map((o) =>
                        o.id === cancelledId ? { ...o, status: "CANCELLED" } : o,
                      ),
                    );
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      <Pagination
        variant="compact"
        ariaLabel="Navigasi halaman pesanan"
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        className="mt-10 justify-center"
      />
    </main>
  );
}
