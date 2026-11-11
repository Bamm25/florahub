import { X, Loader2, Package } from "lucide-react";

// Interface data inventaris bahan baku florist
interface InventoryItem {
  id: string;
  quantity: number;
  minThreshold: number;
  maxCapacity: number | null;
  location: string | null;
  lastRestockDate: string | null;
  isLowStock: boolean;
  stock: {
    id: string;
    name: string;
    variety: string | null;
    unit: string;
    pricePerUnit: number;
    harvestDate: string;
    supplier: {
      id: string;
      name: string;
      email: string;
    };
  };
}

// Props interface untuk modal penyesuaian inventaris bahan baku
interface InventoryModalProps {
  inventory: InventoryItem;
  formData: {
    quantity: string;
    location: string;
  };
  formErrors: Record<string, string>;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (field: string, value: string) => void;
}

// Modal formulir untuk penyesuaian jumlah stok dan lokasi penyimpanan bahan baku
export default function InventoryModal({
  inventory,
  formData,
  formErrors,
  isSubmitting,
  onClose,
  onSubmit,
  onFormChange,
}: InventoryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="rounded-2xl border border-border bg-card w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
        <div className="sticky top-0 z-50 bg-[#181720] text-white p-5 sm:p-6 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Penyesuaian Fisik</p>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white mt-1">
              Update Inventori Bunga
            </h2>
            <p className="text-xs text-zinc-300 mt-0.5">
              Perbarui jumlah stok fisik atau lokasi cold storage
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="min-h-0 p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {formErrors.submit && (
            <div className="p-3 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
              {formErrors.submit}
            </div>
          )}

          <div className="p-4 bg-surface-container-low rounded-xl border border-border/80">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Supplier: {inventory.stock?.supplier?.name || "Unknown"}
              </p>
              <p className="text-base font-semibold text-foreground mt-0.5">
                {inventory.stock?.name || "Unknown"}
                {inventory.stock?.variety && (
                  <span className="text-sm text-muted-foreground font-normal ml-1">
                    ({inventory.stock.variety})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Quantity ({inventory.stock.unit}) <span className="text-error">*</span>
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || parseInt(value) >= 0) {
                  onFormChange("quantity", value);
                }
              }}
              className={`input-field ${formErrors.quantity ? "border-error" : ""}`}
              placeholder="100"
              min="0"
            />
            {formErrors.quantity && (
              <p className="mt-1 text-sm text-error">{formErrors.quantity}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Lokasi Penyimpanan
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => onFormChange("location", e.target.value)}
              className="input-field"
              placeholder="Contoh: Rak A-3, Cold Storage 2"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary min-h-11 flex-1 text-sm"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors shadow-xs disabled:opacity-50 min-h-11 flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
