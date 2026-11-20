"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Edit2,
  Loader2,
  Trash2,
} from "lucide-react";
import Modal from "@/components/forms/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  getSupplierHarvestAnnouncementDetail,
  createHarvestAnnouncement,
  updateHarvestAnnouncement,
  deleteHarvestAnnouncement,
  transferHarvestToStock,
  updatePreOrderStatus,
  HarvestAnnouncementItem,
  HarvestPreOrderItem,
  CreateHarvestAnnouncementInput,
  UpdateHarvestAnnouncementInput,
} from "@/lib/api/supplier";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";
import { getHarvestLeftoverTransferEligibility } from "@/lib/supply-chain/harvest-schedule";
import { formatRupiah, formatDate } from "@/lib/utils/formatters";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import SupplierDeliveryStatus from "@/components/ui/SupplierDeliveryStatus";
import ShipmentTrackingModal from "@/components/ui/ShipmentTrackingModal";
import SearchInput from "@/components/ui/SearchInput";
import FilterBar from "@/components/ui/FilterBar";
import Pagination from "@/components/ui/Pagination";

const ITEMS_PER_PAGE = 9;

function getMinHarvestDateString(): string {
  const target = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
  return target.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function getAnnouncementStatus(item: HarvestAnnouncementItem): "ACTIVE" | "INACTIVE" | "PASSED" {
  if (new Date(item.harvestDate) < new Date()) return "PASSED";
  if (!item.isActive) return "INACTIVE";
  return "ACTIVE";
}

export default function SupplierHarvestAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<HarvestAnnouncementItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter, Pencarian & Paginasi
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const minHarvestDate = useMemo(() => getMinHarvestDateString(), []);

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

  // Modal Edit Pengumuman Panen
  const [editingItem, setEditingItem] =
    useState<HarvestAnnouncementItem | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    flowerName: string;
    variety: string;
    estimatedQuantity: number;
    pricePerUnit: number;
    harvestDate: string;
    location: string;
    description: string;
    isActive: boolean;
  }>({
    flowerName: "",
    variety: "",
    estimatedQuantity: 100,
    pricePerUnit: 10000,
    harvestDate: "",
    location: "",
    description: "",
    isActive: true,
  });

  // Modal Transfer Sisa Panen ke Stok Biasa (QC Supplier)
  const [transferringItem, setTransferringItem] =
    useState<HarvestAnnouncementItem | null>(null);
  const [transferMaxQty, setTransferMaxQty] = useState(0);
  const [transferQty, setTransferQty] = useState("");
  const [transferPrice, setTransferPrice] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const trimmedTransferQty = transferQty.trim();
  const parsedTransferQty = /^\d+$/.test(trimmedTransferQty)
    ? Number(trimmedTransferQty)
    : null;
  const trimmedTransferPrice = transferPrice.trim();
  const parsedTransferPrice = /^\d+$/.test(trimmedTransferPrice)
    ? Number(trimmedTransferPrice)
    : null;

  // Modal Detail & Daftar Pre-Order Florist
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<HarvestAnnouncementItem | null>(null);
  const [trackingPreOrder, setTrackingPreOrder] =
    useState<HarvestPreOrderItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingCancelPreOrderId, setPendingCancelPreOrderId] = useState<
    string | null
  >(null);
  const [pendingDeleteAnnouncement, setPendingDeleteAnnouncement] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Ambil seluruh daftar pengumuman panen
  const fetchAnnouncements = async (silent = false) => {
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      const list = await fetchPaginatedCollection<HarvestAnnouncementItem>(
        "/api/supplier/harvest-announcements",
        "announcements",
      );
      setAnnouncements(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat jadwal pengumuman panen",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchAnnouncements());
  }, []);

  // Ringkasan KPI
  const summaryStats = useMemo(() => {
    const total = announcements.length;
    const readyToOrder = announcements.filter(
      (item) => getAnnouncementStatus(item) === "ACTIVE",
    ).length;
    const totalPreOrders = announcements.reduce(
      (sum, item) => sum + (item._count?.preOrders ?? 0),
      0,
    );
    const totalReserved = announcements.reduce(
      (sum, item) => sum + (item.totalReservedQuantity ?? 0),
      0,
    );
    return { total, readyToOrder, totalPreOrders, totalReserved };
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return announcements.filter((item) => {
      const status = getAnnouncementStatus(item);
      if (activeFilter !== "ALL" && status !== activeFilter) {
        return false;
      }
      if (!keyword) return true;
      return (
        item.flowerName.toLowerCase().includes(keyword) ||
        (item.variety?.toLowerCase().includes(keyword) ?? false) ||
        (item.location?.toLowerCase().includes(keyword) ?? false)
      );
    });
  }, [announcements, searchQuery, activeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedAnnouncements = useMemo(() => {
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredAnnouncements.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAnnouncements, safePage]);

  const filterOptions = [
    { id: "ALL", label: "Semua", count: announcements.length },
    {
      id: "ACTIVE",
      label: "Siap Dipesan",
      count: announcements.filter(
        (item) => getAnnouncementStatus(item) === "ACTIVE",
      ).length,
    },
    {
      id: "INACTIVE",
      label: "Nonaktif",
      count: announcements.filter(
        (item) => getAnnouncementStatus(item) === "INACTIVE",
      ).length,
    },
    {
      id: "PASSED",
      label: "Panen Selesai",
      count: announcements.filter(
        (item) => getAnnouncementStatus(item) === "PASSED",
      ).length,
    },
  ];

  // Handler simpan pengumuman panen baru
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingAdd(true);
      setAddError(null);
      setActionError(null);
      const trimmedName = addForm.flowerName.trim();
      const trimmedDesc = addForm.description?.trim() || "";
      if (!trimmedName) throw new Error("Nama bunga wajib diisi");
      if (!addForm.harvestDate)
        throw new Error("Tanggal panen wajib ditentukan");
      if (addForm.harvestDate < minHarvestDate) {
        throw new Error(
          "Tanggal panen minimal 4 hari dari sekarang agar florist sempat melunasi DP.",
        );
      }
      if (addForm.estimatedQuantity <= 0)
        throw new Error("Estimasi hasil panen minimal 1 tangkai");
      if (addForm.pricePerUnit < 0)
        throw new Error("Harga per satuan tidak boleh negatif");
      if (trimmedDesc && trimmedDesc.length < 10) {
        throw new Error("Deskripsi minimal 10 karakter jika diisi");
      }

      await createHarvestAnnouncement({
        flowerName: trimmedName,
        variety: addForm.variety?.trim() || undefined,
        estimatedQuantity: Number(addForm.estimatedQuantity),
        pricePerUnit: Number(addForm.pricePerUnit),
        harvestDate: new Date(`${addForm.harvestDate}T00:00:00.000Z`).toISOString(),
        description: trimmedDesc || undefined,
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
      setActionSuccess(
        `Jadwal panen "${trimmedName}" berhasil dipublikasikan.`,
      );
      await fetchAnnouncements(true);
      setCurrentPage(1);
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Gagal membuat pengumuman panen",
      );
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Buka modal edit jadwal panen
  const handleOpenEdit = (item: HarvestAnnouncementItem) => {
    setEditError(null);
    setEditingItem(item);
    setEditForm({
      flowerName: item.flowerName,
      variety: item.variety || "",
      estimatedQuantity: item.estimatedQuantity,
      pricePerUnit: item.pricePerUnit,
      harvestDate: item.harvestDate.slice(0, 10),
      location: item.location || "",
      description: item.description || "",
      isActive: item.isActive,
    });
  };

  // Simpan pembaruan jadwal panen
  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const hasPreOrders = (editingItem._count?.preOrders ?? 0) > 0;
    const minReserved = editingItem.totalReservedQuantity ?? 0;

    try {
      setIsSubmittingEdit(true);
      setEditError(null);
      setActionError(null);

      const trimmedName = editForm.flowerName.trim();
      const trimmedDesc = editForm.description.trim();
      if (!trimmedName) throw new Error("Nama bunga wajib diisi");
      if (editForm.estimatedQuantity < minReserved) {
        throw new Error(
          `Estimasi hasil panen tidak boleh kurang dari ${minReserved} tangkai yang sudah dipesan.`,
        );
      }
      if (editForm.estimatedQuantity < 1) {
        throw new Error("Estimasi hasil panen minimal 1 tangkai");
      }
      if (!hasPreOrders) {
        if (!editForm.harvestDate) {
          throw new Error("Tanggal panen wajib ditentukan");
        }
        if (editForm.pricePerUnit < 0) {
          throw new Error("Harga per satuan tidak boleh negatif");
        }
      }
      if (trimmedDesc && trimmedDesc.length < 10) {
        throw new Error("Deskripsi minimal 10 karakter jika diisi");
      }

      const payload: UpdateHarvestAnnouncementInput = {
        flowerName: trimmedName,
        variety: editForm.variety.trim(),
        estimatedQuantity: Number(editForm.estimatedQuantity),
        location: editForm.location.trim(),
        isActive: editForm.isActive,
      };
      if (trimmedDesc) {
        payload.description = trimmedDesc;
      }
      if (!hasPreOrders) {
        payload.pricePerUnit = Number(editForm.pricePerUnit);
        if (editForm.harvestDate !== editingItem.harvestDate.slice(0, 10)) {
          if (editForm.harvestDate < minHarvestDate) {
            throw new Error(
              "Tanggal panen baru minimal 4 hari dari sekarang agar florist sempat melunasi DP.",
            );
          }
          payload.harvestDate = new Date(
            `${editForm.harvestDate}T00:00:00.000Z`,
          ).toISOString();
        }
      }

      await updateHarvestAnnouncement(editingItem.id, payload);
      setEditingItem(null);
      setActionSuccess(
        `Jadwal panen "${trimmedName}" berhasil diperbarui.`,
      );
      await fetchAnnouncements(true);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Gagal memperbarui jadwal panen",
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Buka modal QC untuk memindahkan sisa panen ke katalog stok biasa
  const handleOpenTransfer = (
    item: HarvestAnnouncementItem,
    remainingQty: number,
  ) => {
    setTransferError(null);
    setTransferringItem(item);
    setTransferMaxQty(remainingQty);
    setTransferQty(String(remainingQty));
    setTransferPrice(String(item.pricePerUnit));
    setTransferNotes("");
  };

  // Simpan pemindahan sisa panen layak jual ke katalog stok biasa supplier
  const handleTransferToStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringItem) return;

    try {
      setIsTransferring(true);
      setTransferError(null);
      setActionError(null);

      if (
        !trimmedTransferQty ||
        parsedTransferQty === null ||
        !Number.isInteger(parsedTransferQty) ||
        parsedTransferQty < 1
      ) {
        throw new Error("Jumlah layak jual minimal 1 tangkai");
      }
      if (parsedTransferQty > transferMaxQty) {
        throw new Error(
          `Jumlah tidak boleh melebihi sisa panen (${transferMaxQty.toLocaleString("id-ID")} tangkai)`,
        );
      }
      if (
        !trimmedTransferPrice ||
        parsedTransferPrice === null ||
        !Number.isInteger(parsedTransferPrice) ||
        parsedTransferPrice < 0
      ) {
        throw new Error("Harga jual wajib diisi dan tidak boleh negatif");
      }

      const trimmedNotes = transferNotes.trim();
      const result = await transferHarvestToStock(transferringItem.id, {
        quantity: parsedTransferQty,
        pricePerUnit: parsedTransferPrice,
        qcNotes: trimmedNotes || undefined,
      });

      setTransferringItem(null);
      setActionSuccess(
        result.message ||
          `${result.transferredQuantity} tangkai sisa panen berhasil dimasukkan ke stok biasa.`,
      );
      await fetchAnnouncements(true);
    } catch (err) {
      setTransferError(
        err instanceof Error
          ? err.message
          : "Gagal memindahkan sisa panen ke stok biasa",
      );
    } finally {
      setIsTransferring(false);
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
      if (selectedAnnouncement) {
        const updatedDetail = await getSupplierHarvestAnnouncementDetail(
          selectedAnnouncement.id,
        );
        setSelectedAnnouncement(updatedDetail);
      }
      setActionSuccess(
        status === "CONFIRMED"
          ? "Pre-order berhasil dikonfirmasi. Florist kini dapat membayar DP."
          : "Pre-order berhasil ditolak dan notifikasi telah dikirim ke florist.",
      );
      await fetchAnnouncements(true);
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
    const { id, name } = pendingDeleteAnnouncement;
    setActionError(null);
    setActionSuccess(null);
    try {
      setDeletingId(id);
      await deleteHarvestAnnouncement(id);
      setActionSuccess(`Jadwal panen "${name}" berhasil dihapus.`);
      await fetchAnnouncements(true);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal menghapus rencana panen",
      );
    } finally {
      setDeletingId(null);
      setPendingDeleteAnnouncement(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Memuat jadwal & rencana panen kebun..." />;
  }
  if (error) {
    return (
      <ErrorState
        title="Jadwal Panen Gagal Dimuat"
        error={error}
        onRetry={() => void fetchAnnouncements()}
      />
    );
  }

  const editingHasPreOrders = (editingItem?._count?.preOrders ?? 0) > 0;
  const editingMinReserved = editingItem?.totalReservedQuantity ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Header Editorial Gelap */}
      <div className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Publikasi &amp; Pre-Order Panen
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Rencana &amp; Jadwal Panen
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Publikasikan jadwal panen kebun dan kelola pesanan pre-order dari
            toko florist.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void fetchAnnouncements(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-white/20 bg-white/5 px-5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {isRefreshing && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            <span>Segarkan Data</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAddError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Buat Jadwal Panen
          </button>
        </div>
      </div>

      {/* Ringkasan KPI 4-sel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="p-5 border-b border-r lg:border-b-0 border-border">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Jadwal
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {summaryStats.total}
          </p>
        </div>
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-border">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Siap Dipesan
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-primary">
            {summaryStats.readyToOrder}
          </p>
        </div>
        <div className="p-5 border-r border-border">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Pre-Order
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {summaryStats.totalPreOrders}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Kuota Terpesan
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-success">
            {summaryStats.totalReserved.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      {/* Banner Umpan Balik */}
      {actionSuccess && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success"
        >
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-xs font-semibold underline"
          >
            Tutup
          </button>
        </div>
      )}

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

      {/* Bar Pencarian & Filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <SearchInput
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setCurrentPage(1);
          }}
          placeholder="Cari bunga, varietas, atau lokasi kebun..."
          className="max-w-md"
        />
        <FilterBar
          filters={filterOptions}
          activeFilter={activeFilter}
          onChange={(filterId) => {
            setActiveFilter(filterId);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Grid Kartu Pengumuman Panen */}
      {filteredAnnouncements.length === 0 ? (
        <EmptyState
          title={
            searchQuery || activeFilter !== "ALL"
              ? "Tidak ada jadwal panen yang cocok"
              : "Belum ada jadwal panen"
          }
          description={
            searchQuery || activeFilter !== "ALL"
              ? "Ubah kata kunci pencarian atau pilih filter status lainnya."
              : "Buat jadwal panen agar toko florist dapat memesan hasil kebun lebih awal."
          }
          action={
            !searchQuery && activeFilter === "ALL"
              ? {
                  label: "Buat Pengumuman Panen Pertama",
                  onClick: () => {
                    setAddError(null);
                    setIsAddModalOpen(true);
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedAnnouncements.map((item) => {
              const reserved = item.totalReservedQuantity || 0;
              const remaining = Math.max(0, item.estimatedQuantity - reserved);
              const status = getAnnouncementStatus(item);
              const hasPreOrders = (item._count?.preOrders ?? 0) > 0;
              const eligibility = getHarvestLeftoverTransferEligibility({
                estimatedQuantity: item.estimatedQuantity,
                totalReservedQuantity: reserved,
                transferredAt: item.transferredAt,
              });

              return (
                <article
                  key={item.id}
                  className="m-card flex flex-col justify-between rounded-2xl border border-border bg-surface p-6"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            item.transferredAt
                              ? "border-success/25 bg-success/10 text-success"
                              : status === "ACTIVE"
                                ? "border-primary/20 bg-primary/10 text-primary"
                                : status === "INACTIVE"
                                  ? "border-border bg-surface-container text-muted-foreground"
                                  : "border-warning/25 bg-warning/10 text-warning"
                          }`}
                        >
                          {item.transferredAt
                            ? "Sisa Masuk ke Stok"
                            : status === "PASSED"
                              ? "Panen Selesai"
                              : status === "INACTIVE"
                                ? "Nonaktif"
                                : "Siap Dipesan"}
                        </span>
                        <h3 className="mt-3 text-base font-bold tracking-normal text-foreground">
                          {item.flowerName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Varietas: {item.variety || "Standar"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground"
                          title="Ubah Jadwal Panen"
                          aria-label={`Ubah jadwal ${item.flowerName}`}
                        >
                          <Edit2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === item.id || hasPreOrders}
                          onClick={() =>
                            setPendingDeleteAnnouncement({
                              id: item.id,
                              name: item.flowerName,
                            })
                          }
                          className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            hasPreOrders
                              ? "Jadwal dengan pre-order tidak dapat dihapus; nonaktifkan melalui Edit."
                              : "Hapus Pengumuman"
                          }
                          aria-label={`Hapus pengumuman ${item.flowerName}`}
                        >
                          {deletingId === item.id ? (
                            <Loader2
                              className="h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Informasi Tanggal & Lokasi */}
                    <div className="mt-4 space-y-1.5 border-y border-border py-3 text-xs text-muted-foreground">
                      <div>
                        Panen:{" "}
                        <strong className="text-foreground">
                          <time
                            dateTime={item.harvestDate}
                            className="tabular-nums"
                          >
                            {formatDate(item.harvestDate)}
                          </time>
                        </strong>
                      </div>
                      <div className="text-muted-foreground">
                        Lokasi: {item.location || "Kebun Utama"}
                      </div>
                    </div>

                    {/* Metrik Kuota Panen */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-surface-container-low p-2.5">
                        <p className="text-muted-foreground">Estimasi Hasil</p>
                        <p className="mt-1 font-bold tabular-nums text-foreground">
                          {item.estimatedQuantity.toLocaleString("id-ID")} tangkai
                        </p>
                      </div>
                      <div className="rounded-xl bg-surface-container-low p-2.5">
                        <p className="text-muted-foreground">Dipesan Florist</p>
                        <p className="mt-1 font-bold tabular-nums text-foreground">
                          {reserved.toLocaleString("id-ID")} tangkai
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between px-1 text-xs text-muted-foreground">
                      <span>
                        Sisa kuota:{" "}
                        <strong className="tabular-nums text-foreground">
                          {remaining.toLocaleString("id-ID")} tangkai
                        </strong>
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatRupiah(item.pricePerUnit)} / tangkai
                      </span>
                    </div>
                  </div>

                  {/* Aksi Pre-Order & Transfer Sisa Panen */}
                  <div className="mt-6 space-y-2.5 border-t border-border pt-4">
                    {item.transferredAt ? (
                      <Link
                        href="/supplier/stocks"
                        className="flex w-full items-center justify-center rounded-sm border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold tabular-nums text-success transition-colors hover:bg-success/15"
                      >
                        Tersimpan ke Stok Biasa (
                        {(item.transferredToStockQty ?? 0).toLocaleString("id-ID")}{" "}
                        tangkai)
                      </Link>
                    ) : (
                      eligibility.canTransfer && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenTransfer(
                              item,
                              eligibility.remainingQuantity,
                            )
                          }
                          className="flex w-full items-center justify-center rounded-sm border border-primary/30 bg-primary/10 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                        >
                          Masukkan Sisa ke Stok
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenDetail(item.id)}
                      className="flex w-full items-center justify-center rounded-sm bg-surface-container py-2.5 text-xs font-semibold tabular-nums text-foreground transition-colors hover:bg-surface-container-high"
                    >
                      Lihat Pemesan ({item._count?.preOrders || 0} florist)
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            ariaLabel="Navigasi halaman jadwal panen"
          />
        </div>
      )}

      {/* Modal Buat Pengumuman Panen Baru */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmittingAdd && setIsAddModalOpen(false)}
        headerVariant="dark"
        kicker="Jadwal Panen"
        title="Buat Jadwal Panen Baru"
        size="md"
        footer={
          <>
            <button
              type="button"
              disabled={isSubmittingAdd}
              onClick={() => setIsAddModalOpen(false)}
              className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              form="add-harvest-form"
              disabled={isSubmittingAdd}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmittingAdd && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              <span>Publikasikan Jadwal</span>
            </button>
          </>
        }
      >
        {addError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-error/30 bg-error/5 p-3.5 text-sm text-error"
          >
            {addError}
          </div>
        )}
        <form id="add-harvest-form" onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label
              htmlFor="add-harvest-name"
              className="block text-sm font-medium text-foreground"
            >
              Nama Bunga <span className="text-error" aria-hidden="true">*</span>
            </label>
            <input
              id="add-harvest-name"
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
            <label
              htmlFor="add-harvest-variety"
              className="block text-sm font-medium text-foreground"
            >
              Varietas / Warna
            </label>
            <input
              id="add-harvest-variety"
              type="text"
              placeholder="Contoh: Putih Salju / Kuning Emas"
              value={addForm.variety || ""}
              onChange={(e) =>
                setAddForm((prev) => ({ ...prev, variety: e.target.value }))
              }
              className="input-field mt-1.5 w-full"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="add-harvest-qty"
                className="block text-sm font-medium text-foreground"
              >
                Estimasi Panen (tangkai){" "}
                <span className="text-error" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="add-harvest-qty"
                type="number"
                inputMode="numeric"
                min="1"
                required
                value={addForm.estimatedQuantity}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    estimatedQuantity: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="input-field mt-1.5 w-full tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="add-harvest-price"
                className="block text-sm font-medium text-foreground"
              >
                Harga per Tangkai (Rp){" "}
                <span className="text-error" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="add-harvest-price"
                type="number"
                inputMode="numeric"
                min="0"
                step="500"
                required
                value={addForm.pricePerUnit}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    pricePerUnit: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="input-field mt-1.5 w-full tabular-nums"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="add-harvest-date"
              className="block text-sm font-medium text-foreground"
            >
              Tanggal Panen{" "}
              <span className="text-error" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="add-harvest-date"
              type="date"
              required
              min={minHarvestDate}
              value={addForm.harvestDate}
              onChange={(e) =>
                setAddForm((prev) => ({
                  ...prev,
                  harvestDate: e.target.value,
                }))
              }
              className="input-field mt-1.5 w-full tabular-nums"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Minimal 4 hari dari sekarang agar florist sempat melunasi DP.
            </p>
          </div>
          <div>
            <label
              htmlFor="add-harvest-location"
              className="block text-sm font-medium text-foreground"
            >
              Lokasi Kebun
            </label>
            <input
              id="add-harvest-location"
              type="text"
              placeholder="Contoh: Batu, Malang / Pasuruan, Jawa Timur"
              value={addForm.location || ""}
              onChange={(e) =>
                setAddForm((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              className="input-field mt-1.5 w-full"
            />
          </div>
          <div>
            <label
              htmlFor="add-harvest-desc"
              className="block text-sm font-medium text-foreground"
            >
              Catatan / Deskripsi Panen{" "}
              <span className="font-normal text-muted-foreground">
                (opsional)
              </span>
            </label>
            <textarea
              id="add-harvest-desc"
              rows={2}
              placeholder="Contoh: Kualitas grade A batang panjang 60cm (minimal 10 karakter bila diisi)"
              value={addForm.description || ""}
              onChange={(e) =>
                setAddForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="input-field mt-1.5 w-full"
            />
          </div>
        </form>
      </Modal>

      {/* Modal Edit Jadwal Panen */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => !isSubmittingEdit && setEditingItem(null)}
        headerVariant="dark"
        kicker="Jadwal Panen"
        title="Ubah Jadwal Panen"
        subtitle={editingItem ? editingItem.flowerName : undefined}
        size="md"
        footer={
          editingItem ? (
            <>
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={() => setEditingItem(null)}
                className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                form="edit-harvest-form"
                disabled={isSubmittingEdit}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmittingEdit && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                <span>Simpan Perubahan</span>
              </button>
            </>
          ) : undefined
        }
      >
        {editingItem && (
          <div className="space-y-4">
            {editError && (
              <div
                role="alert"
                className="rounded-md border border-error/30 bg-error/5 p-3.5 text-sm text-error"
              >
                {editError}
              </div>
            )}
            {editingHasPreOrders && (
              <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
                Harga dan tanggal panen terkunci karena sudah ada pre-order
                masuk.
              </p>
            )}
            <form id="edit-harvest-form" onSubmit={handleUpdateAnnouncement} className="space-y-4">
              <div>
                <label
                  htmlFor="edit-harvest-name"
                  className="block text-sm font-medium text-foreground"
                >
                  Nama Bunga <span className="text-error" aria-hidden="true">*</span>
                </label>
                <input
                  id="edit-harvest-name"
                  type="text"
                  required
                  value={editForm.flowerName}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      flowerName: e.target.value,
                    }))
                  }
                  className="input-field mt-1.5 w-full"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-harvest-variety"
                  className="block text-sm font-medium text-foreground"
                >
                  Varietas / Warna
                </label>
                <input
                  id="edit-harvest-variety"
                  type="text"
                  value={editForm.variety}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      variety: e.target.value,
                    }))
                  }
                  className="input-field mt-1.5 w-full"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-harvest-qty"
                    className="block text-sm font-medium text-foreground"
                  >
                    Estimasi Panen (tangkai){" "}
                    <span className="text-error" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="edit-harvest-qty"
                    type="number"
                    inputMode="numeric"
                    min={Math.max(1, editingMinReserved)}
                    required
                    value={editForm.estimatedQuantity}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        estimatedQuantity: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="input-field mt-1.5 w-full tabular-nums"
                  />
                  {editingMinReserved > 0 && (
                    <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
                      Minimal {editingMinReserved.toLocaleString("id-ID")} tangkai (sudah dipesan).
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="edit-harvest-price"
                    className="block text-sm font-medium text-foreground"
                  >
                    Harga per Tangkai (Rp)
                  </label>
                  <input
                    id="edit-harvest-price"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="500"
                    disabled={editingHasPreOrders}
                    value={editForm.pricePerUnit}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        pricePerUnit: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="input-field mt-1.5 w-full tabular-nums disabled:opacity-60"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="edit-harvest-date"
                  className="block text-sm font-medium text-foreground"
                >
                  Tanggal Panen
                </label>
                <input
                  id="edit-harvest-date"
                  type="date"
                  disabled={editingHasPreOrders}
                  value={editForm.harvestDate}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      harvestDate: e.target.value,
                    }))
                  }
                  className="input-field mt-1.5 w-full tabular-nums disabled:opacity-60"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-harvest-location"
                  className="block text-sm font-medium text-foreground"
                >
                  Lokasi Kebun
                </label>
                <input
                  id="edit-harvest-location"
                  type="text"
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="input-field mt-1.5 w-full"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-harvest-desc"
                  className="block text-sm font-medium text-foreground"
                >
                  Catatan / Deskripsi Panen{" "}
                  <span className="font-normal text-muted-foreground">
                    (opsional)
                  </span>
                </label>
                <textarea
                  id="edit-harvest-desc"
                  rows={2}
                  placeholder="Minimal 10 karakter jika diisi"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="input-field mt-1.5 w-full"
                />
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2.5">
                  <input
                    id="edit-harvest-active"
                    type="checkbox"
                    disabled={Boolean(editingItem.transferredAt)}
                    checked={editForm.isActive}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border accent-primary disabled:opacity-60"
                  />
                  <label
                    htmlFor="edit-harvest-active"
                    className="cursor-pointer text-sm font-medium text-foreground"
                  >
                    Aktif — buka untuk pre-order florist
                  </label>
                </div>
                {editingItem.transferredAt && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Jadwal sudah ditutup karena sisa panen telah dipindahkan ke
                    katalog stok biasa.
                  </p>
                )}
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Modal Detail & Daftar Pre-Order Florist */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        headerVariant="dark"
        kicker="Pesanan Pre-Order"
        title="Daftar Pre-Order Florist"
        subtitle={
          selectedAnnouncement
            ? `${selectedAnnouncement.flowerName} (${selectedAnnouncement.variety || "Standar"}) • Panen: ${formatDate(selectedAnnouncement.harvestDate)}`
            : undefined
        }
        size="md"
        footer={
          <button
            type="button"
            onClick={() => setIsDetailModalOpen(false)}
            className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low"
          >
            Tutup
          </button>
        }
      >
        <div className="space-y-4">
          {detailError && (
            <div
              role="alert"
              className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error"
            >
              {detailError}
            </div>
          )}
          {isLoadingDetail ? (
            <div className="flex justify-center py-12">
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
                    className="space-y-3 rounded-xl border border-border bg-surface-container-low/40 p-4 transition-colors hover:border-primary/40"
                  >
                    {/* Baris 1: Header Florist & Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {order.florist.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dipesan:{" "}
                          <time dateTime={order.createdAt} className="tabular-nums">
                            {formatDate(order.createdAt)}
                          </time>
                        </p>
                      </div>
                      {order.biteshipOrderId ? (
                        <SupplierDeliveryStatus status={order.status} booked={true} />
                      ) : (
                        <StatusBadge
                          status={order.status}
                          variant="preorder"
                          size="sm"
                        />
                      )}
                    </div>

                    {/* Baris 2: Kartu Rincian Finansial & Bunga */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-surface p-2.5">
                        <span className="block text-[11px] text-muted-foreground">
                          Jumlah Bunga
                        </span>
                        <span className="text-sm font-bold tabular-nums text-foreground">
                          {order.quantity.toLocaleString("id-ID")} tangkai
                        </span>
                      </div>

                      <div className="rounded-lg border border-border bg-surface p-2.5">
                        <span className="block text-[11px] text-muted-foreground">
                          Total Tagihan
                        </span>
                        <span className="text-sm font-bold tabular-nums text-foreground">
                          {formatRupiah(order.totalPrice)}
                        </span>
                      </div>

                      <div className="col-span-2 rounded-lg border border-border bg-surface p-2.5 sm:col-span-1">
                        <span className="block text-[11px] text-muted-foreground">
                          Skema DP 50%
                        </span>
                        <div className="mt-0.5 flex items-center justify-between gap-1">
                          <span className="font-semibold tabular-nums text-foreground">
                            {formatRupiah(
                              order.depositAmount ||
                                Math.round(order.totalPrice * 0.5),
                            )}
                          </span>
                          {order.status === "CONFIRMED" &&
                            order.depositDeadline && (
                              <span className="rounded border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-[10px] tabular-nums text-warning">
                                Batas: {formatDate(order.depositDeadline)}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Catatan florist jika ada */}
                    {order.notes && (
                      <p className="rounded-lg border border-border bg-surface p-2 text-xs italic text-muted-foreground">
                        Catatan florist: &ldquo;{order.notes}&rdquo;
                      </p>
                    )}

                    {/* Alasan batal jika ada */}
                    {order.cancelReason && (
                      <p className="rounded-lg border border-error/25 bg-error/5 p-2 text-xs text-error">
                        Alasan pembatalan: {order.cancelReason}
                      </p>
                    )}

                    {order.status === "DEPOSIT_PAID" && order.finalDeadline && (
                      <p className="text-xs tabular-nums text-warning">
                        Batas pelunasan: {formatDate(order.finalDeadline)}
                      </p>
                    )}

                    {/* Baris 3: Area Aksi dan Informasi Pengiriman */}
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-2">
                      {order.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() =>
                              handleUpdatePreOrder(order.id, "CONFIRMED")
                            }
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-sm bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                          >
                            {isActionLoading && (
                              <Loader2
                                className="h-3.5 w-3.5 animate-spin"
                                aria-hidden="true"
                              />
                            )}
                            <span>Konfirmasi (DP 50%)</span>
                          </button>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() =>
                              handleUpdatePreOrder(order.id, "CANCELLED")
                            }
                            className="inline-flex min-h-9 items-center justify-center rounded-sm border border-error/30 bg-error/5 px-3.5 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error/10 disabled:opacity-50"
                          >
                            Tolak
                          </button>
                        </>
                      )}

                      {order.status === "CONFIRMED" && (
                        <span className="rounded-sm border border-warning/25 bg-warning/10 px-3 py-1.5 text-xs font-medium tabular-nums text-warning">
                          Menunggu DP 50% • Batas:{" "}
                          {order.depositDeadline
                            ? formatDate(order.depositDeadline)
                            : "belum ditentukan"}
                        </span>
                      )}

                      {order.status === "DEPOSIT_PAID" && (
                        <span className="rounded-sm border border-info/25 bg-info/10 px-3 py-1.5 text-xs font-medium tabular-nums text-info">
                          DP Diterima • Batas pelunasan:{" "}
                          {order.finalDeadline
                            ? formatDate(order.finalDeadline)
                            : "saat panen"}
                        </span>
                      )}

                      {order.status === "PAID" && !order.biteshipOrderId && (
                        <Link
                          href="/supplier/shipments"
                          className="inline-flex min-h-9 items-center justify-center rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          Atur Pengiriman
                        </Link>
                      )}

                      {order.biteshipOrderId && (
                        <div className="flex w-full flex-wrap items-center justify-between gap-2">
                          <SupplierDeliveryStatus
                            status={order.status}
                            booked={true}
                            courier={order.courier}
                            trackingNumber={order.trackingNumber}
                            bookedAt={order.shippedAt}
                            deliveredAt={order.deliveredAt}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const ord = order;
                                setIsDetailModalOpen(false);
                                setTrackingPreOrder(ord);
                              }}
                              className="inline-flex min-h-9 items-center justify-center rounded-sm border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                            >
                              Lacak Pengiriman
                            </button>
                            <a
                              href={`/api/supplier/shipments/${order.id}/label`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-9 items-center justify-center rounded-sm border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container"
                            >
                              Label
                            </a>
                          </div>
                        </div>
                      )}

                      {order.status === "DELIVERED" && !order.biteshipOrderId && (
                        <div className="rounded-sm border border-success/20 bg-success/10 px-3 py-1.5 text-xs text-success">
                          <span className="tabular-nums">
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
            void submitPreOrderUpdate(
              pendingCancelPreOrderId,
              "CANCELLED",
              reason,
            );
          }
        }}
        title="Tolak Pre-Order Florist"
        description="Masukkan alasan pembatalan pre-order florist agar florist mendapat penjelasan yang jelas."
        confirmLabel="Tolak Pre-Order"
        variant="danger"
        loading={Boolean(actionLoadingId)}
        inputConfig={{
          label: "Alasan pembatalan (minimal 10 karakter)",
          placeholder:
            "Contoh: Hasil panen terdampak hujan lebat sehingga kuota berkurang.",
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
            ? `Jadwal panen "${pendingDeleteAnnouncement.name}" yang belum dipesan florist akan dihapus permanen.`
            : ""
        }
        confirmLabel="Hapus Jadwal"
        variant="danger"
        loading={Boolean(deletingId)}
      />

      {/* MODAL TRANSFER SISA PANEN KE STOK BIASA (QC SUPPLIER) */}
      <Modal
        isOpen={Boolean(transferringItem)}
        onClose={() => !isTransferring && setTransferringItem(null)}
        headerVariant="dark"
        kicker="QC & Gabung Stok"
        title="Masukkan Sisa Panen ke Stok Biasa"
        subtitle={
          transferringItem
            ? `${transferringItem.flowerName} · Varietas ${transferringItem.variety || "Standar"}`
            : undefined
        }
        size="md"
        footer={
          transferringItem ? (
            <>
              <button
                type="button"
                disabled={isTransferring}
                onClick={() => setTransferringItem(null)}
                className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                form="transfer-harvest-form"
                disabled={isTransferring}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isTransferring && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                <span>Masukkan ke Stok Biasa</span>
              </button>
            </>
          ) : undefined
        }
      >
        {transferringItem && (
          <div className="space-y-5">
            {transferError && (
              <div
                role="alert"
                className="rounded-md border border-error/30 bg-error/5 p-3.5 text-sm text-error"
              >
                {transferError}
              </div>
            )}

            <div className="overflow-hidden rounded-md border border-border bg-surface-container-low">
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-3.5 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Estimasi Panen
                  </p>
                  <p className="mt-1 text-base font-bold tabular-nums text-foreground">
                    {transferringItem.estimatedQuantity.toLocaleString("id-ID")}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      tangkai
                    </span>
                  </p>
                </div>
                <div className="px-3.5 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Dipesan Pre-Order
                  </p>
                  <p className="mt-1 text-base font-bold tabular-nums text-foreground">
                    {(transferringItem.totalReservedQuantity ?? 0).toLocaleString(
                      "id-ID",
                    )}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      tangkai
                    </span>
                  </p>
                </div>
                <div className="bg-primary/5 px-3.5 py-3">
                  <p className="text-xs font-medium text-foreground">
                    Sisa Tersedia
                  </p>
                  <p className="mt-1 text-base font-bold tabular-nums text-primary">
                    {transferMaxQty.toLocaleString("id-ID")}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      tangkai
                    </span>
                  </p>
                </div>
              </div>
              <p className="border-t border-border px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
                Sisa layak jual digabung ke Katalog Stok Biasa agar tersedia di
                Pasokan Kebun florist, dan jadwal pre-order ini otomatis ditutup.
              </p>
            </div>

            <form
              id="transfer-harvest-form"
              onSubmit={handleTransferToStock}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="transfer-qc-qty"
                    className="block text-sm font-medium text-foreground"
                  >
                    Jumlah Layak Jual (QC){" "}
                    <span className="text-error" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="transfer-qc-qty"
                      name="quantity"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={transferMaxQty}
                      required
                      aria-describedby="transfer-qc-qty-hint"
                      value={transferQty}
                      onChange={(e) => setTransferQty(e.target.value)}
                      className="input-field pr-16 tabular-nums"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      tangkai
                    </span>
                  </div>
                  <p
                    id="transfer-qc-qty-hint"
                    className={`mt-1.5 text-xs leading-relaxed tabular-nums ${
                      parsedTransferQty !== null &&
                      parsedTransferQty >= 1 &&
                      parsedTransferQty < transferMaxQty
                        ? "font-medium text-warning"
                        : "text-muted-foreground"
                    }`}
                  >
                    {parsedTransferQty !== null &&
                    parsedTransferQty >= 1 &&
                    parsedTransferQty < transferMaxQty
                      ? `${(transferMaxQty - parsedTransferQty).toLocaleString("id-ID")} tangkai disisihkan (rusak / tidak lolos QC).`
                      : parsedTransferQty === transferMaxQty
                        ? "Seluruh sisa kuota lolos QC dan siap digabung."
                        : `Maksimal ${transferMaxQty.toLocaleString("id-ID")} tangkai.`}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="transfer-qc-price"
                    className="block text-sm font-medium text-foreground"
                  >
                    Harga Jual per Tangkai{" "}
                    <span className="text-error" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      Rp
                    </span>
                    <input
                      id="transfer-qc-price"
                      name="pricePerUnit"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={500}
                      required
                      aria-describedby="transfer-qc-price-hint"
                      value={transferPrice}
                      onChange={(e) => setTransferPrice(e.target.value)}
                      className="input-field pl-10 tabular-nums"
                    />
                  </div>
                  <p
                    id="transfer-qc-price-hint"
                    className="mt-1.5 text-xs leading-relaxed tabular-nums text-muted-foreground"
                  >
                    {parsedTransferPrice !== null && parsedTransferPrice >= 0
                      ? `${formatRupiah(parsedTransferPrice)} / tangkai`
                      : "Masukkan harga jual per tangkai."}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="transfer-qc-notes"
                  className="block text-sm font-medium text-foreground"
                >
                  Catatan QC{" "}
                  <span className="font-normal text-muted-foreground">
                    (opsional)
                  </span>
                </label>
                <textarea
                  id="transfer-qc-notes"
                  name="qcNotes"
                  rows={2}
                  maxLength={500}
                  placeholder="Contoh: 15 tangkai layu/patah saat panen, sisanya grade A."
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="input-field mt-1.5 w-full"
                />
              </div>
            </form>
          </div>
        )}
      </Modal>

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
            void fetchAnnouncements(true);
          }}
        />
      )}
    </div>
  );
}
