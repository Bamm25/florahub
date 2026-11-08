"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, User, MapPin, CreditCard, Truck, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface OrderDetail {
  id: string;
  orderNumber: string;
  totalAmount: number;
  shippingCost: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      image: string;
    };
  }>;
  payment: {
    id: string;
    status: string;
    method: string;
    paidAt: string | null;
  } | null;
  shipment: {
    id: string;
    status: string;
    courier: string;
    service: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  shippingAddress: {
    recipientName: string;
    phone: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
  } | null;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail();
    }
  }, [orderId]);

  const fetchOrderDetail = async () => {
    if (!orderId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/florist/orders/${orderId}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Gagal memuat detail pesanan");
      }
      
      setOrder(data.data || data.order);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      PENDING: { label: "Menunggu Bayar", className: "bg-warning/10 text-warning border-warning/20" },
      PAID: { label: "Lunas", className: "bg-primary/10 text-primary border-primary/20" },
      PROCESSING: { label: "Sedang Dirakit", className: "bg-tertiary/10 text-tertiary border-tertiary/20" },
      READY_TO_SHIP: { label: "Siap Dikirim", className: "bg-secondary/15 text-secondary border-secondary/30" },
      SHIPPED: { label: "Dalam Pengiriman", className: "bg-tertiary/15 text-tertiary border-tertiary/30" },
      DELIVERED: { label: "Selesai", className: "bg-success/10 text-success border-success/20" },
      CANCELLED: { label: "Dibatalkan", className: "bg-error/10 text-error border-error/20" },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Memuat detail pesanan...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Gagal Memuat Detail Pesanan</h3>
          <p className="text-sm text-muted-foreground mb-4">{error || "Data tidak ditemukan"}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={fetchOrderDetail} className="btn-primary">
              Coba Lagi
            </button>
            <Link href="/florist/orders" className="btn-secondary">
              Kembali ke Daftar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/florist/orders"
          className="btn-secondary inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Detail Pesanan</h1>
          <p className="text-muted-foreground text-sm mt-1">{order.orderNumber}</p>
        </div>
        {getStatusBadge(order.payment?.status || order.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Produk yang Dipesan
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-20 h-20 rounded-lg object-cover bg-surface-container-low"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{item.product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatRupiah(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatRupiah(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Info */}
          {order.shipment && (
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Informasi Pengiriman
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(order.shipment.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Kurir</span>
                  <span className="text-sm font-medium text-foreground">
                    {order.shipment.courier} {order.shipment.service && `(${order.shipment.service})`}
                  </span>
                </div>
                {order.shipment.trackingNumber && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">No. Resi</span>
                    <span className="text-sm font-mono font-medium text-foreground">
                      {order.shipment.trackingNumber}
                    </span>
                  </div>
                )}
                {order.shipment.shippedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Dikirim</span>
                    <span className="text-sm text-foreground">{formatDate(order.shipment.shippedAt)}</span>
                  </div>
                )}
                {order.shipment.deliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Diterima</span>
                    <span className="text-sm text-foreground">{formatDate(order.shipment.deliveredAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Informasi Customer
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">{order.user.name}</p>
                <p className="text-xs text-muted-foreground">{order.user.email}</p>
                {order.user.phone && <p className="text-xs text-muted-foreground">{order.user.phone}</p>}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Alamat Pengiriman
              </h2>
              <div className="text-sm text-foreground space-y-1">
                <p className="font-medium">{order.shippingAddress.recipientName}</p>
                <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
                <p className="text-muted-foreground">{order.shippingAddress.street}</p>
                <p className="text-muted-foreground">
                  {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
                </p>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Ringkasan Pembayaran
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ongkir</span>
                <span className="text-foreground">{formatRupiah(order.shippingCost)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-bold text-lg text-primary">{formatRupiah(order.totalAmount)}</span>
              </div>
              {order.payment && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Metode</span>
                    <span className="text-foreground font-medium">{order.payment.method}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    {getStatusBadge(order.payment.status)}
                  </div>
                  {order.payment.paidAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dibayar</span>
                      <span className="text-foreground">{formatDate(order.payment.paidAt)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Order Date */}
          <div className="card-elevated p-6">
            <div className="text-sm">
              <p className="text-muted-foreground">Tanggal Pesanan</p>
              <p className="text-foreground font-medium mt-1">{formatDate(order.createdAt)}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            {order.payment?.status === "PAID" && !order.shipment && (
              <Link href="/florist/shipments" className="btn-primary w-full text-center block">
                Buat Pengiriman
              </Link>
            )}
            {order.shipment && (
              <Link href="/florist/shipments" className="btn-secondary w-full text-center block">
                Kelola Pengiriman
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
