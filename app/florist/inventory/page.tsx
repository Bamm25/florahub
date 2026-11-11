"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Flower2,
  Plus,
  Search,
  AlertTriangle,
  Layers,
  Edit,
  Trash2,
  Loader2,
  ArrowUpDown,
  Info,
} from "lucide-react";
import Link from "next/link";

interface UsedInProduct {
  id: string;
  name: string;
  image: string | null;
  quantityRequired: number;
}

interface RawMaterial {
  id: string;
  stockId: string;
  name: string;
  category: string;
  variety: string | null;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  minThreshold: number;
  location: string;
  lastRestockDate: string | null;
  createdAt: string;
  isSelfSupplied: boolean;
  sourceLabel: string;
  supplierName: string;
  isLowStock: boolean;
  isOutOfStock: boolean;
  usedInBOMCount: number;
  usedInProducts: UsedInProduct[];
}

interface Stats {
  totalItems: number;
  totalStock: number;
  lowStockCount: number;
  usedInBOMCount: number;
}

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

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [stats, setStats] = useState<Stats>({
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
  const [selectedForAdjust, setSelectedForAdjust] = useState<RawMaterial | null>(null);
  const [adjustType, setAdjustType] = useState<"ADD" | "SUBTRACT" | "SET">("ADD");
  const [adjustAmount, setAdjustAmount] = useState("10");
  const [adjustReason, setAdjustReason] = useState("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Modal Edit Detail
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<RawMaterial | null>(null);
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
  const [selectedBOMInfo, setSelectedBOMInfo] = useState<RawMaterial | null>(null);

  const fetchRawMaterials = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);

      const res = await fetch(`/api/florist/raw-materials?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Gagal memuat bahan baku");
      }

      setRawMaterials(json.data.rawMaterials || []);
      setStats(json.data.stats || {
        totalItems: 0,
        totalStock: 0,
        lowStockCount: 0,
        usedInBOMCount: 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchRawMaterials();
    }
  }, [authStatus, fetchRawMaterials]);

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
      const res = await fetch("/api/florist/raw-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          category: addForm.category.trim(),
          variety: addForm.category.trim(),
          quantity: qty,
          unit: addForm.unit.trim().toLowerCase(),
          pricePerUnit: price,
          minThreshold: isNaN(minThresh) ? 10 : minThresh,
          location: addForm.location.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal menambahkan bahan baku");
      }

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
      await fetchRawMaterials();
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
      const res = await fetch(`/api/florist/raw-materials/${selectedForAdjust.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADJUST_STOCK",
          adjustmentType: adjustType,
          amount,
          reason: adjustReason.trim() || "Penyesuaian stok mandiri florist",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal memperbarui stok");
      }

      setIsAdjustModalOpen(false);
      setSelectedForAdjust(null);
      setAdjustReason("");
      await fetchRawMaterials();
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
      const res = await fetch(`/api/florist/raw-materials/${selectedForEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_DETAILS",
          name: editForm.name.trim(),
          category: editForm.category.trim(),
          unit: editForm.unit.trim().toLowerCase(),
          pricePerUnit: parseInt(editForm.pricePerUnit, 10) || 0,
          minThreshold: parseInt(editForm.minThreshold, 10) || 10,
          location: editForm.location.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal menyimpan perubahan");
      }

      setIsEditModalOpen(false);
      setSelectedForEdit(null);
      await fetchRawMaterials();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan perubahan";
      alert(message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle hapus bahan baku
  const handleDelete = async (material: RawMaterial) => {
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
      const res = await fetch(`/api/florist/raw-materials/${material.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal menghapus bahan baku");
      }
      await fetchRawMaterials();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus bahan baku";
      alert(message);
    }
  };

  const openAdjustModal = (material: RawMaterial) => {
    setSelectedForAdjust(material);
    setAdjustType("ADD");
    setAdjustAmount("10");
    setAdjustReason("");
    setIsAdjustModalOpen(true);
  };

  const openEditModal = (material: RawMaterial) => {
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

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col gap-6 rounded-[24px] bg-[#10121b] px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b4aeff]">
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

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Daftar Bahan Baku</h2>
            <p className="text-xs text-muted-foreground">Cari dan sesuaikan stok sebelum merakit produk buket.</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Cari mawar, tulip, pita, kertas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-container-low py-2.5 pl-10 pr-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
          <div className="flex min-h-[40vh] items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Memuat data bahan baku...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-error mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">{error}</p>
            <button onClick={fetchRawMaterials} className="btn-secondary mt-4 text-xs">
              Coba Lagi
            </button>
          </div>
        ) : rawMaterials.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <h3 className="text-base font-semibold text-foreground mb-1">
              {searchQuery || categoryFilter !== "ALL" ? "Tidak ada bahan yang sesuai" : "Belum Ada Bahan Baku"}
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              {searchQuery || categoryFilter !== "ALL"
                ? "Coba ubah kata kunci atau kategori untuk melihat stok lainnya."
                : "Tambahkan stok bunga segar, daun, atau material wrapping agar siap dirangkai menjadi produk buket."}
            </p>
            {!(searchQuery || categoryFilter !== "ALL") && <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Bahan Baku Pertama
            </button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead className="bg-[#181720] border-b border-zinc-800 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
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
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-xs"
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
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(material)}
                          className="p-1.5 text-rose-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Hapus bahan baku"
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
          <div className="relative w-full max-w-xl rounded-2xl bg-card shadow-xl border border-border max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center bg-[#181720] text-white p-5 sm:p-6 flex-shrink-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Input Mandiri</p>
                <h3 className="text-lg font-bold text-white mt-1">
                  Tambah Bahan Baku Florist
                </h3>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Bunga potong segar atau material wrapping untuk BOM produk buket.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Pilihan Cepat Preset Bunga & Material */}
              <div className="mb-5 p-3 rounded-xl bg-surface-container-low border border-border">
                <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-violet-500" />
                  Pilihan Cepat (Klik untuk mengisi otomatis):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-violet-500 text-muted-foreground hover:text-violet-600 transition-colors text-left"
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
                        ? "bg-violet-600 border-violet-600 text-white"
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
                        ? "bg-violet-600 border-violet-600 text-white"
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
                        ? "bg-violet-600 border-violet-600 text-white"
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors shadow-xs disabled:opacity-50"
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors shadow-xs disabled:opacity-50"
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
          <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl border border-border">
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
                      <img
                        src={p.image}
                        alt={p.name}
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
