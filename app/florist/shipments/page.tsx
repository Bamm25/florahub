"use client";

import { useEffect, useState } from "react";
import { Package, Loader2, X, Truck } from "lucide-react";
import TabNavigation from "@/components/ui/TabNavigation";
import DataStateWrapper from "@/components/ui/DataStateWrapper";
import { ShipmentTable } from "@/components/florist/ShipmentTable";
import { OutgoingShipmentTable } from "@/components/florist/OutgoingShipmentTable";
import ShipmentStats from "@/components/florist/ShipmentStats";
import ShipmentFilters from "@/components/florist/ShipmentFilters";

interface Shipment {
  id: string;
  orderId: string;
  courier: string;
  service: string | null;
  trackingNumber: string | null;
  status: string;
  estimatedDays: number | null;
  shippingCost: number;
  weight: number | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  destinationAddress?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    user: {
      name: string;
      email: string;
    };
  };
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  shippingCost: number;
  status: string;
  shipment?: {
    id: string;
    status: string;
  } | null;
  user: {
    name: string;
    email: string;
  };
}

export default function FloristShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [paidOrders, setPaidOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"shipments" | "create">("shipments");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  const [formData, setFormData] = useState({
    courier: "",
    service: "",
    trackingNumber: "",
    estimatedDays: "",
    weight: "",
    status: "PENDING",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchShipments(), fetchPaidOrders()]);
  };

  const fetchShipments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/florist/shipments");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memuat shipments");
      setShipments(json.data?.shipments || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaidOrders = async () => {
    try {
      const res = await fetch("/api/florist/orders?status=PAID");
      const json = await res.json();
      if (res.ok) {
        const orders = json.data?.orders || [];
        const ordersWithoutShipment = orders.filter((order: Order) => !order.shipment);
        setPaidOrders(ordersWithoutShipment);
      }
    } catch (err) {
      console.error("Failed to fetch paid orders:", err);
    }
  };

  const openCreateModal = (orderId?: string) => {
    setModalMode("create");
    setSelectedShipment(null);
    setSelectedOrderId(orderId || "");
    setFormData({
      courier: "",
      service: "",
      trackingNumber: "",
      estimatedDays: "",
      weight: "",
      status: "PENDING",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (shipment: Shipment) => {
    setModalMode("edit");
    setSelectedShipment(shipment);
    setFormData({
      courier: shipment.courier,
      service: shipment.service || "",
      trackingNumber: shipment.trackingNumber || "",
      estimatedDays: shipment.estimatedDays?.toString() || "",
      weight: shipment.weight?.toString() || "",
      status: shipment.status,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedShipment(null);
    setSelectedOrderId("");
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (modalMode === "create" && !selectedOrderId) {
      errors.orderId = "Pilih order terlebih dahulu";
    }

    if (!formData.courier.trim()) errors.courier = "Courier wajib diisi";

    const requiresTracking = formData.status === "SHIPPED" || formData.status === "DELIVERED";
    if (requiresTracking && !formData.trackingNumber?.trim()) {
      errors.trackingNumber = "Nomor resi wajib untuk status SHIPPED";
    }

    const hasEstimatedDays = formData.estimatedDays && formData.estimatedDays.trim();
    if (hasEstimatedDays) {
      const daysValue = parseInt(formData.estimatedDays, 10);
      if (isNaN(daysValue)) {
        errors.estimatedDays = "Estimasi hari harus berupa angka valid";
      } else if (daysValue < 0) {
        errors.estimatedDays = "Estimasi hari tidak boleh negatif";
      }
    }

    const hasWeight = formData.weight && formData.weight.trim();
    if (hasWeight) {
      const weightValue = parseFloat(formData.weight);
      if (isNaN(weightValue)) {
        errors.weight = "Berat harus berupa angka valid";
      } else if (weightValue <= 0) {
        errors.weight = "Berat harus lebih dari 0";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      interface ShipmentPayload {
        courier: string;
        service: string | null;
        trackingNumber: string | null;
        estimatedDays: number | null;
        weight: number | null;
        orderId?: string;
        status?: string;
      }
      
      const payload: ShipmentPayload = {
        courier: formData.courier.trim(),
        service: formData.service.trim() || null,
        trackingNumber: formData.trackingNumber.trim() || null,
        estimatedDays: formData.estimatedDays ? parseInt(formData.estimatedDays, 10) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
      };
      
      // Final validation before submission
      if ((payload.estimatedDays !== null && isNaN(payload.estimatedDays)) || 
          (payload.weight !== null && isNaN(payload.weight))) {
        throw new Error("Invalid numeric values");
      }

      if (modalMode === "create") {
        payload.orderId = selectedOrderId;
        payload.status = "PENDING";
        const res = await fetch("/api/florist/shipments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          // Handle validation errors with specific field messages
          if (json.errors && Array.isArray(json.errors)) {
            const fieldErrors: Record<string, string> = {};
            json.errors.forEach((err: any) => {
              const field = err.path?.[0] || 'submit';
              fieldErrors[field] = err.message;
            });
            setFormErrors(fieldErrors);
            setIsSubmitting(false);
            return;
          }
          throw new Error(json.message || "Gagal membuat shipment");
        }
        await fetchPaidOrders();
      } else {
        payload.status = formData.status;
        const res = await fetch(`/api/florist/shipments/${selectedShipment?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Gagal memperbarui shipment");
      }

      await fetchData();
      closeModal();
      setActiveTab("shipments");
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setFormErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNextStatuses = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      PENDING: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED", "CANCELLED"],
      DELIVERED: [],
      CANCELLED: [],
    };
    // Handle unknown status by returning empty array
    return transitions[currentStatus] || [];
  };

  const filterShipment = (shipment: Shipment) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      shipment.order.orderNumber.toLowerCase().includes(query) ||
      shipment.courier.toLowerCase().includes(query) ||
      (shipment.trackingNumber?.toLowerCase() || '').includes(query) ||
      shipment.order.user.name.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "ALL" || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  };

  const filteredShipments = Array.isArray(shipments)
    ? shipments.filter(filterShipment)
    : [];

  const tabs = [
    { id: "shipments", label: "Daftar Pengiriman" },
    { id: "create", label: "Buat Pengiriman" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Pengiriman</h1>
        <p className="text-muted-foreground">Kelola pengiriman order ke customer</p>
      </div>

      <ShipmentStats
        shipments={shipments}
        paidOrdersCount={Array.isArray(paidOrders) ? paidOrders.length : 0}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as "shipments" | "create")}
        />

        {activeTab === "shipments" && (
          <ShipmentFilters
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
      </div>

      {activeTab === "shipments" && (
        <DataStateWrapper
          isLoading={isLoading && shipments.length === 0}
          error={error}
          isEmpty={filteredShipments.length === 0}
          onRetry={fetchData}
          emptyIcon={<Truck className="w-16 h-16" />}
          emptyTitle={
            searchQuery || statusFilter !== "ALL"
              ? "Tidak ada shipment yang sesuai filter"
              : "Belum ada shipment"
          }
          emptyDescription={
            searchQuery || statusFilter !== "ALL"
              ? "Coba ubah filter pencarian"
              : "Buat shipment untuk order yang sudah dibayar"
          }
        >
          <ShipmentTable shipments={filteredShipments} onEdit={openEditModal} />
        </DataStateWrapper>
      )}

      {activeTab === "create" && (
        <DataStateWrapper
          isLoading={false}
          error={null}
          isEmpty={Array.isArray(paidOrders) && paidOrders.length === 0}
          onRetry={fetchData}
          emptyIcon={<Package className="w-16 h-16" />}
          emptyTitle="Tidak ada order yang perlu dibuat shipment"
          emptyDescription="Semua order yang sudah dibayar sudah memiliki shipment"
        >
          <OutgoingShipmentTable orders={paidOrders} onCreateShipment={openCreateModal} />
        </DataStateWrapper>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
          <div className="card-elevated w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="sticky top-0 z-50 bg-surface-container-low border-b border-border p-6 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold">
                  {modalMode === "create" ? "Buat Shipment" : "Update Shipment"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {modalMode === "create" ? "Tambahkan informasi pengiriman" : "Perbarui status atau detail pengiriman"}
                </p>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formErrors.submit && (
                <div className="p-3 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
                  {formErrors.submit}
                </div>
              )}

              {modalMode === "edit" && selectedShipment && (
                <div className="p-4 bg-surface-container-low rounded-xl">
                  <p className="text-sm font-medium text-foreground mb-1">Order: {selectedShipment.order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">Customer: {selectedShipment.order.user.name}</p>
                </div>
              )}

              {modalMode === "edit" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Status <span className="text-error">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    {getNextStatuses(selectedShipment?.status || "").map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Courier <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={formData.courier}
                  onChange={(e) => setFormData({ ...formData, courier: e.target.value })}
                  className={`input-field ${formErrors.courier ? "border-error" : ""}`}
                  placeholder="JNE, J&T, SiCepat, dll"
                />
                {formErrors.courier && <p className="mt-1 text-sm text-error">{formErrors.courier}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Service</label>
                <input
                  type="text"
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className={`input-field ${formErrors.service ? "border-error" : ""}`}
                  placeholder="REG, YES, Express, dll"
                />
                {formErrors.service && <p className="mt-1 text-sm text-error">{formErrors.service}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nomor Resi {formData.status === "SHIPPED" && <span className="text-error">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.trackingNumber}
                  onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                  className={`input-field ${formErrors.trackingNumber ? "border-error" : ""}`}
                  placeholder="Tracking number dari courier"
                />
                {formErrors.trackingNumber && <p className="mt-1 text-sm text-error">{formErrors.trackingNumber}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Estimasi (Hari)</label>
                  <input
                    type="number"
                    value={formData.estimatedDays}
                    onChange={(e) => setFormData({ ...formData, estimatedDays: e.target.value })}
                    className={`input-field ${formErrors.estimatedDays ? "border-error" : ""}`}
                    placeholder="3"
                    min="0"
                  />
                  {formErrors.estimatedDays && <p className="mt-1 text-sm text-error">{formErrors.estimatedDays}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Berat (Kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className={`input-field ${formErrors.weight ? "border-error" : ""}`}
                    placeholder="2.5"
                    min="0"
                  />
                  {formErrors.weight && <p className="mt-1 text-sm text-error">{formErrors.weight}</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 btn-secondary text-sm" disabled={isSubmitting}>
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary text-sm">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      {modalMode === "create" ? "Buat Shipment" : "Simpan Perubahan"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
