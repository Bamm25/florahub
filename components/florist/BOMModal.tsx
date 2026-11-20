"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Loader2, AlertCircle } from "lucide-react";
import Modal from "@/components/forms/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { fetchPaginatedCollection } from "@/lib/fetchPaginatedCollection";
import { addProductComponent, deleteProductComponent } from "@/lib/api/florist";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
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
      await addProductComponent(productId, {
        inventoryId: newComponent.inventoryId,
        quantity: qty,
      });

      setNewComponent({ inventoryId: "", quantity: "" });
      await fetchComponents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah komponen");
    } finally {
      setIsAdding(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    setError("");

    try {
      await deleteProductComponent(productId, pendingDeleteId);
      setPendingDeleteId(null);
      await fetchComponents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus komponen");
      setPendingDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedInventory = inventoryList.find(
    (inv) => inv.id === newComponent.inventoryId,
  );
  const maxProducible =
    components.length > 0
      ? Math.min(
          ...components.map((comp) =>
            Math.floor(
              (comp.inventory?.currentStock ?? 0) / Math.max(1, comp.quantity),
            ),
          ),
        )
      : 0;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        headerVariant="dark"
        kicker="Bill of Materials"
        title="Komponen Produk (BOM)"
        subtitle={`${productName} — formula kebutuhan bahan baku per buket`}
        footer={
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low sm:w-auto"
          >
            Tutup
          </button>
        }
      >
        <div className="space-y-5">
          {error && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-error/20 bg-error/5 p-3.5">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-border bg-surface-container-low/40 p-4 sm:p-5">
            <div>
              <h3 className="text-sm font-semibold tracking-normal text-foreground">
                Tambah Komponen Baru
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tentukan bahan baku dan takaran untuk merakit 1 unit buket.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <label
                  htmlFor="bom-inventory-select"
                  className="mb-1.5 block text-xs font-medium text-foreground"
                >
                  Pilih Bahan Baku Inventori
                </label>
                <select
                  id="bom-inventory-select"
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
                      {inv.stock.variety && ` (${inv.stock.variety})`} — Stok:{" "}
                      {inv.quantity} {inv.stock.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="bom-quantity-input"
                  className="mb-1.5 block text-xs font-medium text-foreground"
                >
                  Jumlah ({selectedInventory?.stock.unit || "tangkai"}/buket)
                </label>
                <input
                  id="bom-quantity-input"
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
                  max={selectedInventory?.quantity || undefined}
                  className="input-field w-full text-sm tabular-nums"
                  disabled={isAdding}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs tabular-nums text-muted-foreground">
                {selectedInventory ? (
                  <>
                    Stok tersedia saat ini:{" "}
                    <strong className="font-semibold text-foreground">
                      {selectedInventory.quantity} {selectedInventory.stock.unit}
                    </strong>
                  </>
                ) : (
                  "Pilih bahan baku untuk melihat sisa stok inventori."
                )}
              </p>

              <button
                type="button"
                onClick={handleAddComponent}
                disabled={isAdding || !newComponent.inventoryId || !newComponent.quantity}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Menambahkan...
                  </>
                ) : (
                  <>
                    Tambah ke BOM
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-normal text-foreground">
                  Daftar Komponen
                </h3>
                <span className="inline-flex items-center rounded-full border border-border bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {components.length} bahan
                </span>
              </div>
              {components.length > 0 && (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                    maxProducible > 0
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-warning/30 bg-warning/10 text-warning"
                  }`}
                >
                  Maks. produksi: {maxProducible} buket
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : components.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/40 py-9 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Belum ada komponen di BOM
                </p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                  Pilih bahan baku dari daftar inventori di atas untuk menyusun resep perakitan buket ini.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {components.map((comp) => {
                  const currentStock = comp.inventory?.currentStock ?? 0;
                  const unit = comp.inventory?.stock?.unit || "tangkai";
                  const isInsufficient = currentStock < (comp.quantity ?? 0);

                  return (
                    <div
                      key={comp.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                        isInsufficient
                          ? "border-warning/35 bg-warning/5"
                          : "border-border bg-surface-container-low/40 hover:bg-surface-container-low"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {comp.inventory?.stock?.name ?? "Unknown"}
                          {comp.inventory?.stock?.variety && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              ({comp.inventory.stock.variety})
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                          Kebutuhan:{" "}
                          <strong className="font-semibold text-foreground">
                            {comp.quantity ?? 0} {unit}
                          </strong>{" "}
                          • Stok tersedia:{" "}
                          <span className={isInsufficient ? "font-semibold text-warning" : ""}>
                            {currentStock} {unit}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(comp.id)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-error transition-colors hover:bg-error/10"
                        title="Hapus komponen"
                        aria-label="Hapus komponen dari BOM"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteId)}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Komponen BOM"
        description="Hapus komponen bahan baku ini dari resep perakitan produk?"
        confirmLabel="Hapus Komponen"
        variant="danger"
        loading={isDeleting}
      />
    </>
  );
}
