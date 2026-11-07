"use client";

import { useEffect, useState } from "react";
import { Package, Search, Loader2, X } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
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
    status: string;
    method: string;
  } | null;
  shipment: {
    id: string;
    status: string;
    courier: string;
    trackingNumber: string | null;
  } | null;
}

export default function FloristOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/florist/orders");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memuat pesanan");
      setOrders(data.orders || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      order.payment?.status === statusFilter ||
      order.shipment?.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const openDetailModal = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
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
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPaymentStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
          Pending
        </span>
      );
    }
    const badges: Record<string, { label: string; className: string }> = {
      PAID: { label: "Lunas", className: "bg-primary/10 text-primary border-primary/20" },
      PENDING: { label: "Menunggu", className: "bg-warning/10 text-warning border-warning/20" },
      FAILED: { label: "Gagal", className: "bg-error/10 text-error border-error/20" },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const getShipmentStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
          Belum Dikirim
        </span>
      );
    }
    const badges: Record<string, { label: string; className: string }> = {
      PROCESSING: { label: "Sedang Dirakit", className: "bg-tertiary/10 text-tertiary border-tertiary/20" },
      READY_TO_SHIP: { label: "Siap Dikirim", className: "bg-secondary/15 text-secondary border-secondary/30" },
      SHIPPED: { label: "Dalam Pengiriman", className: "bg-tertiary/15 text-tertiary border-tertiary/30" },
      DELIVERED: { label: "Selesai", className: "bg-success/10 text-success border-success/20" },
    };
    const badge = badges[status] || badges.PROCESSING;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Kelola Pesanan Customer</h1>
        <p className="text-muted-foreground">
          Proses pesanan masuk, update status pengiriman, dan input nomor resi
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-elevated p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Total Pesanan</p>
          <p className="text-2xl font-semibold">{orders.length}</p>
        </div>
        <div className="card-elevated p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Perlu Diproses</p>
          <p className="text-2xl font-semibold text-primary">
            {orders.filter(o => o.payment?.status === "PAID" && !o.shipment).length}
          </p>
        </div>
        <div className="card-elevated p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Dalam Pengiriman</p>
          <p className="text-2xl font-semibold text-tertiary">
            {orders.filter(o => o.shipment?.status === "SHIPPED").length}
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-full sm:w-48"
        >
          <option value="ALL">Semua Status</option>
          <option value="PAID">Perlu Diproses</option>
          <option value="PROCESSING">Sedang Dirakit</option>
          <option value="READY_TO_SHIP">Siap Dikirim</option>
          <option value="SHIPPED">Dalam Pengiriman</option>
          <option value="DELIVERED">Selesai</option>
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nomor pesanan atau nama customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="card-elevated p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Memuat daftar pesanan...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="card-elevated p-6 bg-error/5 border border-error/20">
          <p className="text-error font-medium">⚠️ {error}</p>
          <button onClick={fetchOrders} className="mt-3 btn-primary text-sm">
            Coba Lagi
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredOrders.length === 0 && (
        <div className="card-elevated p-12 flex flex-col items-center justify-center text-center">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Belum ada pesanan masuk</p>
          <p className="text-sm text-muted-foreground mt-2">
            Pesanan dari customer akan muncul di sini setelah pembayaran berhasil
          </p>
        </div>
      )}

      {/* Orders Table */}
      {!isLoading && !error && filteredOrders.length > 0 && (
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-container-low border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">No. Pesanan</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tanggal</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Total Tagihan</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status Bayar</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status Kirim</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{order.user.name}</p>
                        <p className="text-xs text-muted-foreground">{order.user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">{formatRupiah(order.totalAmount)}</td>
                    <td className="px-4 py-3 text-center">{getPaymentStatusBadge(order.payment?.status)}</td>
                    <td className="px-4 py-3 text-center">{getShipmentStatusBadge(order.shipment?.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openDetailModal(order)} className="btn-primary text-sm px-4 py-2">
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal - Placeholder */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
          <div className="card-elevated w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface-container-low border-b border-border p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Detail Pesanan</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedOrder.orderNumber}</p>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="text-center text-muted-foreground py-12">
                <p className="text-lg font-medium">Modal content coming soon...</p>
                <p className="text-sm mt-2">Order info, items list, dan shipment form akan ditambahkan</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
