"use client";

import { useState, useEffect } from "react";
import { X, Package, AlertCircle, Loader2, CheckCircle } from "lucide-react";

// Interface komponen bahan baku BOM untuk perakitan produk
interface ProductComponent {
  id: string;
  quantity: number;
  inventory: {
    id: string;
    quantity: number;
    stock: {
      name: string;
      variety: string | null;
      unit: string;
    };
  };
}

// Interface data produk florist yang akan dirakit
interface Product {
  id: string;
  name: string;
  stock: number;
  productComponents?: ProductComponent[];
}

// Props interface untuk modal perakitan dan produksi produk jadi
interface ProduceModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Modal formulir perakitan produk florist dengan pengurangan stok bahan baku otomatis
export default function ProduceModal({
  isOpen,
  product,
  onClose,
  onSuccess,
}: ProduceModalProps) {
  const [quantity, setQuantity] = useState("1");
  const [isProducing, setIsProducing] = useState(false);
  const [error, setError] = useState("");
  const [loadedComponents, setLoadedComponents] = useState<ProductComponent[]>(
    product?.productComponents || []
  );

  // Ambil data komponen BOM terbaru saat modal dibuka
  useEffect(() => {
    if (!isOpen || !product?.id) return;

    fetch(`/api/florist/products/${product.id}/components`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.items)) {
          setLoadedComponents(
            json.data.items.map((item: { id: string; quantity: number; inventory: { id: string; currentStock?: number; quantity?: number; stock: { name: string; variety: string | null; unit: string } } }) => ({
              id: item.id,
              quantity: item.quantity,
              inventory: {
                id: item.inventory.id,
                quantity: item.inventory.currentStock ?? item.inventory.quantity ?? 0,
                stock: item.inventory.stock,
              },
            }))
          );
        }
      })
      .catch((err) => {
        console.error("[ProduceModal] Error loading components:", err);
      });
  }, [isOpen, product?.id]);

  const handleProduce = async () => {
    if (!product) return;

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError("Jumlah produksi harus lebih dari 0");
      return;
    }

    setIsProducing(true);
    setError("");

    try {
      const res = await fetch(`/api/florist/products/${product.id}/produce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.data?.insufficientMaterials) {
          setError(
            `Bahan baku tidak mencukupi:\n${json.data.insufficientMaterials.join("\n")}`
          );
        } else {
          setError(json.message || "Gagal memproduksi produk");
        }
        return;
      }

      alert(
        `✅ Berhasil memproduksi ${qty} ${product.name}!\n\nBahan baku telah dikurangi dan stok produk jadi bertambah.${json.data?.lowStockTriggered ? "\n\n⚠️ Perhatian: Beberapa bahan baku telah mencapai threshold rendah." : ""}`
      );
      onSuccess();
      onClose();
      setQuantity("1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproduksi produk");
    } finally {
      setIsProducing(false);
    }
  };

  if (!isOpen || !product) return null;

  const hasBOM = loadedComponents && loadedComponents.length > 0;
  const qty = Number(quantity) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="rounded-2xl border border-border bg-card w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
        <div className="sticky top-0 z-50 bg-[#181720] text-white p-5 sm:p-6 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Produksi Buket</p>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white mt-1">
              {product.name}
            </h2>
            <p className="text-xs text-zinc-300 mt-0.5">
              Stok saat ini: {product.stock} unit
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
              <p className="text-sm text-error whitespace-pre-line">{error}</p>
            </div>
          )}

          {!hasBOM && (
            <div className="flex items-start gap-3 p-4 bg-warning/5 border border-warning/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-warning font-medium">
                  Produk ini belum memiliki Bill of Materials (BOM)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tambahkan komponen bahan baku terlebih dahulu melalui tombol &quot;Komponen&quot; pada kartu produk.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
            <h3 className="font-medium text-foreground">Jumlah Produksi</h3>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Berapa unit yang ingin diproduksi?
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                min="1"
                className="input-field w-full text-sm"
                disabled={isProducing || !hasBOM}
              />
            </div>
          </div>

          {hasBOM && qty > 0 && loadedComponents && (
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
              <h3 className="font-medium text-foreground">Kebutuhan Bahan Baku</h3>
              <div className="space-y-3">
                {loadedComponents.map((comp) => {
                  const required = comp.quantity * qty;
                  const available = comp.inventory.quantity;
                  const sufficient = available >= required;

                  return (
                    <div
                      key={comp.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        sufficient
                          ? "bg-surface-container-low border-border"
                          : "bg-error/5 border-error/20"
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {comp.inventory.stock.name}
                          {comp.inventory.stock.variety &&
                            ` (${comp.inventory.stock.variety})`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {comp.quantity} {comp.inventory.stock.unit || "tangkai"} per buket
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            sufficient ? "text-foreground" : "text-error"
                          }`}
                        >
                          {required} {comp.inventory.stock.unit || "tangkai"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tersedia: {available} {comp.inventory.stock.unit || "tangkai"}
                        </p>
                      </div>
                      {sufficient ? (
                        <CheckCircle className="w-5 h-5 text-success ml-3 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-error ml-3 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-50 bg-card border-t border-border p-4 sm:p-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="btn-secondary min-h-11 w-full sm:w-auto text-sm"
            disabled={isProducing}
          >
            Batal
          </button>
          <button
            onClick={handleProduce}
            disabled={isProducing || !hasBOM || qty <= 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors shadow-xs disabled:cursor-not-allowed disabled:opacity-50 min-h-11 w-full sm:w-auto"
          >
            {isProducing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproduksi...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Produksi Sekarang
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
