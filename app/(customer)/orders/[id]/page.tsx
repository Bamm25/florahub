"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getOrderDetail,
  getOrderShipment,
  type Shipment,
} from "@/lib/api/orders";
import {
  CheckCircle,
  Clock,
  Package,
  MapPin,
  CreditCard,
  XCircle,
  Truck,
  Home,
} from "lucide-react";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  notes: string | null;
  subtotal: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    subtotal: number;
    product: {
      id: string;
      name: string;
      image: string;
      currentPrice: number;
    };
  }>;
  address: {
    id: string;
    label: string;
    recipientName: string;
    phone: string;
    fullAddress: string;
    city: string;
    province: string;
    postalCode: string;
  } | null;
  payment: {
    id: string;
    amount: number;
    method: string;
    status: string;
    transactionId: string | null;
    paidAt: string | null;
  } | null;
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=/orders/${orderId}`);
      return;
    }

    async function loadOrder() {
      try {
        setIsLoading(true);
        const response = await getOrderDetail(orderId);
        setOrder(response.data.order);

        // Coba fetch shipment, abaikan jika belum ada (404)
        try {
          const shipmentRes = await getOrderShipment(orderId);
          setShipment(shipmentRes.data.shipment);
        } catch {
          // Belum ada shipment, tidak masalah
          setShipment(null);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal memuat pesanan",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated") {
      loadOrder();
    }
  }, [status, orderId, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 h-96 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (errorMessage || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-lg font-semibold text-red-900">
            {errorMessage || "Pesanan tidak ditemukan"}
          </h2>
          <button
            onClick={() => router.push("/")}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      { icon: any; label: string; color: string; bgColor: string }
    > = {
      PENDING: {
        icon: Clock,
        label: "Menunggu Pembayaran",
        color: "text-yellow-700",
        bgColor: "bg-yellow-50 border-yellow-200",
      },
      PAID: {
        icon: CheckCircle,
        label: "Pembayaran Berhasil",
        color: "text-emerald-700",
        bgColor: "bg-emerald-50 border-emerald-200",
      },
      PROCESSING: {
        icon: Package,
        label: "Sedang Diproses",
        color: "text-blue-700",
        bgColor: "bg-blue-50 border-blue-200",
      },
      SHIPPED: {
        icon: Truck,
        label: "Sedang Dikirim",
        color: "text-indigo-700",
        bgColor: "bg-indigo-50 border-indigo-200",
      },
      DELIVERED: {
        icon: CheckCircle,
        label: "Pesanan Selesai",
        color: "text-emerald-700",
        bgColor: "bg-emerald-50 border-emerald-200",
      },
      CANCELLED: {
        icon: XCircle,
        label: "Dibatalkan",
        color: "text-red-700",
        bgColor: "bg-red-50 border-red-200",
      },
    };
    return (
      configs[status] || {
        icon: Clock,
        label: status,
        color: "text-gray-700",
        bgColor: "bg-gray-50 border-gray-200",
      }
    );
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div
        className={`mb-6 rounded-lg border-2 p-6 text-center ${statusConfig.bgColor}`}
      >
        <StatusIcon className={`mx-auto h-16 w-16 ${statusConfig.color}`} />
        <h1 className={`mt-4 text-2xl font-bold ${statusConfig.color}`}>
          {statusConfig.label}
        </h1>
        <p className="mt-2 text-lg font-semibold text-gray-700">
          Order #{order.orderNumber}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          {new Date(order.createdAt).toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Detail Produk ({order.items.length} item)
          </h2>
        </div>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
            >
              <img
                src={item.product.image || "/placeholder.png"}
                alt={item.product.name}
                className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {item.product.name}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {item.quantity}x @ Rp {item.price.toLocaleString("id-ID")}
                </p>
              </div>
              <p className="font-semibold text-gray-900">
                Rp {item.subtotal.toLocaleString("id-ID")}
              </p>
            </div>
          ))}
        </div>
      </div>

      {order.address && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Alamat Pengiriman
            </h2>
          </div>
          <p className="font-medium text-gray-900">
            {order.address.recipientName} • {order.address.phone}
          </p>
          <p className="mt-2 text-sm text-gray-700">
            {order.address.fullAddress}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {order.address.city}, {order.address.province}{" "}
            {order.address.postalCode}
          </p>
        </div>
      )}

      {/* Info Pengiriman (hanya muncul jika florist sudah mengisi data shipment) */}
      {shipment && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Info Pengiriman
            </h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Kurir</span>
              <span className="font-medium text-gray-900 uppercase">
                {shipment.courier}
                {shipment.service && ` - ${shipment.service}`}
              </span>
            </div>
            {shipment.trackingNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">No. Resi</span>
                <span className="font-mono font-semibold text-gray-900">
                  {shipment.trackingNumber}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status Pengiriman</span>
              <span className="font-medium text-gray-900">
                {shipment.status === "PENDING" && "Menunggu Pickup"}
                {shipment.status === "PICKED_UP" && "Sudah Diambil Kurir"}
                {shipment.status === "IN_TRANSIT" && "Dalam Perjalanan"}
                {shipment.status === "DELIVERED" && "Sudah Diterima"}
                {shipment.status === "FAILED" && "Pengiriman Gagal"}
              </span>
            </div>
            {shipment.estimatedDays && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Estimasi</span>
                <span className="font-medium text-gray-900">
                  {shipment.estimatedDays} hari kerja
                </span>
              </div>
            )}
            {shipment.shippedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tanggal Kirim</span>
                <span className="font-medium text-gray-900">
                  {new Date(shipment.shippedAt).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
            {shipment.deliveredAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tanggal Diterima</span>
                <span className="font-medium text-gray-900">
                  {new Date(shipment.deliveredAt).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Ringkasan Pembayaran
          </h2>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal Produk</span>
            <span className="font-medium text-gray-900">
              Rp {order.subtotal.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Ongkos Kirim</span>
            <span className="font-medium text-gray-900">
              Rp {order.shippingCost.toLocaleString("id-ID")}
            </span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Diskon</span>
              <span className="font-medium">
                -Rp {order.discount.toLocaleString("id-ID")}
              </span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between text-base font-bold text-gray-900">
              <span>Total Pembayaran</span>
              <span className="text-emerald-600">
                Rp {order.totalAmount.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>

        {order.payment && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Metode Pembayaran:</p>
            <p className="mt-1 font-medium text-gray-900 capitalize">
              {order.payment.method}
            </p>
            {order.payment.paidAt && (
              <p className="mt-2 text-xs text-gray-500">
                Dibayar pada:{" "}
                {new Date(order.payment.paidAt).toLocaleString("id-ID")}
              </p>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => router.push("/")}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Home className="h-5 w-5" />
        Kembali ke Beranda
      </button>
    </div>
  );
}
