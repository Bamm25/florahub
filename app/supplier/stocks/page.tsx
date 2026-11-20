"use client";

import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingSpinner,
  Pagination,
  SearchInput,
} from "@/components/ui";
import Modal from "@/components/forms/Modal";
import {
  CreateStockInput,
  createSupplierStock,
  deleteSupplierStock,
  StockItem,
  UpdateStockInput,
  updateSupplierStock,
} from "@/lib/api/supplier";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";
import {
  Edit2,
  Loader2,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const ITEMS_PER_PAGE = 10;

export default function SupplierStocksPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter, Pencarian & Paginasi
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

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

  // Umpan balik non-blocking & Hapus stok
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingDeleteStock, setPendingDeleteStock] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchStocks = async (silent = false) => {
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      const list = await fetchPaginatedCollection<StockItem>(
        "/api/supplier/stocks",
        "stocks",
      );
      setStocks(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat katalog stok bunga",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchStocks(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Ringkasan KPI
  const summaryStats = useMemo(() => {
    const total = stocks.length;
    const available = stocks.filter(
      (s) => s.isAvailable && s.quantity > 0,
    ).length;
    const low = stocks.filter((s) => s.quantity > 0 && s.quantity < 50).length;
    const out = stocks.filter(
      (s) => s.quantity === 0 || !s.isAvailable,
    ).length;
    return { total, available, low, out };
  }, [stocks]);

  // Filter stok berdasarkan pencarian teks dan tab filter yang aktif
  const filteredStocks = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return stocks.filter((stock) => {
      const matchesSearch =
        !keyword ||
        stock.name.toLowerCase().includes(keyword) ||
        (stock.variety?.toLowerCase().includes(keyword) ?? false);
      if (!matchesSearch) return false;

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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStocks.length / ITEMS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStocks = useMemo(() => {
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredStocks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredStocks, safePage]);

  // Hitung jumlah item untuk badge di FilterBar
  const filterOptions = [
    { id: "ALL", label: "Semua", count: summaryStats.total },
    {
      id: "AVAILABLE",
      label: "Tersedia",
      count: summaryStats.available,
    },
    {
      id: "LOW_STOCK",
      label: "Menipis (< 50)",
      count: summaryStats.low,
    },
    {
      id: "OUT_OF_STOCK",
      label: "Habis / Nonaktif",
      count: summaryStats.out,
    },
  ];

  const handleCreateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingAdd(true);
      setAddError(null);
      setActionError(null);
      if (!addForm.name.trim()) throw new Error("Nama bunga wajib diisi");
      if (!addForm.variety.trim())
        throw new Error("Varietas bunga wajib diisi");
      if (!addForm.unit.trim()) throw new Error("Satuan wajib diisi");
      if (addForm.quantity < 0)
        throw new Error("Kuantitas tidak boleh negatif");
      if (addForm.pricePerUnit < 0)
        throw new Error("Harga per satuan tidak boleh negatif");

      const createdName = addForm.name.trim();
      await createSupplierStock({
        name: createdName,
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
      setActionSuccess(`Stok "${createdName}" berhasil ditambahkan ke katalog.`);
      await fetchStocks(true);
      setCurrentPage(1);
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
      setActionError(null);
      const trimmedName = editForm.name?.trim() ?? "";
      const trimmedVariety = editForm.variety?.trim() ?? "";
      const trimmedUnit = editForm.unit?.trim() ?? "";
      if (!trimmedName) throw new Error("Nama bunga wajib diisi");
      if (!trimmedVariety) throw new Error("Varietas bunga wajib diisi");
      if (!trimmedUnit) throw new Error("Satuan wajib diisi");
      if ((editForm.quantity ?? 0) < 0)
        throw new Error("Jumlah stok tidak boleh negatif");
      if ((editForm.pricePerUnit ?? 0) < 0)
        throw new Error("Harga per satuan tidak boleh negatif");

      await updateSupplierStock(selectedStock.id, {
        name: trimmedName,
        variety: trimmedVariety,
        unit: trimmedUnit,
        pricePerUnit: Number(editForm.pricePerUnit ?? 0),
        quantity: Number(editForm.quantity ?? 0),
        isAvailable: editForm.isAvailable,
      });
      setIsEditModalOpen(false);
      setSelectedStock(null);
      setActionSuccess(`Perubahan pada "${trimmedName}" berhasil disimpan.`);
      await fetchStocks(true);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Gagal memperbarui data stok",
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handler hapus stok
  const handleConfirmDeleteStock = async () => {
    if (!pendingDeleteStock) return;
    const deletedName = pendingDeleteStock.name;
    setActionError(null);
    setActionSuccess(null);
    try {
      setDeletingId(pendingDeleteStock.id);
      await deleteSupplierStock(pendingDeleteStock.id);
      setActionSuccess(`Stok "${deletedName}" berhasil dihapus dari katalog.`);
      await fetchStocks(true);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal menghapus stok bunga",
      );
    } finally {
      setDeletingId(null);
      setPendingDeleteStock(null);
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
        onRetry={() => void fetchStocks()}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      {/* Header Editorial Gelap */}
      <div className="flex flex-col gap-6 rounded-[24px] border border-white/10 bg-surface-dark px-6 py-8 text-white sm:px-8 sm:py-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-kicker">
            Katalog Kebun
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Katalog Stok Bunga
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Kelola katalog bunga segar siap jual, harga satuan, dan ketersediaan
            stok untuk florist.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void fetchStocks(true)}
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
            Tambah Stok Bunga
          </button>
        </div>
      </div>

      {/* Ringkasan KPI 4-sel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="p-5 border-b border-r lg:border-b-0 border-border">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Varietas
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {summaryStats.total}
          </p>
        </div>
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-border">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Tersedia
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-success">
            {summaryStats.available}
          </p>
        </div>
        <div className="p-5 border-r border-border">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Menipis (&lt; 50)
          </p>
          <p
            className={`mt-2 text-3xl font-bold tabular-nums ${
              summaryStats.low > 0 ? "text-warning" : "text-foreground"
            }`}
          >
            {summaryStats.low}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Habis / Nonaktif
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-muted-foreground">
            {summaryStats.out}
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

      {/* Bar Pencarian & Filter Kategori */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <SearchInput
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setCurrentPage(1);
          }}
          placeholder="Cari nama bunga atau varietas..."
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

      {/* Tabel Data Stok */}
      {filteredStocks.length === 0 ? (
        <EmptyState
          title={
            searchQuery || activeFilter !== "ALL"
              ? "Tidak ada stok yang cocok"
              : "Belum ada stok bunga"
          }
          description={
            searchQuery || activeFilter !== "ALL"
              ? "Coba ubah kata kunci pencarian atau pilih filter status lainnya."
              : "Tambahkan stok bunga segar dari kebun agar toko florist dapat langsung memesan."
          }
          action={
            !searchQuery && activeFilter === "ALL"
              ? {
                  label: "Tambah Stok Pertama",
                  onClick: () => {
                    setAddError(null);
                    setIsAddModalOpen(true);
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-container-lowest text-xs font-medium uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      Bunga &amp; Varietas
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Jumlah Stok
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Harga per Satuan
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
                  {paginatedStocks.map((stock) => {
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
                          <span className="font-bold tabular-nums text-foreground">
                            {stock.quantity.toLocaleString("id-ID")}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground">
                            {stock.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium tabular-nums text-foreground">
                          {formatRupiah(stock.pricePerUnit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-container px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                              <span>Habis / Nonaktif</span>
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                              <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
                              <span>Menipis</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                              <span>Tersedia</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                          <time dateTime={stock.updatedAt} className="tabular-nums">
                            {formatDate(stock.updatedAt)}
                          </time>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(stock)}
                              className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground"
                              title="Ubah Stok"
                              aria-label={`Ubah stok ${stock.name}`}
                            >
                              <Edit2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === stock.id}
                              onClick={() =>
                                setPendingDeleteStock({
                                  id: stock.id,
                                  name: stock.name,
                                })
                              }
                              className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
                              title="Hapus Stok"
                              aria-label={`Hapus stok ${stock.name}`}
                            >
                              {deletingId === stock.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
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

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            ariaLabel="Navigasi halaman katalog stok bunga"
          />
        </div>
      )}

      {/* Modal Tambah Stok Bunga */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmittingAdd && setIsAddModalOpen(false)}
        headerVariant="dark"
        kicker="Katalog Kebun"
        title="Tambah Stok Bunga Baru"
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
              form="add-stock-form"
              disabled={isSubmittingAdd}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmittingAdd && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              <span>Simpan Stok</span>
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
        <form id="add-stock-form" onSubmit={handleCreateStock} className="space-y-4">
          <div>
            <label
              htmlFor="add-stock-name"
              className="block text-sm font-medium text-foreground"
            >
              Nama Bunga <span className="text-error" aria-hidden="true">*</span>
            </label>
            <input
              id="add-stock-name"
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
            <label
              htmlFor="add-stock-variety"
              className="block text-sm font-medium text-foreground"
            >
              Varietas / Warna{" "}
              <span className="text-error" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="add-stock-variety"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="add-stock-unit"
                className="block text-sm font-medium text-foreground"
              >
                Satuan <span className="text-error" aria-hidden="true">*</span>
              </label>
              <input
                id="add-stock-unit"
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
              <label
                htmlFor="add-stock-qty"
                className="block text-sm font-medium text-foreground"
              >
                Jumlah Stok Awal{" "}
                <span className="text-error" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="add-stock-qty"
                type="number"
                inputMode="numeric"
                min="0"
                required
                value={addForm.quantity}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="input-field mt-1.5 w-full tabular-nums"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="add-stock-price"
              className="block text-sm font-medium text-foreground"
            >
              Harga per Satuan (Rp){" "}
              <span className="text-error" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="add-stock-price"
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
        </form>
      </Modal>

      {/* Modal Edit Stok Bunga */}
      <Modal
        isOpen={isEditModalOpen && Boolean(selectedStock)}
        onClose={() => !isSubmittingEdit && setIsEditModalOpen(false)}
        headerVariant="dark"
        kicker="Katalog Kebun"
        title="Ubah Detail Stok Bunga"
        size="md"
        footer={
          selectedStock ? (
            <>
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={() => setIsEditModalOpen(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                form="edit-stock-form"
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
        {selectedStock && (
          <div className="space-y-4">
            {editError && (
              <div
                role="alert"
                className="rounded-md border border-error/30 bg-error/5 p-3.5 text-sm text-error"
              >
                {editError}
              </div>
            )}
            <form id="edit-stock-form" onSubmit={handleUpdateStock} className="space-y-4">
              <div>
                <label
                  htmlFor="edit-stock-name"
                  className="block text-sm font-medium text-foreground"
                >
                  Nama Bunga <span className="text-error" aria-hidden="true">*</span>
                </label>
                <input
                  id="edit-stock-name"
                  type="text"
                  required
                  value={editForm.name || ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="input-field mt-1.5 w-full"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-stock-variety"
                  className="block text-sm font-medium text-foreground"
                >
                  Varietas <span className="text-error" aria-hidden="true">*</span>
                </label>
                <input
                  id="edit-stock-variety"
                  type="text"
                  required
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-stock-unit"
                    className="block text-sm font-medium text-foreground"
                  >
                    Satuan <span className="text-error" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="edit-stock-unit"
                    type="text"
                    required
                    value={editForm.unit || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    className="input-field mt-1.5 w-full"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-stock-qty"
                    className="block text-sm font-medium text-foreground"
                  >
                    Jumlah Stok{" "}
                    <span className="text-error" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="edit-stock-qty"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    required
                    value={editForm.quantity ?? 0}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        quantity: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="input-field mt-1.5 w-full tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="edit-stock-price"
                  className="block text-sm font-medium text-foreground"
                >
                  Harga per Satuan (Rp){" "}
                  <span className="text-error" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="edit-stock-price"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="500"
                  required
                  value={editForm.pricePerUnit ?? 0}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      pricePerUnit: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="input-field mt-1.5 w-full tabular-nums"
                />
              </div>
              <div className="flex items-center gap-2.5 pt-2">
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
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <label
                  htmlFor="isAvailableCheck"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Tersedia untuk dipesan oleh florist
                </label>
              </div>
            </form>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteStock)}
        onClose={() => setPendingDeleteStock(null)}
        onConfirm={handleConfirmDeleteStock}
        title="Hapus Stok Bunga"
        description={
          pendingDeleteStock
            ? `Apakah Anda yakin ingin menghapus stok "${pendingDeleteStock.name}"? Aksi ini tidak dapat dibatalkan.`
            : ""
        }
        confirmLabel="Hapus Stok"
        variant="danger"
        loading={Boolean(deletingId)}
      />
    </div>
  );
}
