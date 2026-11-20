"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import Modal from "@/components/forms/Modal";
import { produceFloristProduct } from "@/lib/api/florist";
import { ApiClientError } from "@/lib/api/client";

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
  onSuccess: (message: string) => void;
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

  const handleClose = () => {
    setError("");
    onClose();
  };

  // Ambil data komponen BOM terbaru saat modal dibuka
  useEffect(() => {
    if (!isOpen || !product?.id) return;

    const controller = new AbortController();

    fetch(`/api/florist/products/${product.id}/components`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        if (!controller.signal.aborted && json.success && Array.isArray(json.data?.items)) {
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
      .catch(() => {
        // Abaikan error memuat komponen opsional saat modal ditutup
      });

    return () => controller.abort();
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
      const data = await produceFloristProduct(product.id, qty);

      const summaryMessage = `Berhasil memproduksi ${qty} unit "${product.name}". Stok produk jadi bertambah menjadi ${product.stock + qty} unit dan bahan baku telah dikurangi sesuai BOM.${data.lowStockTriggered ? " Perhatian: beberapa bahan baku mencapai batas stok rendah." : ""}`;

      if (data.lowStockTriggered && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("florahub:notifications-updated"));
      }
      setQuantity("1");
      setError("");
      onSuccess(summaryMessage);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        const insufficient = (err.errors as unknown as { insufficientMaterials?: string[] })?.insufficientMaterials;
        if (Array.isArray(insufficient)) {
          setError(`Bahan baku tidak mencukupi:\n${insufficient.join("\n")}`);
          return;
        }
      }
      setError(err instanceof Error ? err.message : "Gagal memproduksi produk");
    } finally {
      setIsProducing(false);
    }
  };

  if (!product) return null;

  const hasBOM = loadedComponents && loadedComponents.length > 0;
  const qty = Number(quantity) || 0;
  const maxProducible = hasBOM
    ? Math.min(
        ...loadedComponents.map((comp) =>
          Math.floor(comp.inventory.quantity / Math.max(1, comp.quantity))
        )
      )
    : 0;
  const allMaterialsSufficient =
    hasBOM &&
    qty > 0 &&
    loadedComponents.every((comp) => comp.inventory.quantity >= comp.quantity * qty);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      headerVariant="dark"
      kicker="Produksi Buket"
      title={product.name}
      subtitle={`Stok saat ini: ${product.stock} unit`}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-sm border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-low sm:w-auto"
            disabled={isProducing}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleProduce}
            disabled={isProducing || !hasBOM || qty <= 0 || !allMaterialsSufficient}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isProducing && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            <span>{isProducing ? "Memproduksi..." : "Produksi Sekarang"}</span>
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-error/20 bg-error/5 p-3.5">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error" />
            <p className="whitespace-pre-line text-sm text-error">{error}</p>
          </div>
        )}

        {!hasBOM && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/5 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold text-warning">
                Produk ini belum memiliki Bill of Materials (BOM)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Tambahkan komponen bahan baku terlebih dahulu melalui tombol &quot;BOM&quot; pada kartu produk.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 rounded-2xl border border-border bg-surface-container-low/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold tracking-normal text-foreground">
                Jumlah Produksi
              </h3>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                Maks. dapat dirakit sekarang:{" "}
                <strong className="font-semibold text-foreground">
                  {maxProducible} unit
                </strong>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {["1", "3", "5", "10"].map((presetQty) => (
                <button
                  key={presetQty}
                  type="button"
                  disabled={isProducing || !hasBOM}
                  onClick={() => setQuantity(presetQty)}
                  className={`rounded-sm border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors ${
                    quantity === presetQty
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  +{presetQty} unit
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="produce-quantity-input"
              className="mb-1.5 block text-xs font-medium text-foreground"
            >
              Berapa unit buket yang ingin dirakit?
            </label>
            <input
              id="produce-quantity-input"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              min="1"
              className="input-field w-full text-sm tabular-nums"
              disabled={isProducing || !hasBOM}
            />
            {qty > 0 && (
              <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
                Estimasi stok produk jadi:{" "}
                <strong className="font-semibold text-foreground">
                  {product.stock} → {product.stock + qty} unit
                </strong>
              </p>
            )}
          </div>
        </div>

        {hasBOM && qty > 0 && loadedComponents && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-normal text-foreground">
                Kebutuhan Bahan Baku
              </h3>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  allMaterialsSufficient
                    ? "border-success/25 bg-success/10 text-success"
                    : "border-error/25 bg-error/10 text-error"
                }`}
              >
                {allMaterialsSufficient ? "Semua bahan cukup" : "Bahan tidak cukup"}
              </span>
            </div>

            <div className="space-y-2.5">
              {loadedComponents.map((comp) => {
                const required = comp.quantity * qty;
                const available = comp.inventory.quantity;
                const sufficient = available >= required;
                const unit = comp.inventory.stock.unit || "tangkai";

                return (
                  <div
                    key={comp.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${
                      sufficient
                        ? "border-border bg-surface-container-low/60"
                        : "border-error/25 bg-error/5"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {comp.inventory.stock.name}
                        {comp.inventory.stock.variety && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({comp.inventory.stock.variety})
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {comp.quantity} {unit} per buket
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      <p
                        className={`text-sm font-semibold ${
                          sufficient ? "text-foreground" : "text-error"
                        }`}
                      >
                        {required} {unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tersedia: {available} {unit}
                      </p>
                    </div>
                    {!sufficient && (
                      <AlertCircle className="h-4 w-4 flex-shrink-0 text-error" aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
