"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getOrderHistory } from "@/lib/api/orders";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ChevronRight,
  Filter,
} from "lucide-react";

interface OrderSummary {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  itemCount: number;
  createdAt: string;
  payment: {
    status: string;
  };
}

export default function OrderHistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      { icon: any; label: string; color: string; bgColor: string }
    > = {
      PENDING: {
        icon: Clock,
        label: "Menunggu Pembayaran",
        color: "text-yellow-700",
        bgColor: "bg-yellow-100",
      },
      PAID: {
        icon: CheckCircle,
        label: "Dibayar",
        color: "text-emerald-700",
        bgColor: "bg-emerald-100",
      },
      PROCESSING: {
        icon: Package,
        label: "Diproses",
        color: "text-blue-700",
        bgColor: "bg-blue-100",
      },
      SHIPPED: {
        icon: Truck,
        label: "Dikirim",
        color: "text-indigo-700",
        bgColor: "bg-indigo-100",
      },
      DELIVERED: {
        icon: CheckCircle,
        label: "Selesai",
        color: "text-emerald-700",
        bgColor: "bg-emerald-100",
      },
      CANCELLED: {
        icon: XCircle,
        label: "Dibatalkan",
        color: "text-red-700",
        bgColor: "bg-red-100",
      },
    };
    return (
      configs[status] || {
        icon: Clock,
        label: status,
        color: "text-gray-700",
        bgColor: "bg-gray-100",
      }
    );
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-lg font-semibold text-red-900">
            {errorMessage}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Riwayat Pesanan</h1>

      {/* Filter Status */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="h-5 w-5 text-gray-500" />
        <button
          onClick={() => setSelectedStatus("")}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
            selectedStatus === ""
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedStatus === statusFilter
                  ? "bg-emerald-600 text-white"
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
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Package className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Belum ada pesanan
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {selectedStatus
              ? `Tidak ada pesanan dengan status "${getStatusConfig(selectedStatus).label}"`
              : "Mulai berbelanja bunga segar pilihan terbaik!"}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Lihat Katalog Bunga
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;

            return (
              <button
                key={order.id}
                onClick={() => router.push(`/orders/${order.id}`)}
                className="w-full rounded-lg border border-gray-200 bg-white p-6 text-left transition hover:border-emerald-500 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">
                        {order.orderNumber}
                      </h3>
                      <span
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {order.itemCount} item • Rp{" "}
                      {order.totalAmount.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-gray-600">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
}
