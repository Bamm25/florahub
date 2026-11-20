"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Edit, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  ConfirmDialog,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Pagination,
  SearchInput,
} from "@/components/ui";
import Modal from "@/components/forms/Modal";
import {
  getFloristRawMaterials,
  createFloristRawMaterial,
  updateFloristRawMaterial,
  deleteFloristRawMaterial,
  type RawMaterialItem,
  type RawMaterialStats,
} from "@/lib/api/florist";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";
import { PRODUCT_LOW_STOCK_THRESHOLD } from "@/lib/config/domain";
import { formatRupiah } from "@/lib/utils/formatters";

interface FinishedProduct {
  id: string;
  name: string;
  stock: number;
  price: number;
  isActive: boolean;
}

const LOW_STOCK_THRESHOLD = PRODUCT_LOW_STOCK_THRESHOLD;

const CATEGORY_OPTIONS = [
  "ALL",
  "Bunga Segar",
  "Mawar",
  "Tulip",
  "Lily",
  "Krisan",
  "Anyelir",
  "Filler Segar",
];

const QUICK_PRESETS = [
  { name: "Mawar Merah Semi Holland", category: "Bunga Segar", unit: "tangkai", price: 8000 },
  { name: "Mawar Putih Avalon", category: "Bunga Segar", unit: "tangkai", price: 8500 },
  { name: "Mawar Pink Sweet Avalanche", category: "Bunga Segar", unit: "tangkai", price: 9000 },
  { name: "Tulip Import Holland", category: "Bunga Segar", unit: "tangkai", price: 25000 },
  { name: "Lily Casablanca Putih", category: "Bunga Segar", unit: "tangkai", price: 30000 },
  { name: "Krisan Spray Putih", category: "Bunga Segar", unit: "tangkai", price: 6000 },
  { name: "Anyelir / Carnation Merah", category: "Bunga Segar", unit: "tangkai", price: 7500 },
  { name: "Baby's Breath Segar", category: "Bunga Segar", unit: "tangkai", price: 12000 },
];

