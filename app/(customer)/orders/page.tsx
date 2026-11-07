"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getOrderHistory } from "@/lib/api/orders";
import { OrderCard } from "@/components/customer/OrderCard";
import SearchInput from "@/components/ui/SearchInput";
import EmptyState from "@/components/ui/EmptyState";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Filter,
  ShoppingBag,
  Search,
  type LucideIcon,
} from "lucide-react";

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

  // Mapping status order ke icon, label, dan warna untuk display
  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      { icon: LucideIcon; label: string; color: string; bgColor: string }
    > = {
      PENDING: {
        icon: Clock,
        label: "Menunggu Pembayaran",
        color: "text-warning",
        bgColor: "bg-warning/10",
      },
      PAID: {
        icon: CheckCircle,
        label: "Dibayar",
        color: "text-success",
        bgColor: "bg-success/10",
      },
      PROCESSING: {
        icon: Package,
        label: "Diproses",
        color: "text-info",
        bgColor: "bg-info/10",
      },
      SHIPPED: {
        icon: Truck,
        label: "Dikirim",
        color: "text-tertiary",
        bgColor: "bg-tertiary/10",
      },
      DELIVERED: {
        icon: CheckCircle,
        label: "Selesai",
        color: "text-success",
        bgColor: "bg-success/10",
      },
      CANCELLED: {
        icon: XCircle,
        label: "Dibatalkan",
        color: "text-error",
        bgColor: "bg-error/10",
      },
    };
    return (
      configs[status] || {
        icon: Clock,
        label: status,
        color: "text-muted-foreground",
        bgColor: "bg-surface-container",
      }
    );
  };

  // Filter orders di client-side berdasarkan search query
  const filteredOrders = orders.filter(order => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    
    // Search in all relevant fields with safe null checks
    return (
      (order.id && order.id.toLowerCase().includes(query)) ||
      (order.orderNumber && order.orderNumber.toLowerCase().includes(query)) ||
      order.items?.some(item => 
        item.product?.name?.toLowerCase().includes(query)
      )
    );
  });

  // Render loading skeleton untuk order list
  if (status === "loading" || isLoading) {
    return (
      <div className="container-custom section-spacing">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-surface-container mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-surface-container-low"
            />
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="container-custom section-spacing">
        <div className="card-elevated text-center">
          <XCircle className="mx-auto h-16 w-16 text-error mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {errorMessage}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom section-spacing">
      <h1 className="text-4xl font-bold text-foreground mb-8">Riwayat Pesanan</h1>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchInput 
          placeholder="Cari pesanan (Order ID, nama produk, atau nomor pesanan)"
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* Filter Status */}
      <div className="mb-8 flex items-center gap-3 overflow-x-auto pb-2">
        <Filter className="h-6 w-6 text-muted-foreground flex-shrink-0" />
        <button
          onClick={() => setSelectedStatus("")}
          className={`badge whitespace-nowrap transition-all ${
            selectedStatus === ""
              ? "bg-primary text-white"
              : "bg-surface-container text-muted-foreground hover:bg-surface-container-high"
          }`}
        >
          Semua
        </button>
        {[
          "PENDING",
          "PAID",
          "PROCESSING",
          "SHIPPED",
          "DELIVERED",
          "CANCELLED",
        ].map((statusFilter) => {
          const config = getStatusConfig(statusFilter);
          return (
            <button
              key={statusFilter}
              onClick={() => setSelectedStatus(statusFilter)}
              className={`badge whitespace-nowrap transition-all ${
                selectedStatus === statusFilter
                  ? "bg-primary text-white"
                  : `${config.bgColor} ${config.color} hover:opacity-80`
              }`}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Order List */}
      {orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-surface-container-low p-16 text-center">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-2xl bg-surface-container mb-6">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">
            Belum ada pesanan
          </h3>
          <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
            {selectedStatus
              ? `Tidak ada pesanan dengan status "${getStatusConfig(selectedStatus).label}"`
              : "Mulai berbelanja bunga segar pilihan terbaik!"}
          </p>
          <button
            onClick={() => router.push("/")}
            className="btn-primary"
          >
            <ShoppingBag className="mr-2 h-5 w-5" />
            Lihat Katalog Bunga
          </button>
        </div>
      ) : (
        <>
          {/* Result count */}
          <p className="text-sm text-muted-foreground mb-4">
            Menampilkan {filteredOrders.length} dari {orders.length} pesanan
          </p>

          {/* Search empty state */}
          {filteredOrders.length === 0 && searchQuery ? (
            <EmptyState 
              icon={<Search className="h-16 w-16" />}
              title="Tidak ada pesanan yang cocok"
              description={`Tidak ada pesanan yang cocok dengan pencarian "${searchQuery}"`}
              action={{
                label: "Hapus pencarian",
                onClick: () => setSearchQuery(""),
                icon: <XCircle className="h-5 w-5" />
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
        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span className="text-base font-medium text-foreground px-4">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
}
