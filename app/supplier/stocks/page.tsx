"use client";

import { EmptyState, ErrorState, FilterBar, LoadingSpinner, SearchInput } from "@/components/ui";
import {
  CreateStockInput,
  createSupplierStock,
  deleteSupplierStock,
  getSupplierStocks,
  StockItem,
  UpdateStockInput,
  updateSupplierStock,
} from "@/lib/api/supplier";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";
import { AlertTriangle, CheckCircle2, Edit2, Loader2, Package, Plus, Trash2, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function SupplierStocksPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Modal Tambah Stok State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addForm, setAddForm] = useState<CreateStockInput>({
    name: "",
    variety: "",
    unit: "tangkai",
    pricePerUnit: 10000,
    quantity: 50,
  });
  const [addError, setAddError] = useState<string | null>(null);

  // Modal Edit Stok State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState<UpdateStockInput>({});
  const [editError, setEditError] = useState<string | null>(null);

  // Loading state saat menghapus stok
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStocks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getSupplierStocks();
      setStocks(res.stocks);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat katalog stok bunga",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchStocks(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Filter stok berdasarkan pencarian teks dan tab filter yang aktif
  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      // 1. Filter Pencarian Teks
      const matchesSearch =
        stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (stock.variety &&
          stock.variety.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      // 2. Filter Kategori Tab
      if (activeFilter === "AVAILABLE") {
        return stock.isAvailable && stock.quantity > 0;
      }
      if (activeFilter === "LOW_STOCK") {
        return stock.quantity > 0 && stock.quantity < 50;
      }
      if (activeFilter === "OUT_OF_STOCK") {
        return stock.quantity === 0 || !stock.isAvailable;
      }
      return true;
    });
  }, [stocks, searchQuery, activeFilter]);

  // Hitung jumlah item untuk badge di FilterBar
  const filterOptions = [
    { id: "ALL", label: "Semua", count: stocks.length },
    {
      id: "AVAILABLE",
      label: "Tersedia",
      count: stocks.filter((s) => s.isAvailable && s.quantity > 0).length,
    },
    {
      id: "LOW_STOCK",
      label: "Menipis (< 50)",
      count: stocks.filter((s) => s.quantity > 0 && s.quantity < 50).length,
    },
    {
      id: "OUT_OF_STOCK",
      label: "Habis / Nonaktif",
      count: stocks.filter((s) => s.quantity === 0 || !s.isAvailable).length,
    },
  ];

  const handleCreateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingAdd(true);
      setAddError(null);
      if (!addForm.name.trim()) throw new Error("Nama bunga wajib diisi");
      if (!addForm.variety.trim())
        throw new Error("Varietas bunga wajib diisi");
      if (addForm.quantity < 0)
        throw new Error("Kuantitas tidak boleh negatif");
      if (addForm.pricePerUnit < 0)
        throw new Error("Harga per unit tidak boleh negatif");

      await createSupplierStock({
        name: addForm.name.trim(),
        variety: addForm.variety.trim(),
        unit: addForm.unit.trim() || "tangkai",
        pricePerUnit: Number(addForm.pricePerUnit),
        quantity: Number(addForm.quantity),
      });

      setIsAddModalOpen(false);
      setAddForm({
        name: "",
        variety: "",
        unit: "tangkai",
        pricePerUnit: 10000,
        quantity: 50,
      });
      await fetchStocks();
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Gagal menambahkan stok bunga",
      );
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handler buka modal edit
  const handleOpenEdit = (stock: StockItem) => {
    setSelectedStock(stock);
    setEditForm({
      name: stock.name,
      variety: stock.variety || "",
      unit: stock.unit,
      pricePerUnit: stock.pricePerUnit,
      quantity: stock.quantity,
      isAvailable: stock.isAvailable,
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;
    try {
      setIsSubmittingEdit(true);
      setEditError(null);
      await updateSupplierStock(selectedStock.id, {
        name: editForm.name?.trim(),
        variety: editForm.variety?.trim(),
        unit: editForm.unit?.trim(),
        pricePerUnit:
          editForm.pricePerUnit !== undefined
            ? Number(editForm.pricePerUnit)
            : undefined,
        quantity:
          editForm.quantity !== undefined
            ? Number(editForm.quantity)
            : undefined,
        isAvailable: editForm.isAvailable,
      });
      setIsEditModalOpen(false);
      setSelectedStock(null);
      await fetchStocks();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Gagal memperbarui data stok",
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handler hapus stok
  const handleDeleteStock = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus stok "${name}"? Aksi ini tidak dapat dibatalkan.`,
    );
    if (!confirmed) return;
    try {
      setDeletingId(id);
      await deleteSupplierStock(id);
      await fetchStocks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus stok bunga");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Memuat katalog stok bunga..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Katalog Stok Gagal Dimuat"
        error={error}
        onRetry={fetchStocks}
      />
    );
  }
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Katalog Stok Bunga
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola stok siap jual untuk florist.
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
          <span>Tambah Stok Bunga</span>
        </button>
      </div>
      {/* Bar Pencarian & Filter Kategori */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari nama bunga atau varietas..."
          className="max-w-md"
        />
        <FilterBar
          filters={filterOptions}
          activeFilter={activeFilter}
          onChange={setActiveFilter}
        />
      </div>
      {/* Tabel Data Stok */}
      {filteredStocks.length === 0 ? (
        <EmptyState
          icon={<Package className="h-10 w-10 text-muted-foreground" />}
          title={
            searchQuery || activeFilter !== "ALL"
              ? "Tidak ada stok yang cocok"
              : "Belum ada stok bunga"
          }
          description={
            searchQuery || activeFilter !== "ALL"
              ? "Coba ubah kata kunci pencarian atau pilih filter status lainnya."
              : "Mulai daftarkan hasil panen bunga segar kebun Anda agar dapat dipesan oleh florist."
          }
          action={
            !searchQuery && activeFilter === "ALL"
              ? {
                  label: "Tambah Stok Pertama",
                  onClick: () => setIsAddModalOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-container-lowest text-xs font-medium uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="px-6 py-4">
                    Bunga & Varietas
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Jumlah Stok
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Harga per Unit
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Pembaruan
                  </th>
                  <th scope="col" className="px-6 py-4 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStocks.map((stock) => {
                  const isLow = stock.quantity > 0 && stock.quantity < 50;
                  const isOut = stock.quantity === 0 || !stock.isAvailable;
                  return (
                    <tr
                      key={stock.id}
                      className="hover:bg-surface-container-lowest/50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">
                          {stock.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Varietas: {stock.variety || "Standar"}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-foreground">
                          {stock.quantity.toLocaleString("id-ID")}
                        </span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {stock.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                        {formatRupiah(stock.pricePerUnit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                            <XCircle className="h-3 w-3" />
                            <span>Habis</span>
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Menipis</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Tersedia</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(stock.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(stock)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-container hover:text-foreground"
                            title="Edit Stok"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === stock.id}
                            onClick={() =>
                              handleDeleteStock(stock.id, stock.name)
                            }
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            title="Hapus Stok"
                          >
                            {deletingId === stock.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Modal Tambah Stok Bunga */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">
                Tambah Stok Bunga Baru
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-surface-container"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {addError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {addError}
              </div>
            )}
            <form onSubmit={handleCreateStock} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground">
                  Nama Bunga *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Mawar Semi Holland"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="input-field mt-1.5 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground">
                  Varietas / Warna *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Merah Sexy Red / Putih Avalon"
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
                    Satuan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="tangkai / ikat"
                    value={addForm.unit}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    className="input-field mt-1.5 w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground">
                    Jumlah Stok Awal *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={addForm.quantity}
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="input-field mt-1.5 w-full"
                  />
                </div>
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
                  <span>Simpan Stok</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Edit Stok Bunga */}
      {isEditModalOpen && selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">
                Ubah Detail Stok Bunga
              </h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-surface-container"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {editError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {editError}
              </div>
            )}
            <form onSubmit={handleUpdateStock} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground">
                  Nama Bunga
                </label>
                <input
                  type="text"
                  value={editForm.name || ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="input-field mt-1.5 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground">
                  Varietas
                </label>
                <input
                  type="text"
                  value={editForm.variety || ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      variety: e.target.value,
                    }))
                  }
                  className="input-field mt-1.5 w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={editForm.unit || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    className="input-field mt-1.5 w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground">
                    Jumlah Stok
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.quantity ?? 0}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="input-field mt-1.5 w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground">
                  Harga per Satuan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={editForm.pricePerUnit ?? 0}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      pricePerUnit: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="input-field mt-1.5 w-full"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isAvailableCheck"
                  checked={editForm.isAvailable ?? true}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      isAvailable: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label
                  htmlFor="isAvailableCheck"
                  className="text-xs font-medium text-foreground cursor-pointer"
                >
                  Tersedia untuk dipesan oleh florist
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-container"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmittingEdit && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