export default function RawMaterialsPage() {
  const { status: authStatus } = useSession();

  const [rawMaterials, setRawMaterials] = useState<RawMaterialItem[]>([]);
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [stats, setStats] = useState<RawMaterialStats>({
    totalItems: 0,
    totalStock: 0,
    lowStockCount: 0,
    usedInBOMCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const MATERIALS_PER_PAGE = 10;

  // Modal Tambah Bahan Baku Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    category: "Bunga Segar",
    quantity: "50",
    unit: "tangkai",
    pricePerUnit: "10000",
    minThreshold: "10",
    location: "Gudang / Storage Florist",
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  // Modal Sesuaikan Stok
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedForAdjust, setSelectedForAdjust] = useState<RawMaterialItem | null>(null);
  const [adjustType, setAdjustType] = useState<"ADD" | "SUBTRACT">("ADD");
  const [adjustAmount, setAdjustAmount] = useState("10");
  const [adjustReason, setAdjustReason] = useState("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Modal Edit Detail
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<RawMaterialItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    unit: "",
    pricePerUnit: "",
    minThreshold: "",
    location: "",
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Modal Info BOM & Non-blocking Feedback/Confirm Dialog State
  const [selectedBOMInfo, setSelectedBOMInfo] = useState<RawMaterialItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [pendingDeleteMaterial, setPendingDeleteMaterial] = useState<RawMaterialItem | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  const fetchInventoryData = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const [rawRes, data] = await Promise.all([
          getFloristRawMaterials(
            {
              search: searchQuery || undefined,
              category: categoryFilter,
            },
            signal,
          ),
          fetchPaginatedCollection<FinishedProduct>("/api/florist/products", "products").catch(() => [] as FinishedProduct[]),
        ]);

        if (!signal?.aborted) {
          setRawMaterials(rawRes.rawMaterials || []);
          setStats(
            rawRes.stats || {
              totalItems: 0,
              totalStock: 0,
              lowStockCount: 0,
              usedInBOMCount: 0,
            },
          );
          setProducts(data);
        }
      } catch (err) {
        if (
          signal?.aborted ||
          (err instanceof Error && err.name === "AbortError")
        ) {
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat data";
        setError(message);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [searchQuery, categoryFilter],
  );

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchInventoryData(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [authStatus, fetchInventoryData]);

  // Handle pembuatan bahan baku baru
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddErrors({});

    if (!addForm.name.trim()) {
      setAddErrors({ name: "Nama bahan baku wajib diisi" });
      return;
    }

    const qty = parseInt(addForm.quantity, 10);
    const price = parseInt(addForm.pricePerUnit, 10);
    const minThresh = parseInt(addForm.minThreshold, 10);

    if (isNaN(qty) || qty < 0) {
      setAddErrors({ quantity: "Jumlah stok awal tidak valid" });
      return;
    }
    if (isNaN(price) || price < 0) {
      setAddErrors({ pricePerUnit: "Harga modal per unit tidak valid" });
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await createFloristRawMaterial({
        name: addForm.name.trim(),
        category: addForm.category.trim(),
        variety: addForm.category.trim(),
        quantity: qty,
        unit: addForm.unit.trim().toLowerCase(),
        pricePerUnit: price,
        minThreshold: isNaN(minThresh) ? 10 : minThresh,
        location: addForm.location.trim() || null,
      });

      setIsAddModalOpen(false);
      setAddForm({
        name: "",
        category: "Bunga Segar",
        quantity: "50",
        unit: "tangkai",
        pricePerUnit: "10000",
        minThreshold: "10",
        location: "Gudang / Storage Florist",
      });
      await fetchInventoryData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan bahan baku";
      setAddErrors({ submit: message });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle penyesuaian stok mandiri / pengurangan stok supplier
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForAdjust) return;

    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setAdjustError("Masukkan jumlah lebih dari 0.");
      return;
    }

    const isSupplierSourced = !selectedForAdjust.isSelfSupplied;
    const effectiveType: "ADD" | "SUBTRACT" = isSupplierSourced
      ? "SUBTRACT"
      : adjustType;
    const unitLabel = selectedForAdjust.unit || "tangkai";

    if (effectiveType === "SUBTRACT" && amount > selectedForAdjust.quantity) {
      setAdjustError(
        `Jumlah pengurangan harus antara 1 sampai ${selectedForAdjust.quantity} ${unitLabel}.`
      );
      return;
    }

    setIsSubmittingAdjust(true);
    setAdjustError(null);
    try {
      await updateFloristRawMaterial(selectedForAdjust.id, {
        action: "ADJUST_STOCK",
        adjustmentType: effectiveType,
        amount,
        reason:
          adjustReason.trim() ||
          (effectiveType === "ADD"
            ? "Penambahan stok mandiri"
            : "Pengurangan stok bunga layu/rusak"),
      });

      setIsAdjustModalOpen(false);
      setSelectedForAdjust(null);
      setAdjustReason("");
      await fetchInventoryData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memperbarui stok";
      setAdjustError(message);
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Handle edit metadata bahan baku
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForEdit) return;

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      await updateFloristRawMaterial(selectedForEdit.id, {
        action: "UPDATE_DETAILS",
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        unit: editForm.unit.trim().toLowerCase(),
        pricePerUnit: parseInt(editForm.pricePerUnit, 10) || 0,
        minThreshold: parseInt(editForm.minThreshold, 10) || 10,
        location: editForm.location.trim() || null,
      });

      setIsEditModalOpen(false);
      setSelectedForEdit(null);
      await fetchInventoryData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan perubahan";
      setEditError(message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle hapus bahan baku
  const handleDelete = (material: RawMaterialItem) => {
    setActionError(null);
    if (material.usedInBOMCount > 0) {
      const names = material.usedInProducts.map((p) => p.name).join(", ");
      setActionError(
        `Bahan baku "${material.name}" tidak dapat dihapus karena masih digunakan pada BOM produk: ${names}. Hapus komponen dari produk terlebih dahulu.`
      );
      return;
    }

    setPendingDeleteMaterial(material);
  };

  const handleConfirmDeleteMaterial = async () => {
    if (!pendingDeleteMaterial) return;
    setIsDeletingMaterial(true);
    setActionError(null);
    try {
      await deleteFloristRawMaterial(pendingDeleteMaterial.id);
      setPendingDeleteMaterial(null);
      await fetchInventoryData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus bahan baku";
      setActionError(message);
      setPendingDeleteMaterial(null);
    } finally {
      setIsDeletingMaterial(false);
    }
  };

  const openAdjustModal = (material: RawMaterialItem) => {
    setSelectedForAdjust(material);
    if (material.isSelfSupplied) {
      setAdjustType("ADD");
      setAdjustAmount("10");
    } else {
      setAdjustType("SUBTRACT");
      setAdjustAmount(material.quantity > 0 ? "1" : "0");
    }
    setAdjustReason("");
    setAdjustError(null);
    setIsAdjustModalOpen(true);
  };

  const openEditModal = (material: RawMaterialItem) => {
    setSelectedForEdit(material);
    setEditForm({
      name: material.name,
      category: material.category,
      unit: material.unit,
      pricePerUnit: material.pricePerUnit.toString(),
      minThreshold: material.minThreshold.toString(),
      location: material.location === "-" ? "" : material.location,
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const applyPreset = (preset: (typeof QUICK_PRESETS)[0]) => {
    setAddForm((prev) => ({
      ...prev,
      name: preset.name,
      category: preset.category,
      unit: preset.unit,
      pricePerUnit: preset.price.toString(),
    }));
  };

  const lowStockFinishedProducts = products.filter(
    (product) => product.stock <= LOW_STOCK_THRESHOLD,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Header Halaman */}
      <section className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Operasional & Bahan Baku
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Inventori Bunga Segar
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Pantau ketersediaan stok bunga potong, kelola bahan baku mandiri, dan integrasikan dengan perakitan buket produk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Link
            href="/florist/products"
            className="inline-flex min-h-11 items-center justify-center rounded-sm border border-white/20 bg-white/5 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10"
          >
            Produk Jadi &amp; BOM
          </Link>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tambah Bahan Baku
          </button>
        </div>
      </section>

      {/* Ringkasan stok */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Jenis bunga", value: stats.totalItems, sub: "Varian terdaftar" },
          { label: "Stok fisik", value: stats.totalStock, unit: "tangkai", sub: "Siap dirangkai" },
          { label: "Di bawah batas minimum", value: stats.lowStockCount, attention: true, sub: "Perlu restock" },
          { label: "Terhubung ke BOM", value: stats.usedInBOMCount, sub: "Dipakai di buket" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
            <p className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${item.attention && item.value > 0 ? "text-warning" : "text-foreground"}`}>
              {item.value.toLocaleString("id-ID")} {item.unit && <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Ringkasan Stok Produk Jadi */}
      {products.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Ringkasan Stok Produk Jadi
              </h2>
              <p className="text-xs text-muted-foreground">
                {lowStockFinishedProducts.length > 0
                  ? `${lowStockFinishedProducts.length} produk jadi perlu dirakit (stok ≤ ${LOW_STOCK_THRESHOLD} unit).`
                  : `Seluruh ${products.length} produk jadi siap jual.`}
              </p>
            </div>
            <Link
              href="/florist/products"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Kelola Stok Produk →
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {products.slice(0, 6).map((product) => {
              const isLow = product.stock <= LOW_STOCK_THRESHOLD;
              return (
                <Link
                  key={product.id}
                  href="/florist/products"
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                    isLow
                      ? "border-warning/30 bg-warning/10 text-warning"
                      : "border-border bg-surface-container-low text-foreground hover:border-primary/40"
                  }`}
                >
                  <span className="font-medium truncate max-w-44">{product.name}</span>
                  <span className="font-mono font-bold">{product.stock} unit</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
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

      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Daftar Bahan Baku</h2>
            <p className="text-xs text-muted-foreground">Cari dan sesuaikan stok sebelum merakit produk buket.</p>
          </div>
          <div className="w-full sm:w-80">
            <SearchInput
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                setCurrentPage(1);
              }}
              placeholder="Cari mawar, tulip, pita, kertas..."
            />
          </div>
        </div>
        <div
          role="group"
          aria-label="Filter kategori bahan baku"
          className="mt-3 flex w-full items-center gap-2 overflow-x-auto border-t border-border pt-3"
        >
          <span className="mr-1 shrink-0 text-xs font-medium text-muted-foreground">
            Kategori:
          </span>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={categoryFilter === cat}
              onClick={() => {
                setCategoryFilter(cat);
                setCurrentPage(1);
              }}
              className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                categoryFilter === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {cat === "ALL" ? "Semua Kategori" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Bahan Baku */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {isLoading ? (
          <LoadingSpinner message="Memuat data bahan baku..." />
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title="Gagal Memuat Bahan Baku"
              error={error}
              onRetry={() => void fetchInventoryData()}
            />
          </div>
        ) : rawMaterials.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={searchQuery || categoryFilter !== "ALL" ? "Tidak ada bahan yang sesuai" : "Belum Ada Bahan Baku"}
              description={
                searchQuery || categoryFilter !== "ALL"
                  ? "Coba ubah kata kunci atau kategori untuk melihat stok lainnya."
                  : "Tambahkan stok bunga segar, daun, atau material wrapping agar siap dirangkai menjadi produk buket."
              }
              action={
                !(searchQuery || categoryFilter !== "ALL")
                  ? {
                      label: "Tambah Bahan Baku Pertama",
                      onClick: () => setIsAddModalOpen(true),
                    }
                  : undefined
              }
            />
          </div>
        ) : (() => {
          const totalMaterialPages = Math.max(
            1,
            Math.ceil(rawMaterials.length / MATERIALS_PER_PAGE),
          );
          const safeMaterialPage = Math.min(currentPage, totalMaterialPages);
          const materialStart = (safeMaterialPage - 1) * MATERIALS_PER_PAGE;
          const paginatedMaterials = rawMaterials.slice(
            materialStart,
            materialStart + MATERIALS_PER_PAGE,
          );

          return (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-180 text-left text-sm">
                  <thead className="border-b border-border bg-surface-container-low/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">
                        Nama Bahan Baku
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Kategori
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-center">
                        Sumber
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Stok Fisik
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Harga Modal
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-center">
                        BOM Buket
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-center">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedMaterials.map((material) => (
                      <tr key={material.id} className="hover:bg-surface-container-low/40 transition-colors">
                        {/* Nama & Lokasi */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-foreground">{material.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Lokasi: {material.location}
                          </p>
                        </td>

                        {/* Kategori */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-low text-muted-foreground border border-border">
                            {material.category}
                          </span>
                        </td>

                        {/* Sumber */}
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              material.isSelfSupplied
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-info/10 text-info border border-info/25"
                            }`}
                          >
                            {material.sourceLabel}
                          </span>
                        </td>

                        {/* Stok & Satuan */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span
                              className={`font-mono text-base font-bold tabular-nums ${
                                material.isOutOfStock
                                  ? "text-error"
                                  : material.isLowStock
                                  ? "text-warning"
                                  : "text-foreground"
                              }`}
                            >
                              {material.quantity}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">{material.unit}</span>
                          </div>
                          {material.isLowStock && (
                            <p className="text-[10px] text-warning font-medium tabular-nums">
                              Batas min: {material.minThreshold}
                            </p>
                          )}
                        </td>

                        {/* Harga Modal */}
                        <td className="px-5 py-4 text-right font-mono text-xs font-semibold text-foreground">
                          {formatRupiah(material.pricePerUnit)} <span className="text-muted-foreground font-normal">/{material.unit}</span>
                        </td>

                        {/* Terhubung di BOM */}
                        <td className="px-5 py-4 text-center">
                          {material.usedInBOMCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedBOMInfo(material)}
                              className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              title="Klik untuk melihat produk yang memakai bahan ini"
                            >
                              {material.usedInBOMCount} Produk
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Belum dipakai</span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openAdjustModal(material)}
                              className="inline-flex items-center px-3 py-1.5 rounded-sm text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                              title={
                                material.isSelfSupplied
                                  ? "Tambah atau kurangi stok mandiri"
                                  : "Catat pengurangan bunga layu / rusak"
                              }
                            >
                              Stok
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(material)}
                              className="p-1.5 text-muted-foreground hover:text-foreground rounded-sm hover:bg-surface-container transition-colors"
                              title="Edit detail bahan baku"
                              aria-label={`Edit ${material.name}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(material)}
                              className="p-1.5 text-error rounded-sm hover:bg-error/10 transition-colors"
                              title="Hapus bahan baku"
                              aria-label={`Hapus ${material.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rawMaterials.length > MATERIALS_PER_PAGE && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3.5 sm:flex-row">
                  <p className="text-xs tabular-nums text-muted-foreground">
                    Menampilkan {materialStart + 1}–
                    {Math.min(materialStart + MATERIALS_PER_PAGE, rawMaterials.length)}{" "}
                    dari {rawMaterials.length} bahan baku
                  </p>
                  <Pagination
                    currentPage={safeMaterialPage}
                    totalPages={totalMaterialPages}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    ariaLabel="Navigasi halaman bahan baku"
                  />
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Modal Tambah Bahan Baku Baru */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmittingAdd && setIsAddModalOpen(false)}
        size="md"
        headerVariant="dark"
        kicker="Input Mandiri"
        title="Tambah Bahan Baku Florist"
        subtitle="Bunga potong segar atau material wrapping untuk BOM produk buket."
      >
        {/* Pilihan Cepat Preset Bunga & Material */}
        <div className="mb-5 p-3 rounded-xl bg-surface-container-low border border-border">
          <p className="text-xs font-medium text-foreground mb-2">
            Pilihan Cepat (Klik untuk mengisi otomatis):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="text-[11px] px-2.5 py-1 rounded-sm bg-surface border border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors text-left"
              >
                + {preset.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-4">
          {addErrors.submit && (
            <div role="alert" className="p-3 bg-error/10 border border-error/30 text-error text-xs rounded-xl">
              {addErrors.submit}
            </div>
          )}

          {/* Nama Bahan Baku */}
          <div>
            <label
              htmlFor="add-material-name"
              className="mb-1 block text-xs font-medium text-foreground"
            >
              Nama Bahan Baku / Bunga <span className="text-error">*</span>
            </label>
            <input
              id="add-material-name"
              type="text"
              placeholder="Contoh: Bunga Tulip Merah Import"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="input-field w-full text-sm"
              required
            />
            {addErrors.name && (
              <p className="mt-1 text-xs text-error">{addErrors.name}</p>
            )}
          </div>

          {/* Kategori & Satuan */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="add-material-category"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Kategori <span className="text-error">*</span>
              </label>
              <select
                id="add-material-category"
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                className="input-field w-full text-sm"
              >
                <option value="Bunga Segar">Bunga Segar (Umum)</option>
                <option value="Mawar">Mawar</option>
                <option value="Tulip">Tulip</option>
                <option value="Lily">Lily</option>
                <option value="Krisan">Krisan</option>
                <option value="Anyelir">Anyelir / Carnation</option>
                <option value="Daun & Filler Segar">Daun & Filler Segar</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="add-material-unit"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Satuan Penggunaan <span className="text-error">*</span>
              </label>
              <input
                id="add-material-unit"
                type="text"
                value="tangkai"
                readOnly
                className="input-field w-full cursor-not-allowed bg-surface-container-low font-mono text-sm text-foreground"
                title="Satuan baku inventori bunga Florahub adalah tangkai"
              />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Standar baku bunga: tangkai
              </p>
            </div>
          </div>

          {/* Stok Awal & Harga Modal */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="add-material-qty"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Stok Awal Fisik ({addForm.unit || "tangkai"}) <span className="text-error">*</span>
              </label>
              <input
                id="add-material-qty"
                type="number"
                min="0"
                placeholder="Contoh: 50"
                value={addForm.quantity}
                onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                className="input-field w-full font-mono text-sm tabular-nums"
                required
              />
              {addErrors.quantity && (
                <p className="mt-1 text-xs text-error">{addErrors.quantity}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="add-material-price"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Harga Modal Beli / {addForm.unit || "tangkai"} (Rp) <span className="text-error">*</span>
              </label>
              <input
                id="add-material-price"
                type="number"
                min="0"
                placeholder="Contoh: 15000"
                value={addForm.pricePerUnit}
                onChange={(e) => setAddForm({ ...addForm, pricePerUnit: e.target.value })}
                className="input-field w-full font-mono text-sm tabular-nums"
                required
              />
            </div>
          </div>

          {/* Minimal Threshold & Lokasi Penyimpanan */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="add-material-threshold"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Batas Peringatan Stok Minimum
              </label>
              <input
                id="add-material-threshold"
                type="number"
                min="0"
                value={addForm.minThreshold}
                onChange={(e) => setAddForm({ ...addForm, minThreshold: e.target.value })}
                className="input-field w-full font-mono text-sm tabular-nums"
              />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Sistem memberi tanda peringatan jika stok di bawah angka ini.
              </p>
            </div>

            <div>
              <label
                htmlFor="add-material-location"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Lokasi Penyimpanan
              </label>
              <input
                id="add-material-location"
                type="text"
                placeholder="Contoh: Cold Storage Rak A"
                value={addForm.location}
                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                className="input-field w-full text-sm"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmittingAdd}
              className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingAdd}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-primary hover:bg-primary/90 px-5 py-2 text-xs font-semibold text-primary-foreground transition-colors disabled:opacity-50"
            >
              {isSubmittingAdd && <Loader2 className="w-4 h-4 animate-spin" />}
              Simpan Bahan Baku
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Sesuaikan Stok Mandiri / Kurangi Stok Supplier */}
      <Modal
        isOpen={isAdjustModalOpen && Boolean(selectedForAdjust)}
        onClose={() => !isSubmittingAdjust && setIsAdjustModalOpen(false)}
        size="sm"
        headerVariant="dark"
        kicker={selectedForAdjust?.isSelfSupplied ? "Stok Mandiri" : "Kurangi Stok"}
        title={
          selectedForAdjust
            ? `Sesuaikan Stok: ${selectedForAdjust.name}`
            : "Sesuaikan Stok"
        }
        subtitle={
          selectedForAdjust
            ? `Stok saat ini: ${selectedForAdjust.quantity} ${selectedForAdjust.unit}`
            : undefined
        }
      >
        {selectedForAdjust && (() => {
          const parsedAmount = Number.parseInt(adjustAmount, 10);
          const safeAmount = Number.isNaN(parsedAmount) || parsedAmount < 0 ? 0 : parsedAmount;
          const unitLabel = selectedForAdjust.unit || "tangkai";
          const isSupplierSourced = !selectedForAdjust.isSelfSupplied;
          const effectiveType: "ADD" | "SUBTRACT" = isSupplierSourced
            ? "SUBTRACT"
            : adjustType;
          const projectedQuantity =
            effectiveType === "ADD"
              ? selectedForAdjust.quantity + safeAmount
              : Math.max(0, selectedForAdjust.quantity - safeAmount);
          const exceedsAvailableStock =
            effectiveType === "SUBTRACT" &&
            safeAmount > selectedForAdjust.quantity;
          const isSubmitDisabled =
            safeAmount <= 0 ||
            (effectiveType === "SUBTRACT" &&
              (selectedForAdjust.quantity === 0 || exceedsAvailableStock));

          return (
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              {adjustError && (
                <div role="alert" className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error">
                  {adjustError}
                </div>
              )}

              {isSupplierSourced && (
                <div className="space-y-2.5 rounded-xl border border-info/25 bg-info/5 p-3.5 text-xs text-foreground">
                  <p className="leading-relaxed">
                    Stok dari {selectedForAdjust.sourceLabel} bertambah otomatis saat pesanan diterima.
                    Form ini khusus untuk mencatat bunga layu atau rusak.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <Link
                      href="/florist/supplier-stocks"
                      className="inline-flex min-h-8 items-center rounded-sm border border-primary/30 bg-card px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/5"
                    >
                      Pasokan Kebun
                    </Link>
                    <Link
                      href="/florist/harvest-plans"
                      className="inline-flex min-h-8 items-center rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-surface-container-low"
                    >
                      Rencana Panen
                    </Link>
                  </div>
                </div>
              )}

              {!isSupplierSourced && (
                <div>
                  <p className="mb-1.5 block text-xs font-medium text-foreground">
                    Pilih Aksi
                  </p>
                  <div
                    role="group"
                    aria-label="Jenis penyesuaian stok"
                    className="grid grid-cols-2 gap-2"
                  >
                    <button
                      type="button"
                      aria-pressed={adjustType === "ADD"}
                      onClick={() => {
                        setAdjustType("ADD");
                        setAdjustError(null);
                      }}
                      className={`rounded-lg border py-2 text-xs font-semibold transition-colors ${
                        adjustType === "ADD"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-surface-container-low text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      + Tambah Stok
                    </button>
                    <button
                      type="button"
                      aria-pressed={adjustType === "SUBTRACT"}
                      onClick={() => {
                        setAdjustType("SUBTRACT");
                        setAdjustError(null);
                      }}
                      className={`rounded-lg border py-2 text-xs font-semibold transition-colors ${
                        adjustType === "SUBTRACT"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-surface-container-low text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      - Kurang Stok
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="adjust-material-amount"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  {isSupplierSourced
                    ? `Jumlah layu / rusak (${unitLabel})`
                    : effectiveType === "ADD"
                      ? `Jumlah ditambah (${unitLabel})`
                      : `Jumlah dikurangi (${unitLabel})`}
                </label>
                <input
                  id="adjust-material-amount"
                  type="number"
                  min="1"
                  max={
                    effectiveType === "SUBTRACT"
                      ? selectedForAdjust.quantity
                      : undefined
                  }
                  value={adjustAmount}
                  onChange={(e) => {
                    setAdjustAmount(e.target.value);
                    setAdjustError(null);
                  }}
                  className="input-field w-full font-mono text-sm tabular-nums"
                  required
                />
                <div className="mt-1.5 text-[11px]">
                  {exceedsAvailableStock ? (
                    <span className="font-medium text-error tabular-nums">
                      Melebihi stok tersedia ({selectedForAdjust.quantity} {unitLabel})
                    </span>
                  ) : (
                    <span className="text-muted-foreground tabular-nums">
                      {effectiveType === "ADD" ? "Stok baru:" : "Sisa stok:"}{" "}
                      <strong className="font-mono text-foreground">
                        {projectedQuantity} {unitLabel}
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="adjust-material-reason"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Catatan (opsional)
                </label>
                <input
                  id="adjust-material-reason"
                  type="text"
                  placeholder={
                    effectiveType === "ADD"
                      ? "Contoh: Beli tambahan di pasar bunga"
                      : "Contoh: Bunga layu atau batang patah"
                  }
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="input-field w-full text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={isSubmittingAdjust}
                  className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust || isSubmitDisabled}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmittingAdjust && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  )}
                  <span>
                    {isSupplierSourced ? "Kurangi Stok" : "Simpan"}
                  </span>
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Modal Edit Detail Bahan Baku */}
      <Modal
        isOpen={isEditModalOpen && Boolean(selectedForEdit)}
        onClose={() => !isSubmittingEdit && setIsEditModalOpen(false)}
        size="md"
        headerVariant="dark"
        kicker="Pembaruan Bahan Baku"
        title={
          selectedForEdit
            ? `Edit Bahan Baku: ${selectedForEdit.name}`
            : "Edit Bahan Baku"
        }
      >
        {selectedForEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div
                role="alert"
                className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error"
              >
                {editError}
              </div>
            )}

            {!selectedForEdit.isSelfSupplied && (
              <div className="rounded-xl border border-info/25 bg-info/5 p-3 text-xs text-foreground">
                <p className="leading-relaxed">
                  Data bunga mengikuti katalog {selectedForEdit.sourceLabel}. Anda tetap bisa mengubah{" "}
                  <strong className="font-semibold">Batas Minimum Peringatan</strong> dan{" "}
                  <strong className="font-semibold">Lokasi Penyimpanan</strong>.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="edit-material-name"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Nama Bahan Baku
              </label>
              <input
                id="edit-material-name"
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                disabled={!selectedForEdit.isSelfSupplied}
                className="input-field w-full text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="edit-material-category"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Kategori
                </label>
                <select
                  id="edit-material-category"
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category: e.target.value })
                  }
                  disabled={!selectedForEdit.isSelfSupplied}
                  className="input-field w-full text-sm"
                >
                  <option value="Bunga Segar">Bunga Segar (Umum)</option>
                  <option value="Mawar">Mawar</option>
                  <option value="Tulip">Tulip</option>
                  <option value="Lily">Lily</option>
                  <option value="Krisan">Krisan</option>
                  <option value="Anyelir">Anyelir / Carnation</option>
                  <option value="Daun & Filler Segar">Daun & Filler Segar</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-material-unit"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Satuan
                </label>
                <input
                  id="edit-material-unit"
                  type="text"
                  value={editForm.unit}
                  onChange={(e) =>
                    setEditForm({ ...editForm, unit: e.target.value })
                  }
                  disabled={!selectedForEdit.isSelfSupplied}
                  className="input-field w-full text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="edit-material-price"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Harga Modal (Rp)
                </label>
                <input
                  id="edit-material-price"
                  type="number"
                  min="0"
                  value={editForm.pricePerUnit}
                  onChange={(e) =>
                    setEditForm({ ...editForm, pricePerUnit: e.target.value })
                  }
                  disabled={!selectedForEdit.isSelfSupplied}
                  className="input-field w-full font-mono text-sm tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-material-threshold"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Batas Minimum Peringatan
                </label>
                <input
                  id="edit-material-threshold"
                  type="number"
                  min="0"
                  value={editForm.minThreshold}
                  onChange={(e) =>
                    setEditForm({ ...editForm, minThreshold: e.target.value })
                  }
                  className="input-field w-full font-mono text-sm tabular-nums"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-material-location"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Lokasi Penyimpanan
              </label>
              <input
                id="edit-material-location"
                type="text"
                value={editForm.location}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
                className="input-field w-full text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmittingEdit}
                className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingEdit}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmittingEdit && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Detail Keterkaitan BOM */}
      <Modal
        isOpen={Boolean(selectedBOMInfo)}
        onClose={() => setSelectedBOMInfo(null)}
        size="sm"
        headerVariant="dark"
        kicker="Formula Perakitan"
        title="Keterkaitan BOM Produk"
        subtitle={selectedBOMInfo ? `Bahan baku: ${selectedBOMInfo.name}` : undefined}
        footer={
          <button
            type="button"
            onClick={() => setSelectedBOMInfo(null)}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-low"
          >
            Tutup
          </button>
        }
      >
        {selectedBOMInfo && (
          <div className="space-y-3">
            {selectedBOMInfo.usedInProducts.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-surface-container-low border border-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      width={40}
                      height={40}
                      unoptimized
                      className="w-10 h-10 rounded-lg object-cover border border-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <span className="font-display text-xs font-semibold italic">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-foreground">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Dibutuhkan: <span className="font-mono text-primary font-bold">{p.quantityRequired}</span> {selectedBOMInfo.unit} / buket
                    </p>
                  </div>
                </div>
                <Link
                  href="/florist/products"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Lihat BOM
                </Link>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteMaterial)}
        onClose={() => setPendingDeleteMaterial(null)}
        onConfirm={handleConfirmDeleteMaterial}
        title="Hapus Bahan Baku"
        description={
          pendingDeleteMaterial
            ? `Hapus bahan baku "${pendingDeleteMaterial.name}" dari sistem?`
            : ""
        }
        confirmLabel="Hapus Bahan Baku"
        variant="danger"
        loading={isDeletingMaterial}
      />
    </div>
  );
}
