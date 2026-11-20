"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Search } from "lucide-react";
import { getOrderHistory, type OrderSummary } from "@/lib/api/orders";
import { OrderCard } from "@/components/customer/OrderCard";
import {
  SearchInput,
  EmptyState,
  LoadingSpinner,
  ErrorState,
  Pagination,
} from "@/components/ui";

const STATUS_FILTERS: Array<{ id: string; label: string }> = [
  { id: "", label: "Semua" },
  { id: "PENDING", label: "Belum Bayar" },
  { id: "PAID", label: "Dibayar" },
  { id: "PROCESSING", label: "Diproses" },
  { id: "READY_TO_SHIP", label: "Siap Kirim" },
  { id: "SHIPPED", label: "Dikirim" },
  { id: "DELIVERED", label: "Selesai" },
  { id: "CANCELLED", label: "Dibatalkan" },
];

// Halaman riwayat pesanan dengan filter status, pencarian, dan masthead gelap editorial
export default function OrderHistoryPage() {
  const router = useRouter();
  const { status } = useSession();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
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
          setTotalOrders(response.data.pagination.total);
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
            : "Gagal memuat daftar pesanan.",
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

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();

    return (
      (order.id && order.id.toLowerCase().includes(query)) ||
      (order.orderNumber && order.orderNumber.toLowerCase().includes(query)) ||
      order.florist?.shopName?.toLowerCase().includes(query) ||
      order.items?.some((item) =>
        item.product?.name?.toLowerCase().includes(query),
      )
    );
  });

  if (status === "loading" || isLoading) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="container-custom section-spacing">
          <LoadingSpinner message="Memuat pesanan..." />
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="container-custom section-spacing">
          <ErrorState
            title="Gagal Memuat Pesanan"
            error={errorMessage}
            onRetry={handleRetry}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background pb-16 sm:pb-24">
      {/* Full-Bleed Dark Editorial Masthead */}
      <section className="border-b border-white/10 bg-surface-dark py-10 text-white sm:py-14">
        <div className="container-custom">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Pesanan{" "}
                <span className="font-display font-normal italic text-kicker">
                  Saya
                </span>
              </h1>
              <p className="mt-2 text-base tabular-nums text-white/70">
                {totalOrders > 0
                  ? `${totalOrders} pesanan`
                  : "Belum ada pesanan"}
              </p>
            </div>

            <Link
              href="/products"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-kicker underline-offset-4 hover:text-white hover:underline"
            >
              <span>Belanja Lagi</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="container-custom pt-8 sm:pt-10">
        {/* Kontrol Filter Status & Pencarian */}
        <div className="mb-6 space-y-4">
          <SearchInput
            placeholder="Cari nomor pesanan atau produk..."
            value={searchQuery}
            onChange={setSearchQuery}
          />

          <div
            role="group"
            aria-label="Filter status pesanan"
            className="flex gap-1.5 overflow-x-auto pb-1 text-xs sm:text-sm"
          >
            {STATUS_FILTERS.map((filter) => {
              const isActive = selectedStatus === filter.id;
              return (
                <button
                  key={filter.id || "ALL"}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setSelectedStatus(filter.id);
                    setCurrentPage(1);
                  }}
                  className={`min-h-10 whitespace-nowrap rounded-sm border px-4 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Daftar Pesanan */}
        {orders.length === 0 ? (
          <section
            aria-label="Status daftar pesanan"
            className="rounded-2xl border border-dashed border-border bg-card p-10 text-center sm:p-12"
          >
            <h2 className="text-lg font-bold text-foreground">
              {selectedStatus
                ? "Tidak ada pesanan dengan status ini"
                : "Belum ada pesanan"}
            </h2>
            <div className="mt-6 flex justify-center gap-3">
              {selectedStatus ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus("");
                    setCurrentPage(1);
                  }}
                  className="btn-secondary h-11 px-5 py-0 text-sm"
                >
                  Tampilkan Semua
                </button>
              ) : (
                <Link
                  href="/products"
                  className="btn-primary h-11 px-6 py-0 text-sm"
                >
                  Lihat Katalog
                </Link>
              )}
            </div>
          </section>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
              <span className="tabular-nums">
                {filteredOrders.length} dari {orders.length} pesanan
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="font-semibold text-primary hover:underline"
                >
                  Hapus pencarian
                </button>
              )}
            </div>

            {filteredOrders.length === 0 && searchQuery ? (
              <EmptyState
                icon={
                  <Search
                    className="h-10 w-10 text-muted-foreground"
                    aria-hidden="true"
                  />
                }
                title="Pesanan tidak ditemukan"
                description={`Tidak ada hasil untuk "${searchQuery}".`}
                action={{
                  label: "Hapus pencarian",
                  onClick: () => setSearchQuery(""),
                }}
              />
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </>
        )}

        <Pagination
          variant="compact"
          ariaLabel="Navigasi halaman pesanan"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          className="mt-10 justify-center"
        />
      </div>
    </main>
  );
}
