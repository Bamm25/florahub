"use client";

import { useEffect, useState } from "react";
import { Package, Loader2, X, Truck } from "lucide-react";
import TabNavigation from "@/components/ui/TabNavigation";
import DataStateWrapper from "@/components/ui/DataStateWrapper";
import { ShipmentTable } from "@/components/florist/ShipmentTable";
import { OutgoingShipmentTable } from "@/components/florist/OutgoingShipmentTable";
import ShipmentStats from "@/components/florist/ShipmentStats";
import ShipmentFilters from "@/components/florist/ShipmentFilters";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";

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
  biteshipOrderId?: string | null;
  biteshipLabelUrl?: string | null;
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
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
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
  
  // State untuk mode pengiriman otomatis Biteship dan pilihan tarif kurir
  const [shipmentMode, setShipmentMode] = useState<"auto" | "manual">("auto");
  const [availableRates, setAvailableRates] = useState<Array<{
    courier: { code: string; name: string; service_name: string; service_code: string };
    price: number;
    rate_id: string;
    rate_name: string;
  }>>([]);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Sinkronkan status shipment Biteship secara langsung dari server Biteship
  const handleSyncShipment = async (shipment: Shipment) => {
    if (!shipment.biteshipOrderId) return;
    setSyncingId(shipment.id);
    try {
      const res = await fetch(`/api/florist/shipments/${shipment.id}/track`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal sinkron status");
      }
      await fetchData();
    } catch (err) {
      console.error("[SYNC_ERROR]", err);
    } finally {
      setSyncingId(null);
    }
  };

  async function fetchData() {
    await Promise.all([fetchShipments(), fetchPaidOrders()]);
  }

  const fetchShipments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchPaginatedCollection<Shipment>("/api/florist/shipments", "shipments");
      setShipments(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaidOrders = async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const data = await fetchPaginatedCollection<Order>("/api/florist/orders?status=PAID", "orders");
      setPaidOrders(data.filter((order) => order.status === "PAID" && !order.shipment));
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : "Gagal memuat order");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateModal = async (orderId?: string) => {
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
    setShipmentMode("auto");
    setAvailableRates([]);
    setSelectedRate("");
    setIsModalOpen(true);
    
    // Auto-fetch rates untuk mode otomatis
    if (orderId) {
      await fetchRates(orderId);
    }
  };
  
  const fetchRates = async (orderId: string) => {
    setIsFetchingRates(true);
    try {
      const res = await fetch("/api/florist/shipments/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      
      const data = await res.json();
      console.log('[DEBUG] Rates API Response:', data);
      
      if (!res.ok) {
        throw new Error(data.message || "Gagal fetch ongkir");
      }
      
      console.log('[DEBUG] Setting rates:', data.rates);
      setAvailableRates(data.rates || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error fetching rates";
      console.error('[DEBUG] Fetch rates error:', err);
      setFormErrors({ rates: message });
    } finally {
      setIsFetchingRates(false);
    }
  };

  const openEditModal = (shipment: Shipment) => {
    setModalMode("edit");
    setSelectedShipment(shipment);
    setFormData({
      courier: shipment.courier,
      service: shipment.service || "",
      trackingNumber: shipment.trackingNumber || "",
      estimatedDays: shipment.estimatedDays?.toString() || "",
      weight: shipment.weight != null ? (shipment.weight / 1000).toString() : "",
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
      errors.orderId = "Pilih order yang sudah dibayar";
    }

    if (!formData.courier.trim()) errors.courier = "Courier wajib diisi";

    const requiresTracking = formData.status === "SHIPPED" || formData.status === "DELIVERED";
    if (requiresTracking && !formData.trackingNumber?.trim() && !selectedShipment?.biteshipOrderId) {
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

    if (shipmentMode === "auto" && modalMode === "create") {
      // Mode otomatis via Biteship
      if (!selectedRate) {
        setFormErrors({ rates: "Pilih kurir terlebih dahulu" });
        return;
      }
      
      setIsSubmitting(true);
      try {
        const selectedRateData = availableRates.find(r => r.rate_id === selectedRate);
        if (!selectedRateData) throw new Error("Rate tidak ditemukan");
        
        const res = await fetch("/api/florist/shipments/auto-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: selectedOrderId,
            courierCompany: selectedRateData.courier.code,
            courierType: selectedRateData.courier.service_code,
          }),
        });
        
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || "Gagal membuat shipment otomatis");
        }
        
        await fetchData();
        await fetchPaidOrders();
        closeModal();
        setActiveTab("shipments");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setFormErrors({ submit: message });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Mode manual (existing logic)
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
      
      // Validasi akhir nilai numerik sebelum dikirim ke server
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
          // Tangani pesan error spesifik per field dari server
          if (json.errors && Array.isArray(json.errors)) {
            const fieldErrors: Record<string, string> = {};
            json.errors.forEach((err: { path?: (string | number)[]; message: string }) => {
              const field = err.path?.[0] || 'submit';
              fieldErrors[String(field)] = err.message;
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
      PENDING: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
      PROCESSING: ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
      SHIPPED: ["SHIPPED", "DELIVERED", "CANCELLED"],
      DELIVERED: ["DELIVERED"],
      CANCELLED: ["CANCELLED"],
    };
    return transitions[currentStatus] || [currentStatus];
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
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Restrained Dark Header for Rhythm */}
      <div className="flex flex-col gap-6 rounded-[24px] bg-[#10121b] px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b4aeff]">
            Logistik & Pengiriman
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Pengiriman Florist
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Kelola pengiriman buket ke customer, integrasi resi otomatis Biteship, serta pembaruan status logistik.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Perbarui Status
          </button>
        </div>
      </div>

      <ShipmentStats
        shipments={shipments}
        paidOrdersCount={paidOrders.length}
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
              : "Belum ada shipment untuk florist ini"
          }
          emptyDescription={
            searchQuery || statusFilter !== "ALL"
              ? "Coba ubah filter pencarian"
              : "Shipment akan muncul setelah dibuat untuk order yang sudah dibayar"
          }
        >
          <ShipmentTable
            shipments={filteredShipments}
            onEdit={openEditModal}
            onSync={handleSyncShipment}
            syncingId={syncingId}
          />
        </DataStateWrapper>
      )}

      {activeTab === "create" && (
        <DataStateWrapper
          isLoading={ordersLoading}
          error={ordersError}
          isEmpty={paidOrders.length === 0}
          onRetry={fetchPaidOrders}
          emptyIcon={<Package className="w-16 h-16" />}
          emptyTitle="Tidak ada order PAID yang perlu dibuat shipment"
          emptyDescription="Order yang sudah dibayar dan belum memiliki shipment akan muncul di sini"
        >
          <OutgoingShipmentTable orders={paidOrders} onCreateShipment={openCreateModal} />
        </DataStateWrapper>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-border bg-card w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="sticky top-0 z-50 bg-[#181720] text-white p-5 sm:p-6 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                  {modalMode === "create" ? "Penerbitan Resi" : "Pembaruan Status"}
                </p>
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white mt-1">
                  {modalMode === "create" ? "Buat Shipment Logistik" : "Update Status Pengiriman"}
                </h2>
                <p className="text-xs text-zinc-300 mt-0.5">
                  {modalMode === "create" ? "Pilih kurir Biteship otomatis atau masukkan nomor resi manual" : "Perbarui status atau detail pengiriman pesanan"}
                </p>
              </div>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
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
              
              {modalMode === "create" && (
                <div className="flex gap-2 p-1 bg-surface-container-low rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setShipmentMode("auto")}
                    className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                      shipmentMode === "auto"
                        ? "bg-violet-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Otomatis (Biteship)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShipmentMode("manual")}
                    className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                      shipmentMode === "manual"
                        ? "bg-violet-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Input Manual
                  </button>
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
                        {status === "PENDING"
                          ? "PENDING (Menunggu)"
                          : status === "PROCESSING"
                          ? "PROCESSING (Sedang Dirakit / Diproses)"
                          : status === "SHIPPED"
                          ? "SHIPPED (Dalam Pengiriman)"
                          : status === "DELIVERED"
                          ? "DELIVERED (Telah Diterima)"
                          : status === "CANCELLED"
                          ? "CANCELLED (Dibatalkan)"
                          : status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {shipmentMode === "auto" && modalMode === "create" ? (
                <>
                  {/* Mode Otomatis - Pilih dari rates Biteship */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Pilih Kurir & Layanan <span className="text-error">*</span>
                    </label>
                    {isFetchingRates ? (
                      <div className="flex items-center justify-center p-8 bg-surface-container-low rounded-xl">
                        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                        <span className="text-sm text-muted-foreground">Mengambil daftar kurir...</span>
                      </div>
                    ) : formErrors.rates ? (
                      <div className="p-3 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
                        {formErrors.rates}
                      </div>
                    ) : availableRates.length === 0 ? (
                      <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl text-sm text-warning">
                        Tidak ada kurir tersedia. Pastikan alamat florist dan customer sudah lengkap dengan kode pos.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {availableRates.map((rate) => (
                          <label
                            key={rate.rate_id}
                            className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                              selectedRate === rate.rate_id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="courier"
                                value={rate.rate_id}
                                checked={selectedRate === rate.rate_id}
                                onChange={() => setSelectedRate(rate.rate_id)}
                                className="w-4 h-4 text-primary"
                              />
                              <div>
                                <p className="font-medium text-foreground">
                                  {rate.courier.name} - {rate.courier.service_name}
                                </p>
                                <p className="text-xs text-muted-foreground">{rate.rate_name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-primary">
                                {new Intl.NumberFormat("id-ID", {
                                  style: "currency",
                                  currency: "IDR",
                                  maximumFractionDigits: 0,
                                }).format(rate.price)}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Mode Manual - Input field existing */}
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
                  Nomor Resi {formData.status === "SHIPPED" && !Boolean(selectedShipment?.biteshipOrderId) && <span className="text-error">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.trackingNumber}
                  onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                  disabled={Boolean(selectedShipment?.biteshipOrderId)}
                  readOnly={Boolean(selectedShipment?.biteshipOrderId)}
                  className={`input-field ${formErrors.trackingNumber ? "border-error" : ""} ${Boolean(selectedShipment?.biteshipOrderId) ? "cursor-not-allowed bg-muted opacity-80" : ""}`}
                  placeholder={Boolean(selectedShipment?.biteshipOrderId) ? "Resi otomatis dari Biteship" : "Tracking number dari courier"}
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
                </>
              )}

              <div className="flex gap-3 pt-4 border-t border-border">
                <button type="button" onClick={closeModal} className="flex-1 btn-secondary text-sm rounded-lg" disabled={isSubmitting}>
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors shadow-xs disabled:opacity-50"
                >
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
