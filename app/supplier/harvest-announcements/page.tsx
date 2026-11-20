"use client";

import { useEffect, useState } from "react";
import {
  Sprout,
  Plus,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  MapPin,
  Truck,
  Navigation,
} from "lucide-react";
import Modal from "@/components/forms/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  getSupplierHarvestAnnouncements,
  getSupplierHarvestAnnouncementDetail,
  createHarvestAnnouncement,
  deleteHarvestAnnouncement,
  updatePreOrderStatus,
  HarvestAnnouncementItem,
  HarvestPreOrderItem,
  CreateHarvestAnnouncementInput,
} from "@/lib/api/supplier";
import { formatRupiah, formatDate } from "@/lib/utils/formatters";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import SupplierDeliveryStatus from "@/components/ui/SupplierDeliveryStatus";
import ShipmentTrackingModal from "@/components/ui/ShipmentTrackingModal";

export default function SupplierHarvestAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<HarvestAnnouncementItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Tambah Pengumuman Panen
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<CreateHarvestAnnouncementInput>({
    flowerName: "",
    variety: "",
    estimatedQuantity: 200,
    pricePerUnit: 12000,
    harvestDate: "",
    description: "",
    location: "Kebun Mitra",
  });

  // Modal Detail & Daftar Pre-Order Florist
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<HarvestAnnouncementItem | null>(null);
  const [trackingPreOrder, setTrackingPreOrder] = useState<HarvestPreOrderItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingCancelPreOrderId, setPendingCancelPreOrderId] = useState<string | null>(null);
  const [pendingDeleteAnnouncement, setPendingDeleteAnnouncement] = useState<{ id: string; name: string } | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Ambil daftar pengumuman panen
  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getSupplierHarvestAnnouncements({ limit: 50 });
      setAnnouncements(res.announcements);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat jadwal pengumuman panen",
      );
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    void Promise.resolve().then(() => fetchAnnouncements());
  }, []);

  // Handler simpan pengumuman panen baru
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingAdd(true);
      setAddError(null);
      if (!addForm.flowerName.trim()) throw new Error("Nama bunga wajib diisi");
      if (!addForm.harvestDate)
        throw new Error("Tanggal panen wajib ditentukan");
      if (addForm.estimatedQuantity <= 0)
        throw new Error("Estimasi hasil panen minimal 1 tangkai");
      if (addForm.pricePerUnit < 0)
        throw new Error("Harga per unit tidak boleh negatif");

      // Validasi tanggal tidak boleh di masa lalu
      const harvestDateTime = new Date(addForm.harvestDate);
      if (harvestDateTime < new Date()) {
        throw new Error("Tanggal panen harus berada di masa mendatang");
      }
      await createHarvestAnnouncement({
        flowerName: addForm.flowerName.trim(),
        variety: addForm.variety?.trim(),
        estimatedQuantity: Number(addForm.estimatedQuantity),
        pricePerUnit: Number(addForm.pricePerUnit),
        harvestDate: new Date(addForm.harvestDate).toISOString(),
        description: addForm.description?.trim() || "Bunga segar siap panen",
        location: addForm.location?.trim() || "Kebun Mitra",
      });
      setIsAddModalOpen(false);
      setAddForm({
        flowerName: "",
        variety: "",
        estimatedQuantity: 200,
        pricePerUnit: 12000,
        harvestDate: "",
        description: "",
        location: "Kebun Mitra",
      });
      await fetchAnnouncements();
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Gagal membuat pengumuman panen",
      );
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handler buka rincian dan pre-order florist
  const handleOpenDetail = async (id: string) => {
    setActionError(null);
    setDetailError(null);
    try {
      setIsDetailModalOpen(true);
      setIsLoadingDetail(true);
      const detail = await getSupplierHarvestAnnouncementDetail(id);
      setSelectedAnnouncement(detail);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Gagal memuat detail pre-order panen",
      );
      setIsDetailModalOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Handler ubah status pre-order florist (Konfirmasi / Batalkan)
  const submitPreOrderUpdate = async (
    preOrderId: string,
    status: "CONFIRMED" | "CANCELLED",
    cancelReason?: string,
  ) => {
    setDetailError(null);
    try {
      setActionLoadingId(preOrderId);
      await updatePreOrderStatus(preOrderId, status, cancelReason);
      // Segarkan data detail pre-order saat ini
      if (selectedAnnouncement) {
        const updatedDetail = await getSupplierHarvestAnnouncementDetail(
          selectedAnnouncement.id,
        );
        setSelectedAnnouncement(updatedDetail);
      }
      await fetchAnnouncements();
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui status pre-order",
      );
    } finally {
      setActionLoadingId(null);
      setPendingCancelPreOrderId(null);
    }
  };

  const handleUpdatePreOrder = (
    preOrderId: string,
    status: "CONFIRMED" | "CANCELLED",
  ) => {
    if (status === "CANCELLED") {
      setPendingCancelPreOrderId(preOrderId);
      return;
    }
    void submitPreOrderUpdate(preOrderId, status);
  };

  // Handler hapus pengumuman panen
  const handleConfirmDeleteAnnouncement = async () => {
    if (!pendingDeleteAnnouncement) return;
    const { id } = pendingDeleteAnnouncement;
    setActionError(null);
    try {
      setDeletingId(id);
      await deleteHarvestAnnouncement(id);
      await fetchAnnouncements();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal menghapus rencana panen",
      );
    } finally {
      setDeletingId(null);
      setPendingDeleteAnnouncement(null);
    }
  };
  // Loading & Error States
  if (isLoading) {
    return <LoadingSpinner message="Memuat jadwal & rencana panen kebun..." />;
  }
  if (error) {
    return (
      <ErrorState
        title="Jadwal Panen Gagal Dimuat"
        error={error}
        onRetry={fetchAnnouncements}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Rencana & Jadwal Panen
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Umumkan panen dan kelola pre-order florist.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAddError(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Jadwal Panen</span>
        </button>
      </div>
      {/* Grid Kartu Pengumuman Panen */}
      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs font-semibold underline"
          >
            Tutup
          </button>
        </div>
      )}

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Sprout className="h-10 w-10 text-muted-foreground" />}
          title="Belum ada jadwal panen"
          description="Publikasikan jadwal panen kebun Anda berikutnya untuk membuka keran pesanan pre-order dari jaringan florist."
          action={{
            label: "Buat Pengumuman Panen Pertama",
            onClick: () => setIsAddModalOpen(true),
          }}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.map((item) => {
            const reserved = item.totalReservedQuantity || 0;
            const remaining = Math.max(0, item.estimatedQuantity - reserved);
            const isHarvestPassed = new Date(item.harvestDate) < new Date();
            return (
              <div
                key={item.id}
                className="m-card flex flex-col justify-between rounded-2xl border border-border bg-surface p-6"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                        {isHarvestPassed
                          ? "Masa Panen Selesai"
                          : "Siap Dipesan"}
                      </span>
                      <h3 className="mt-3 text-lg font-bold text-foreground">
                        {item.flowerName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Varietas: {item.variety || "Standar"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={() =>
                        setPendingDeleteAnnouncement({
                          id: item.id,
                          name: item.flowerName,
                        })
                      }
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-error/10 hover:text-error disabled:opacity-50"
                      title="Hapus Pengumuman"
                      aria-label={`Hapus pengumuman ${item.flowerName}`}
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {/* Informasi Tanggal & Lokasi */}
                  <div className="mt-4 space-y-2 border-y border-border py-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>
                        Panen: <strong>{formatDate(item.harvestDate)}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{item.location || "Kebun Utama"}</span>
                    </div>
                  </div>
                  {/* Metrik Kuota Panen */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-surface-container-low p-2.5">
                      <p className="text-muted-foreground">Estimasi Hasil</p>
                      <p className="mt-1 font-bold text-foreground">
                        {item.estimatedQuantity.toLocaleString("id-ID")} unit
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-container-low p-2.5">
                      <p className="text-muted-foreground">Dipesan Florist</p>
                      <p className="mt-1 font-bold text-foreground">
                        {reserved.toLocaleString("id-ID")} unit
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground flex justify-between items-center px-1">
                    <span>
                      Sisa kuota: <strong>{remaining} unit</strong>
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatRupiah(item.pricePerUnit)} / unit
                    </span>
                  </div>
                </div>
                {/* Tombol Periksa Pre-Order Florist */}
                <div className="mt-6 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(item.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-high"
                  >
                    <Users className="h-4 w-4 text-primary" />
                    <span>
                      Lihat Pemesan ({item._count?.preOrders || 0} florist)
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Modal Buat Pengumuman Panen Baru */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmittingAdd && setIsAddModalOpen(false)}
        title="Buat Jadwal Panen Baru"
        size="sm"
      >
        {addError && (
          <div role="alert" className="mb-4 rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error">
            {addError}
          </div>
        )}
        <form
          onSubmit={handleCreateAnnouncement}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-foreground">
              Nama Bunga *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Krisan Spray / Mawar Holland"
              value={addForm.flowerName}
              onChange={(e) =>
                setAddForm((prev) => ({
                  ...prev,
                  flowerName: e.target.value,
                }))
              }
              className="input-field mt-1.5 w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground">
              Varietas / Warna
            </label>
            <input
              type="text"
              placeholder="Contoh: Putih Salju / Kuning Emas"
              value={addForm.variety}
              onChange={(e) =>
                setAddForm((prev) => ({ ...prev, variety: e.target.value }))
              }
              className="input-field mt-1.5 w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground">
                Estimasi Jumlah Panen *
              </label>
              <input
                type="number"
                min="1"
                required
                value={addForm.estimatedQuantity}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    estimatedQuantity: parseInt(e.target.value) || 0,
                  }))
                }
                className="input-field mt-1.5 w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground">
                Harga per Satuan (Rp) *
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={addForm.pricePerUnit}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    pricePerUnit: parseInt(e.target.value) || 0,
                  }))
                }
                className="input-field mt-1.5 w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground">
              Tanggal Panen *
            </label>
            <input
              type="date"
              required
              min={new Date().toISOString().split("T")[0]}
              value={addForm.harvestDate}
              onChange={(e) =>
                setAddForm((prev) => ({
                  ...prev,
                  harvestDate: e.target.value,
                }))
              }
              className="input-field mt-1.5 w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground">
              Lokasi Kebun
            </label>
            <input
              type="text"
              placeholder="Contoh: Batu, Malang / Cipanas, Cianjur"
              value={addForm.location}
              onChange={(e) =>
                setAddForm((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              className="input-field mt-1.5 w-full"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-container"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmittingAdd && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <span>Publikasikan Jadwal</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail & Daftar Pre-Order Florist */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Daftar Pre-Order Florist"
        subtitle={
          selectedAnnouncement
            ? `${selectedAnnouncement.flowerName} (${selectedAnnouncement.variety || "Standar"}) • Panen: ${formatDate(selectedAnnouncement.harvestDate)}`
            : undefined
        }
        size="md"
      >
        <div className="space-y-4">
          {detailError && (
            <div role="alert" className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error">
              {detailError}
            </div>
          )}
          {isLoadingDetail ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner message="Memuat daftar pesanan florist..." />
            </div>
          ) : !selectedAnnouncement?.preOrders ||
            selectedAnnouncement.preOrders.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Belum ada florist yang pre-order untuk jadwal panen ini.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedAnnouncement.preOrders.map((order) => {
                const isActionLoading = actionLoadingId === order.id;
                return (
                  <div
                    key={order.id}
                    className="rounded-xl border border-border bg-surface-container-low/40 p-4 space-y-3 transition-colors hover:border-primary/40"
                  >
                    {/* Baris 1: Header Florist & Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          {order.florist.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dipesan: {formatDate(order.createdAt)}
                        </p>
                      </div>
                      {order.biteshipOrderId ? <SupplierDeliveryStatus status={order.status} booked={true} /> : <StatusBadge status={order.status} variant="preorder" size="sm" />}
                    </div>

                    {/* Baris 2: Kartu Rincian Finansial & Bunga */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="rounded-lg bg-surface p-2.5 border border-border">
                        <span className="text-muted-foreground block text-[11px]">
                          Jumlah Bunga
                        </span>
                        <span className="font-bold text-foreground text-sm tabular-nums">
                          {order.quantity.toLocaleString("id-ID")} tangkai
                        </span>
                      </div>

                      <div className="rounded-lg bg-surface p-2.5 border border-border">
                        <span className="text-muted-foreground block text-[11px]">
                          Total Tagihan
                        </span>
                        <span className="font-bold text-foreground text-sm tabular-nums">
                          {formatRupiah(order.totalPrice)}
                        </span>
                      </div>

                      <div className="rounded-lg bg-surface p-2.5 border border-border col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground block text-[11px]">
                          Skema DP 50%
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatRupiah(
                              order.depositAmount ||
                                Math.round(order.totalPrice * 0.5),
                            )}
                          </span>
                          {order.status === "CONFIRMED" &&
                            order.depositDeadline && (
                              <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/25">
                                Batas: {formatDate(order.depositDeadline)}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Catatan florist jika ada */}
                    {order.notes && (
                      <p className="text-xs italic text-muted-foreground bg-surface p-2 rounded-lg border border-border">
                        Catatan florist: &ldquo;{order.notes}&rdquo;
                      </p>
                    )}

                    {/* Alasan batal jika ada */}
                    {order.cancelReason && (
                      <p className="text-xs text-error bg-error/5 p-2 rounded-lg border border-error/25">
                        Alasan pembatalan: {order.cancelReason}
                      </p>
                    )}

                    {order.status === "DEPOSIT_PAID" && order.finalDeadline && (
                      <p className="text-xs text-warning">Batas pelunasan: {formatDate(order.finalDeadline)}</p>
                    )}

                    {/* Baris 3: Area Aksi dan Informasi Pengiriman */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                      {order.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() =>
                              handleUpdatePreOrder(order.id, "CONFIRMED")
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span>Konfirmasi (DP 50%)</span>
                          </button>
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() =>
                                  handleUpdatePreOrder(order.id, "CANCELLED")
                                }
                                className="inline-flex items-center gap-1.5 rounded-xl border border-error/30 bg-error/5 px-3.5 py-1.5 text-xs font-semibold text-error hover:bg-error/10 disabled:opacity-50 transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          )}

                          {order.status === "CONFIRMED" && (
                            <span className="text-xs text-warning font-medium bg-warning/10 px-3 py-1.5 rounded-xl border border-warning/25">
                              Menunggu DP 50% • Batas: {order.depositDeadline ? formatDate(order.depositDeadline) : "belum ditentukan"}
                            </span>
                          )}

                          {order.status === "DEPOSIT_PAID" && (
                            <span className="text-xs text-info font-medium bg-info/10 px-3 py-1.5 rounded-xl border border-info/25">
                              DP Diterima • Batas pelunasan: {order.finalDeadline ? formatDate(order.finalDeadline) : "saat panen"}
                            </span>
                          )}

                      {order.status === "PAID" && !order.biteshipOrderId && (
                        <a
                          href="/supplier/shipments"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          <span>Atur Pengiriman Biteship</span>
                        </a>
                      )}

                      {order.biteshipOrderId && (
                        <div className="space-y-2">
                          <SupplierDeliveryStatus
                            status={order.status}
                            booked={true}
                            courier={order.courier}
                            trackingNumber={order.trackingNumber}
                            bookedAt={order.shippedAt}
                            deliveredAt={order.deliveredAt}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const ord = order;
                              setIsDetailModalOpen(false);
                              setTrackingPreOrder(ord);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Navigation className="h-3.5 w-3.5 text-primary" />
                            <span>Lacak & Kontrol Kurir</span>
                          </button>
                        </div>
                      )}

                      {order.status === "DELIVERED" && !order.biteshipOrderId && (
                        <div className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-3 py-1.5 rounded-xl border border-success/20">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            Selesai • Diterima Florist pada{" "}
                            {formatDate(order.deliveredAt || null)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingCancelPreOrderId)}
        onClose={() => setPendingCancelPreOrderId(null)}
        onConfirm={(reason) => {
          if (pendingCancelPreOrderId && reason) {
            void submitPreOrderUpdate(pendingCancelPreOrderId, "CANCELLED", reason);
          }
        }}
        title="Tolak Pre-Order Florist"
        description="Masukkan alasan pembatalan pre-order florist agar florist mendapat penjelasan yang jelas."
        confirmLabel="Tolak Pre-Order"
        variant="danger"
        loading={Boolean(actionLoadingId)}
        inputConfig={{
          label: "Alasan pembatalan (minimal 10 karakter)",
          placeholder: "Contoh: Hasil panen terdampak hujan lebat sehingga kuota berkurang.",
          minLength: 10,
          requiredMessage: "Alasan pembatalan minimal 10 karakter.",
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteAnnouncement)}
        onClose={() => setPendingDeleteAnnouncement(null)}
        onConfirm={handleConfirmDeleteAnnouncement}
        title="Hapus Jadwal Panen"
        description={
          pendingDeleteAnnouncement
            ? `Apakah Anda yakin ingin menghapus rencana panen "${pendingDeleteAnnouncement.name}"? Seluruh data pre-order terkait akan terhapus.`
            : ""
        }
        confirmLabel="Hapus Jadwal"
        variant="danger"
        loading={Boolean(deletingId)}
      />

      {/* MODAL PELACAKAN PENGIRIMAN PRE-ORDER UNTUK SUPPLIER */}
      {trackingPreOrder && (
        <ShipmentTrackingModal
          isOpen={Boolean(trackingPreOrder)}
          onClose={() => setTrackingPreOrder(null)}
          shipmentId={trackingPreOrder.id}
          orderNumber={`PO-${trackingPreOrder.id.slice(-8).toUpperCase()}`}
          orderType="PREORDER"
          courierName={trackingPreOrder.courier}
          trackingNumber={trackingPreOrder.trackingNumber}
          currentStatus={trackingPreOrder.status}
          recipientName={trackingPreOrder.florist?.name}
          shippedAt={trackingPreOrder.shippedAt}
          deliveredAt={trackingPreOrder.deliveredAt}
          userRole="SUPPLIER"
          onStatusUpdated={() => {
            void fetchAnnouncements();
          }}
        />
      )}
    </div>
  );
}
