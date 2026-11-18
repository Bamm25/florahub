"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  Flower2,
  Plus,
  Layers,
  Edit,
  Trash2,
  Loader2,
  ArrowUpDown,
  Info,
} from "lucide-react";
import Link from "next/link";
import {
  LoadingSpinner,
  ErrorState,
  EmptyState,
  SearchInput,
} from "@/components/ui";
import {
  getFloristRawMaterials,
  createFloristRawMaterial,
  updateFloristRawMaterial,
  deleteFloristRawMaterial,
  type RawMaterialItem,
  type RawMaterialStats,
} from "@/lib/api/florist";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";
import { formatRupiah } from "@/lib/utils/formatters";

interface FinishedProduct {
  id: string;
  name: string;
  stock: number;
  price: number;
  isActive: boolean;
}

const LOW_STOCK_THRESHOLD = 5;

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
  const [adjustType, setAdjustType] = useState<"ADD" | "SUBTRACT" | "SET">("ADD");
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

  // Modal Info BOM
  const [selectedBOMInfo, setSelectedBOMInfo] = useState<RawMaterialItem | null>(null);

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

  // Handle penyesuaian stok mandiri
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForAdjust) return;

    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || amount < 0) return;

    setIsSubmittingAdjust(true);
    try {
      await updateFloristRawMaterial(selectedForAdjust.id, {
        action: "ADJUST_STOCK",
        adjustmentType: adjustType,
        amount,
        reason: adjustReason.trim() || "Penyesuaian stok mandiri florist",
      });

      setIsAdjustModalOpen(false);
      setSelectedForAdjust(null);
      setAdjustReason("");
      await fetchInventoryData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memperbarui stok";
      alert(message);
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Handle edit metadata bahan baku
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForEdit) return;

    setIsSubmittingEdit(true);
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
      alert(message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle hapus bahan baku
  const handleDelete = async (material: RawMaterialItem) => {
    if (material.usedInBOMCount > 0) {
      const names = material.usedInProducts.map((p) => p.name).join(", ");
      alert(
        `Bahan baku "${material.name}" tidak dapat dihapus karena masih digunakan pada BOM produk: ${names}. Hapus komponen dari produk terlebih dahulu.`
      );
      return;
    }

    if (!confirm(`Hapus bahan baku "${material.name}" dari sistem?`)) {
      return;
    }

    try {
      await deleteFloristRawMaterial(material.id);
      await fetchInventoryData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus bahan baku";
      alert(message);
    }
  };

  const openAdjustModal = (material: RawMaterialItem) => {
    setSelectedForAdjust(material);
    setAdjustType("ADD");
    setAdjustAmount("10");
    setAdjustReason("");
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
      <div className="flex flex-col gap-6 rounded-[24px] bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Layers className="w-3.5 h-3.5" />
            Produk Jadi & BOM
          </Link>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Bahan Baku
          </button>
        </div>
      </div>

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
            <p className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${item.attention && item.value > 0 ? "text-amber-600" : "text-foreground"}`}>
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
                      ? "border-amber-200 bg-amber-50 text-amber-800"
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
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Daftar Bahan Baku</h2>
            <p className="text-xs text-muted-foreground">Cari dan sesuaikan stok sebelum merakit produk buket.</p>
          </div>
          <div className="w-full sm:w-80">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari mawar, tulip, pita, kertas..."
            />
          </div>
        </div>
        <div className="flex items-center gap-2 w-full overflow-x-auto pt-3 mt-3 border-t border-border">
          <span className="text-xs font-medium text-muted-foreground shrink-0 mr-1">Kategori:</span>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container-low text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "ALL" ? "Semua Kategori" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Bahan Baku */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
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
                      icon: <Plus className="w-4 h-4" />,
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead className="bg-surface-dark border-b border-white/10 text-xs font-semibold text-white/80 uppercase tracking-wider">
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
                {rawMaterials.map((material) => (
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
                            : "bg-sky-50 text-sky-700 border border-sky-200"
                        }`}
                      >
                        {material.sourceLabel}
                      </span>
                    </td>

                    {/* Stok & Satuan */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className={`font-mono text-base font-bold ${
                            material.isOutOfStock
                              ? "text-red-600"
                              : material.isLowStock
                              ? "text-amber-600"
                              : "text-foreground"
                          }`}
                        >
                          {material.quantity}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">{material.unit}</span>
                      </div>
                      {material.isLowStock && (
                        <p className="text-[10px] text-amber-600 font-medium">
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Klik untuk melihat produk yang memakai bahan ini"
                        >
                          <Layers className="w-3.5 h-3.5" />
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                          title="Sesuaikan stok (tambah/kurang mandiri)"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" />
                          Stok
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(material)}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-container transition-colors"
                          title="Edit detail bahan baku"
                          aria-label={`Edit ${material.name}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(material)}
                          className="p-1.5 text-rose-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
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
        )}
      </div>

      {/* Modal Tambah Bahan Baku Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tambah Bahan Baku Florist"
            className="relative w-full max-w-xl rounded-2xl bg-card shadow-xl border border-border max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center bg-surface-dark text-white p-5 sm:p-6 flex-shrink-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-kicker">Input Mandiri</p>
                <h3 className="text-lg font-bold text-white mt-1">
                  Tambah Bahan Baku Florist
                </h3>
                <p className="text-xs text-white/70 mt-0.5">
                  Bunga potong segar atau material wrapping untuk BOM produk buket.
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup dialog tambah bahan baku"
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Pilihan Cepat Preset Bunga & Material */}
              <div className="mb-5 p-3 rounded-xl bg-surface-container-low border border-border">
                <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  Pilihan Cepat (Klik untuk mengisi otomatis):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors text-left"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {addErrors.submit && (
                <div className="p-3 bg-error/10 border border-error/30 text-error text-xs rounded-xl">
                  {addErrors.submit}
                </div>
              )}

              {/* Nama Bahan Baku */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Nama Bahan Baku / Bunga <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bunga Tulip Merah Import"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="input-field text-sm w-full"
                  required
                />
                {addErrors.name && (
                  <p className="text-xs text-error mt-1">{addErrors.name}</p>
                )}
              </div>

              {/* Kategori & Satuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Kategori <span className="text-error">*</span>
                  </label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="input-field text-sm w-full"
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
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Satuan Penggunaan <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value="tangkai"
                    readOnly
                    className="input-field text-sm w-full bg-surface-container-low font-mono cursor-not-allowed text-foreground"
                    title="Satuan baku inventori bunga Florahub adalah tangkai"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Standar baku bunga: tangkai
                  </p>
                </div>
              </div>

              {/* Stok Awal & Harga Modal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Stok Awal Fisik ({addForm.unit || "tangkai"}) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 50"
                    value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                    className="input-field text-sm w-full font-mono"
                    required
                  />
                  {addErrors.quantity && (
                    <p className="text-xs text-error mt-1">{addErrors.quantity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Harga Modal Beli / {addForm.unit || "tangkai"} (Rp) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 15000"
                    value={addForm.pricePerUnit}
                    onChange={(e) => setAddForm({ ...addForm, pricePerUnit: e.target.value })}
                    className="input-field text-sm w-full font-mono"
                    required
                  />
                </div>
              </div>

              {/* Minimal Threshold & Lokasi Penyimpanan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Batas Peringatan Stok Minimum
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.minThreshold}
                    onChange={(e) => setAddForm({ ...addForm, minThreshold: e.target.value })}
                    className="input-field text-sm w-full font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Sistem memberi tanda peringatan jika stok di bawah angka ini.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Lokasi Penyimpanan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Cold Storage Rak A"
                    value={addForm.location}
                    onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                    className="input-field text-sm w-full"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmittingAdd}
                  className="btn-secondary rounded-xl text-xs py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-5 py-2 text-xs font-semibold text-primary-foreground transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmittingAdd && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan Bahan Baku
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}

      {/* Modal Sesuaikan Stok Mandiri */}
      {isAdjustModalOpen && selectedForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl border border-border">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Sesuaikan Stok: {selectedForAdjust.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Stok saat ini:{" "}
                  <span className="font-semibold text-foreground font-mono">
                    {selectedForAdjust.quantity} {selectedForAdjust.unit}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Jenis Penyesuaian
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("ADD")}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      adjustType === "ADD"
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-surface-container-low border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    + Tambah Stok
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("SUBTRACT")}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      adjustType === "SUBTRACT"
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-surface-container-low border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    - Kurang Stok
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("SET")}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      adjustType === "SET"
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-surface-container-low border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Atur Total
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Jumlah Penyesuaian ({selectedForAdjust.unit || "tangkai"})
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="input-field text-sm w-full font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Alasan Penyesuaian
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pembelian pasar bunga / bunga layu / opname"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="input-field text-sm w-full"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={isSubmittingAdjust}
                  className="btn-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmittingAdjust && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Penyesuaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Detail Bahan Baku */}
      {isEditModalOpen && selectedForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-foreground">
                Edit Bahan Baku: {selectedForEdit.name}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Nama Bahan Baku
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input-field text-sm w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Kategori
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="input-field text-sm w-full"
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
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="input-field text-sm w-full"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Harga Modal (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.pricePerUnit}
                    onChange={(e) => setEditForm({ ...editForm, pricePerUnit: e.target.value })}
                    className="input-field text-sm w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Batas Minimum Peringatan
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.minThreshold}
                    onChange={(e) => setEditForm({ ...editForm, minThreshold: e.target.value })}
                    className="input-field text-sm w-full font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Lokasi Penyimpanan
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="input-field text-sm w-full"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmittingEdit}
                  className="btn-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmittingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Keterkaitan BOM */}
      {selectedBOMInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keterkaitan BOM Produk"
            className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl border border-border"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Keterkaitan BOM Produk
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bahan baku: <span className="font-semibold text-foreground">{selectedBOMInfo.name}</span>
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup keterkaitan BOM"
                onClick={() => setSelectedBOMInfo(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto mb-4">
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
                        <Flower2 className="w-5 h-5" />
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
                    href={`/florist/products`}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Lihat BOM
                  </Link>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedBOMInfo(null)}
              className="btn-secondary w-full text-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
