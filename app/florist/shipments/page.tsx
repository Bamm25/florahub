"use client";

import { useEffect, useState } from "react";
import { Package, Loader2, Truck } from "lucide-react";
import Modal from "@/components/forms/Modal";
import { Pagination } from "@/components/ui";
import TabNavigation from "@/components/ui/TabNavigation";
import DataStateWrapper from "@/components/ui/DataStateWrapper";
import { ShipmentTable } from "@/components/florist/ShipmentTable";
import { OutgoingShipmentTable } from "@/components/florist/OutgoingShipmentTable";
import ShipmentStats from "@/components/florist/ShipmentStats";
import ShipmentFilters from "@/components/florist/ShipmentFilters";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";
import { formatRupiah } from "@/lib/utils/formatters";
import { ApiClientError } from "@/lib/api/client";
import {
  trackFloristShipment,
  getFloristShipmentRates,
  autoCreateFloristShipment,
  updateFloristShipment,
  type FloristShipmentRate,
} from "@/lib/api/florist";

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

const SHIPMENTS_PER_PAGE = 10;
const PAID_ORDERS_PER_PAGE = 9;

export default function FloristShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [paidOrders, setPaidOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [shipmentsPage, setShipmentsPage] = useState(1);
  const [paidOrdersPage, setPaidOrdersPage] = useState(1);
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

  // State untuk pilihan tarif kurir otomatis Biteship
  const [availableRates, setAvailableRates] = useState<FloristShipmentRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Sinkronkan status shipment Biteship secara langsung dari server Biteship
  const handleSyncShipment = async (shipment: Shipment) => {
    if (!shipment.biteshipOrderId) return;
    setSyncingId(shipment.id);
    try {
      await trackFloristShipment(shipment.id);
      await fetchData();
    } catch {
      // Abaikan error sinkron sementara
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
      const message = err instanceof Error ? err.message : "Unknown error";
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
    const timer = window.setTimeout(() => {
      void fetchData();
      const params = new URLSearchParams(window.location.search);
      const targetOrderId = params.get("orderId");
      if (targetOrderId) {
        setActiveTab("create");
        void openCreateModal(targetOrderId);
      }
    }, 0);
    return () => window.clearTimeout(timer);
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
    setAvailableRates([]);
    setSelectedRate("");
    setIsModalOpen(true);

    // Auto-fetch rates kurir Biteship
    if (orderId) {
      await fetchRates(orderId);
    }
  };

  const fetchRates = async (orderId: string) => {
    setIsFetchingRates(true);
    try {
      const rates = await getFloristShipmentRates(orderId);
      setAvailableRates(rates);
      if (rates.length > 0) {
        setSelectedRate(rates[0].rate_id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error fetching rates";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modalMode === "create") {
      // Penerbitan resi otomatis via Biteship
      if (!selectedOrderId) {
        setFormErrors({ submit: "Pilih pesanan yang sudah lunas terlebih dahulu" });
        return;
      }
      if (!selectedRate) {
        setFormErrors({ rates: "Pilih kurir terlebih dahulu" });
        return;
      }

      setIsSubmitting(true);
      try {
        const selectedRateData = availableRates.find(
          (r) => r.rate_id === selectedRate,
        );
        if (!selectedRateData) throw new Error("Tarif kurir tidak ditemukan");

        await autoCreateFloristShipment({
          orderId: selectedOrderId,
          courierCompany: selectedRateData.courier.code,
          courierType: selectedRateData.courier.service_code,
        });

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

    // Mode update status pengiriman
    if (!selectedShipment?.id) {
      setFormErrors({ submit: "Shipment tidak ditemukan" });
      return;
    }

    setIsSubmitting(true);

    try {
      await updateFloristShipment(selectedShipment.id, {
        status: formData.status,
      });

      await fetchData();
      closeModal();
      setActiveTab("shipments");
    } catch (err) {
      if (err instanceof ApiClientError && Array.isArray(err.errors)) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach(
          (fieldErr: { path?: (string | number)[]; message: string }) => {
            const field = fieldErr.path?.[0] || "submit";
            fieldErrors[String(field)] = fieldErr.message;
          },
        );
        setFormErrors(fieldErrors);
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
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

  const shipmentsTotalPages = Math.max(
    1,
    Math.ceil(filteredShipments.length / SHIPMENTS_PER_PAGE),
  );
  const safeShipmentsPage = Math.min(shipmentsPage, shipmentsTotalPages);
  const shipmentsStart = (safeShipmentsPage - 1) * SHIPMENTS_PER_PAGE;
  const paginatedShipments = filteredShipments.slice(
    shipmentsStart,
    shipmentsStart + SHIPMENTS_PER_PAGE,
  );

  const paidOrdersTotalPages = Math.max(
    1,
    Math.ceil(paidOrders.length / PAID_ORDERS_PER_PAGE),
  );
  const safePaidOrdersPage = Math.min(paidOrdersPage, paidOrdersTotalPages);
  const paidOrdersStart = (safePaidOrdersPage - 1) * PAID_ORDERS_PER_PAGE;
  const paginatedPaidOrders = paidOrders.slice(
    paidOrdersStart,
    paidOrdersStart + PAID_ORDERS_PER_PAGE,
  );

  const tabs = [
    { id: "shipments", label: `Daftar Pengiriman (${shipments.length})` },
    { id: "create", label: `Buat Pengiriman (${paidOrders.length})` },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Editorial Dark Header */}
      <section className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Logistik & Ekspedisi
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Pengiriman Customer
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Terbitkan resi otomatis melalui kurir Biteship, cetak label pengiriman, dan pantau status pengantaran paket.
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
      </section>

      <ShipmentStats
        shipments={shipments}
        paidOrdersCount={paidOrders.length}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:p-5">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as "shipments" | "create")}
        />

        {activeTab === "shipments" && (
          <ShipmentFilters
            statusFilter={statusFilter}
            onStatusChange={(value) => {
              setStatusFilter(value);
              setShipmentsPage(1);
            }}
            searchQuery={searchQuery}
            onSearchChange={(value) => {
              setSearchQuery(value);
              setShipmentsPage(1);
            }}
          />
        )}
      </div>

      {activeTab === "shipments" && (
        <DataStateWrapper
          isLoading={isLoading && shipments.length === 0}
          error={error}
          isEmpty={filteredShipments.length === 0}
          onRetry={fetchData}
          emptyIcon={<Truck className="h-12 w-12" aria-hidden="true" />}
          emptyTitle={
            searchQuery || statusFilter !== "ALL"
              ? "Tidak ada pengiriman yang sesuai filter"
              : "Belum ada pengiriman tercatat"
          }
          emptyDescription={
            searchQuery || statusFilter !== "ALL"
              ? "Coba sesuaikan kata kunci pencarian atau pilih status lainnya."
              : "Resi pengiriman akan muncul di sini setelah diterbitkan untuk pesanan yang telah lunas."
          }
        >
          <div className="space-y-4">
            <ShipmentTable
              shipments={paginatedShipments}
              onEdit={openEditModal}
              onSync={handleSyncShipment}
              syncingId={syncingId}
            />
            {filteredShipments.length > SHIPMENTS_PER_PAGE && (
              <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-3.5 sm:flex-row">
                <p className="text-xs tabular-nums text-muted-foreground">
                  Menampilkan {shipmentsStart + 1}–
                  {Math.min(
                    shipmentsStart + SHIPMENTS_PER_PAGE,
                    filteredShipments.length,
                  )}{" "}
                  dari {filteredShipments.length} pengiriman
                </p>
                <Pagination
                  currentPage={safeShipmentsPage}
                  totalPages={shipmentsTotalPages}
                  onPageChange={(page) => {
                    setShipmentsPage(page);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  ariaLabel="Navigasi halaman pengiriman"
                />
              </div>
            )}
          </div>
        </DataStateWrapper>
      )}

      {activeTab === "create" && (
        <DataStateWrapper
          isLoading={ordersLoading}
          error={ordersError}
          isEmpty={paidOrders.length === 0}
          onRetry={fetchPaidOrders}
          emptyIcon={<Package className="h-12 w-12" aria-hidden="true" />}
          emptyTitle="Semua pesanan lunas sudah memiliki resi"
          emptyDescription="Pesanan baru yang pembayarannya telah diverifikasi akan muncul di sini untuk dibuatkan resi pengiriman."
        >
          <div className="space-y-4">
            <OutgoingShipmentTable
              orders={paginatedPaidOrders}
              onCreateShipment={openCreateModal}
            />
            {paidOrders.length > PAID_ORDERS_PER_PAGE && (
              <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-3.5 sm:flex-row">
                <p className="text-xs tabular-nums text-muted-foreground">
                  Menampilkan {paidOrdersStart + 1}–
                  {Math.min(
                    paidOrdersStart + PAID_ORDERS_PER_PAGE,
                    paidOrders.length,
                  )}{" "}
                  dari {paidOrders.length} pesanan siap kirim
                </p>
                <Pagination
                  currentPage={safePaidOrdersPage}
                  totalPages={paidOrdersTotalPages}
                  onPageChange={(page) => {
                    setPaidOrdersPage(page);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  ariaLabel="Navigasi halaman buat pengiriman"
                />
              </div>
            )}
          </div>
        </DataStateWrapper>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        size="md"
        headerVariant="dark"
        kicker={
          modalMode === "create"
            ? "Penerbitan Resi Biteship"
            : "Pembaruan Status"
        }
        title={
          modalMode === "create"
            ? "Terbitkan Resi Pengiriman"
            : "Perbarui Status Pengiriman"
        }
        subtitle={
          modalMode === "create"
            ? "Pilih tarif dan layanan kurir Biteship untuk menerbitkan nomor resi otomatis"
            : "Perbarui status pengiriman pesanan customer"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.submit && (
            <div
              role="alert"
              className="rounded-xl border border-error/20 bg-error/5 p-3 text-sm text-error"
            >
              {formErrors.submit}
            </div>
          )}

          {modalMode === "edit" && selectedShipment && (
            <>
              <dl className="space-y-2 rounded-xl border border-border bg-surface-container-low p-4 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">No. Pesanan</dt>
                  <dd className="font-mono font-bold text-foreground">
                    {selectedShipment.order.orderNumber}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd className="font-semibold text-foreground">
                    {selectedShipment.order.user.name}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Kurir &amp; Layanan</dt>
                  <dd className="font-semibold text-foreground">
                    {selectedShipment.courier}
                    {selectedShipment.service
                      ? ` · ${selectedShipment.service}`
                      : ""}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Nomor Resi (AWB)</dt>
                  <dd className="font-mono font-semibold text-foreground">
                    {selectedShipment.trackingNumber || "-"}
                  </dd>
                </div>
              </dl>

              <div>
                <label
                  htmlFor="modal-shipment-status"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Status Pengiriman <span className="text-error">*</span>
                </label>
                <select
                  id="modal-shipment-status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="input-field"
                >
                  {getNextStatuses(selectedShipment.status || "").map(
                    (status) => (
                      <option key={status} value={status}>
                        {status === "PENDING"
                          ? "Menunggu Penjemputan (PENDING)"
                          : status === "PROCESSING"
                            ? "Sedang Dirakit / Diproses (PROCESSING)"
                            : status === "SHIPPED"
                              ? "Dalam Pengiriman (SHIPPED)"
                              : status === "DELIVERED"
                                ? "Telah Diterima Customer (DELIVERED)"
                                : status === "CANCELLED"
                                  ? "Dibatalkan (CANCELLED)"
                                  : status}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </>
          )}

          {modalMode === "create" && (
            <div>
              <p className="mb-2 block text-sm font-medium text-foreground">
                Pilih Kurir &amp; Layanan Biteship{" "}
                <span className="text-error">*</span>
              </p>
              {isFetchingRates ? (
                <div className="flex items-center justify-center rounded-xl bg-surface-container-low p-8">
                  <Loader2
                    className="mr-2 h-5 w-5 animate-spin text-primary"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-muted-foreground">
                    Mengambil tarif kurir Biteship...
                  </span>
                </div>
              ) : formErrors.rates ? (
                <div className="rounded-xl border border-error/20 bg-error/5 p-3 text-sm text-error">
                  {formErrors.rates}
                </div>
              ) : availableRates.length === 0 ? (
                <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-sm text-warning">
                  Tidak ada kurir tersedia. Pastikan alamat toko florist dan alamat customer sudah dilengkapi kode pos.
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {availableRates.map((rate) => {
                    const isSelected = selectedRate === rate.rate_id;
                    return (
                      <label
                        key={rate.rate_id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-3.5 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-foreground/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="courier"
                            value={rate.rate_id}
                            checked={isSelected}
                            onChange={() => setSelectedRate(rate.rate_id)}
                            className="h-4 w-4 text-primary"
                          />
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {rate.courier.name} · {rate.courier.service_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {rate.rate_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums text-primary">
                            {formatRupiah(rate.price)}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="btn-secondary flex-1 rounded-xl text-sm"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                (modalMode === "create" &&
                  (isFetchingRates || availableRates.length === 0 || !selectedRate))
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {modalMode === "create"
                      ? "Terbitkan Resi Biteship"
                      : "Simpan Perubahan"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
