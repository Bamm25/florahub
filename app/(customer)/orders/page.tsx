"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getOrderHistory } from "@/lib/api/orders";
import { OrderCard } from "@/components/customer/OrderCard";
import SearchInput from "@/components/ui/SearchInput";
import EmptyState from "@/components/ui/EmptyState";
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

  // Redirect ke login jika belum auth, fetch orders dengan pagination dan filter
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/orders");
      return;
    }

    async function loadOrders() {
      try {
        setIsLoading(true);
        const response = await getOrderHistory({
          status: selectedStatus || undefined,
          page: currentPage,
          limit: 10,
        });
        setOrders(response.data.orders);
        setTotalPages(response.data.pagination.totalPages);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal memuat riwayat pesanan",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated") {
      loadOrders();
    }
  }, [status, selectedStatus, currentPage, router]);

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

  // Render loading skeleton untuk order list
  if (status === "loading" || isLoading) {
    return (
      <main className="container-custom section-spacing">
        <div className="mb-8 space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-container" />
          <div className="h-4 w-72 animate-pulse rounded bg-surface-container-low" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-surface-container-low"
            />
          ))}
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="container-custom section-spacing">
        <div className="mx-auto max-w-lg rounded-2xl border border-error/30 bg-error/5 p-8 text-center">
          <p className="text-base font-semibold text-error">{errorMessage}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Periksa koneksi Anda dan muat ulang halaman.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary mt-5 h-10 px-5 text-sm"
          >
            Muat ulang
          </button>
        </div>
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
                className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 font-medium transition-colors ${
                  isActive
                    ? "bg-[#10121b] text-white shadow-xs"
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
      {totalPages > 1 && (
        <nav
          aria-label="Navigasi halaman pesanan"
          className="mt-10 flex items-center justify-center gap-2"
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary h-10 px-4 py-0 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span className="px-3 text-xs font-medium tabular-nums text-muted-foreground">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary h-10 px-4 py-0 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Selanjutnya
          </button>
        </nav>
      )}
    </main>
  );
}
