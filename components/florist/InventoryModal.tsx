import { X, Loader2, Package, Flower2 } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
      <div className="card-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface-container-low border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Update Inventory</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Perbarui quantity atau lokasi penyimpanan
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {formErrors.submit && (
            <div className="p-3 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
              {formErrors.submit}
            </div>
          )}

          <div className="p-4 bg-surface-container-low rounded-xl">
            <div className="flex items-center gap-3">
              <Flower2 className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {inventory.stock?.name || 'Unknown'}
                  {inventory.stock?.variety && (
                    <span className="text-muted-foreground">
                      {" "}({inventory.stock.variety})
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supplier: {inventory.stock?.supplier?.name || 'Unknown'}
                </p>
              </div>
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

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary text-sm"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary text-sm"
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
