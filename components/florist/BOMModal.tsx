"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, Loader2, Package, AlertCircle } from "lucide-react";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";

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

interface ProductComponent {
  id: string;
  quantity: number;
  inventory: ComponentInventory;
}

interface BOMModalProps {
  isOpen: boolean;
  productId: string;
  productName: string;
  onClose: () => void;
}

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
    
    // Fetch components list
    fetchPaginatedCollection<ProductComponent>(`/api/florist/products/${productId}/components`, "items")
      .then((items) => { 
        if (active) {
          setComponents(items);
          console.log('[BOMModal] Loaded components:', items.length);
        }
      })
      .catch((err) => { 
        if (active) {
          const msg = err instanceof Error ? err.message : "Gagal memuat komponen";
          setError(msg);
          console.error('[BOMModal] Components error:', msg);
        }
      })
      .finally(() => { if (active) setIsLoading(false); });
    
    // Fetch inventory list for dropdown
    fetchPaginatedCollection<FloristInventory>("/api/florist/inventory", "inventories")
      .then((inventories) => { 
        if (active) {
          setInventoryList(inventories);
          console.log('[BOMModal] Loaded inventory options:', inventories.length, inventories);
        }
      })
      .catch((err) => { 
        if (active) {
          const msg = err instanceof Error ? err.message : "Gagal memuat inventory";
          setError(msg);
          console.error('[BOMModal] Inventory error:', msg);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
      <div className="card-elevated w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="sticky top-0 z-50 bg-surface-container-low border-b border-border p-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Komponen Produk (BOM)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {productName} - Bill of Materials bahan baku penyusun
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-error/5 border border-error/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <div className="card-elevated p-5 space-y-4">
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
                  className="w-full px-3 py-2 bg-surface-container border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
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
                  className="w-full px-3 py-2 bg-surface-container border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
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
              className="btn-primary w-full sm:w-auto text-sm"
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
              <div className="text-center py-12 border border-dashed border-border rounded-xl bg-surface-container-low/40">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Belum ada komponen
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tambahkan bahan baku dari inventory untuk produk ini
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

        <div className="sticky bottom-0 bg-surface-container-low border-t border-border p-6 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary w-full sm:w-auto">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
