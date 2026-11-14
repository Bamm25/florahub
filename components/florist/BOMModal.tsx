"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";

// Interface data bahan baku inventaris untuk opsi dropdown
interface FloristInventory {
  id: string;
  quantity: number;
  location: string | null;
  stock: {
    name: string;
    variety: string | null;
    unit: string;
  };
}

// Interface data komponen inventaris dalam BOM
interface ComponentInventory {
  id: string;
  currentStock: number;
  location: string | null;
  stock: {
    name: string;
    variety: string | null;
    unit: string;
  };
}

// Interface data komponen BOM produk
interface ProductComponent {
  id: string;
  quantity: number;
  inventory: ComponentInventory;
}

// Props interface untuk modal pengelolaan BOM
interface BOMModalProps {
  isOpen: boolean;
  productId: string;
  productName: string;
  onClose: () => void;
}

// Modal pengelolaan Bill of Materials (BOM) perakitan produk florist
export default function BOMModal({
  isOpen,
  productId,
  productName,
  onClose,
}: BOMModalProps) {
  const [components, setComponents] = useState<ProductComponent[]>([]);
  const [inventoryList, setInventoryList] = useState<FloristInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  const [newComponent, setNewComponent] = useState({
    inventoryId: "",
    quantity: "",
  });

  const fetchComponents = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const items = await fetchPaginatedCollection<ProductComponent>(`/api/florist/products/${productId}/components`, "items");
      setComponents(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat komponen");
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!isOpen || !productId) return;
    let active = true;

    // Ambil daftar komponen BOM produk
    fetchPaginatedCollection<ProductComponent>(`/api/florist/products/${productId}/components`, "items")
      .then((items) => {
        if (active) {
          setComponents(items);

        }
      })
      .catch((err) => {
        if (active) {
          const msg = err instanceof Error ? err.message : "Gagal memuat komponen";
          setError(msg);

        }
      })
      .finally(() => { if (active) setIsLoading(false); });

    // Ambil daftar bahan baku inventaris untuk pilihan dropdown
    fetchPaginatedCollection<FloristInventory>("/api/florist/inventory", "inventories")
      .then((inventories) => {
        if (active) {
          setInventoryList(inventories);

        }
      })
      .catch((err) => {
        if (active) {
          const msg = err instanceof Error ? err.message : "Gagal memuat inventory";
          setError(msg);

        }
      });

    return () => { active = false; };
  }, [isOpen, productId]);

  const handleAddComponent = async () => {
    if (!newComponent.inventoryId || !newComponent.quantity) {
      setError("Pilih inventory dan masukkan jumlah");
      return;
    }

    const qty = Number(newComponent.quantity);
    if (isNaN(qty) || qty <= 0) {
      setError("Jumlah harus lebih dari 0");
      return;
    }

    // Validasi: quantity tidak boleh melebihi stok tersedia
    const selectedInventory = inventoryList.find(inv => inv.id === newComponent.inventoryId);
    if (selectedInventory && qty > selectedInventory.quantity) {
      setError(`Jumlah komponen (${qty}) melebihi stok tersedia (${selectedInventory.quantity} ${selectedInventory.stock.unit})`);
      return;
    }

    setIsAdding(true);
    setError("");

    try {
      const res = await fetch(`/api/florist/products/${productId}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: newComponent.inventoryId,
          quantity: qty,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal menambah komponen");
      }

      setNewComponent({ inventoryId: "", quantity: "" });
      await fetchComponents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah komponen");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteComponent = async (componentId: string) => {
    if (!confirm("Hapus komponen ini dari BOM?")) return;

    try {
      const res = await fetch(
        `/api/florist/products/${productId}/components/${componentId}`,
        { method: "DELETE" }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal menghapus komponen");
      }

      await fetchComponents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus komponen");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="rounded-2xl border border-border bg-card w-full max-w-3xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
        <div className="sticky top-0 z-50 bg-[#181720] text-white p-5 sm:p-6 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Bill of Materials</p>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white mt-1">
              Komponen Produk (BOM)
            </h2>
            <p className="text-xs text-zinc-300 mt-0.5">
              {productName} — formula kebutuhan bahan baku per buket
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-error/5 border border-error/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Tambah Komponen Baru
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Pilih Inventory
                </label>
                <select
                  value={newComponent.inventoryId}
                  onChange={(e) =>
                    setNewComponent((prev) => ({
                      ...prev,
                      inventoryId: e.target.value,
                    }))
                  }
                  className="input-field w-full text-sm"
                  disabled={isAdding}
                >
                  <option value="">-- Pilih Bahan Baku --</option>
                  {inventoryList.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.stock.name}
                      {inv.stock.variety && ` (${inv.stock.variety})`} - Stok:{" "}
                      {inv.quantity} {inv.stock.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Jumlah Dibutuhkan ({inventoryList.find((inv) => inv.id === newComponent.inventoryId)?.stock.unit || "tangkai"} per Buket)
                </label>
                <input
                  type="number"
                  value={newComponent.quantity}
                  onChange={(e) =>
                    setNewComponent((prev) => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                  placeholder="Contoh: 10"
                  min="1"
                  max={
                    inventoryList.find((inv) => inv.id === newComponent.inventoryId)
                      ?.quantity || undefined
                  }
                  className="input-field w-full text-sm"
                  disabled={isAdding}
                />
                {newComponent.inventoryId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Stok tersedia:{" "}
                    {inventoryList.find((inv) => inv.id === newComponent.inventoryId)
                      ?.quantity || 0}{" "}
                    {inventoryList.find((inv) => inv.id === newComponent.inventoryId)
                      ?.stock.unit}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleAddComponent}
              disabled={isAdding || !newComponent.inventoryId || !newComponent.quantity}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors shadow-xs disabled:cursor-not-allowed disabled:opacity-50 min-h-11 w-full sm:w-auto"
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menambahkan...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Tambah ke BOM
                </>
              )}
            </button>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-3">
              Daftar Komponen ({components.length})
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : components.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-xl bg-card/40">
                <p className="text-sm font-semibold text-foreground">
                  Belum ada komponen di BOM
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Pilih bahan baku dari daftar inventori di atas untuk menyusun resep perakitan buket ini.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {components.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-4 border border-border rounded-xl bg-surface-container-low/40 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {comp.inventory?.stock?.name ?? "Unknown"}
                        {comp.inventory?.stock?.variety && (
                          <span className="text-sm text-muted-foreground ml-1">
                            ({comp.inventory.stock.variety})
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Kebutuhan: {comp.quantity ?? 0}{" "}
                        {comp.inventory?.stock?.unit || "tangkai"} • Stok tersedia:{" "}
                        {comp.inventory?.currentStock ?? 0}{" "}
                        {comp.inventory?.stock?.unit || "tangkai"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteComponent(comp.id)}
                      className="ml-3 p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                      title="Hapus komponen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border p-4 sm:p-6 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary min-h-11 w-full sm:w-auto text-sm">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
