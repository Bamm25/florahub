import React, { useState } from "react";
import { X, Loader2, Calendar, Flower2, CheckCircle2 } from "lucide-react";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";

// TODO: Backend MUST implement atomic capacity check:
// - Use database transaction with SELECT FOR UPDATE
// - Calculate sum(preOrders.quantity) at submission time
// - Reject if exceeds capacity
// Client validation is for UX only, not security

interface HarvestAnnouncement {
  id: string;
  flowerName: string;
  variety: string | null;
  estimatedQuantity: number;
  pricePerUnit: number;
  harvestDate: string;
  supplier: {
    id: string;
    name: string;
  };
  _count: {
    preOrders: number;
  };
  totalReservedQuantity?: number; // Sum of preOrder quantities (not count)
}

interface PreOrderModalProps {
  announcement: HarvestAnnouncement;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * PreOrderModal component
 * Form for creating pre-order from harvest announcement
 */
export default function PreOrderModal({
  announcement,
  isOpen,
  onClose,
  onSuccess,
}: PreOrderModalProps) {
  const [formData, setFormData] = useState({
    quantity: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const qtyValue = parseInt(formData.quantity, 10);
    if (!formData.quantity || isNaN(qtyValue) || qtyValue <= 0) {
      errors.quantity = "Quantity harus berupa angka valid dan lebih dari 0";
    }

    // FIXME: Backend should return totalReservedQuantity (sum of quantities, not count)
    const totalOrdered = announcement.totalReservedQuantity ?? announcement._count.preOrders ?? 0;
    const available = announcement.estimatedQuantity - totalOrdered;
    if (!isNaN(qtyValue) && qtyValue > available) {
      errors.quantity = `Hanya tersisa ${available} unit yang tersedia`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const qtyValue = parseInt(formData.quantity, 10);
      
      // Final validation before submission
      if (isNaN(qtyValue)) {
        throw new Error("Invalid quantity value");
      }
      
      const payload = {
        harvestAnnouncementId: announcement.id,
        quantity: qtyValue,
        notes: formData.notes || null,
      };

      const res = await fetch("/api/florist/preorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Gagal membuat pre-order");
      }

      // Show success notification
      setShowSuccess(true);
      
      // Reset form and close after brief delay
      setFormData({ quantity: "", notes: "" });
      setFormErrors({});
      
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setFormErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // FIXME: Backend should return totalReservedQuantity (sum of quantities, not count)
  const available = announcement.estimatedQuantity - (announcement.totalReservedQuantity ?? announcement._count.preOrders ?? 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
      <div className="card-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface-container-low border-b border-border p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Buat Pre-Order</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ajukan pre-order untuk jadwal panen ini
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {showSuccess && (
          <div className="p-4 bg-success/10 border border-success/30 rounded-xl flex items-center gap-3 text-success animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Pre-order berhasil dibuat!</p>
              <p className="text-sm opacity-90">Menunggu konfirmasi dari supplier</p>
            </div>
          </div>
        )}
        
        {formErrors.submit && (
          <div className="p-3 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            {formErrors.submit}
          </div>
        )}

        <div className="p-4 bg-surface-container-low rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <Flower2 className="w-10 h-10 text-primary" />
            <div>
              <p className="text-base font-semibold text-foreground">
                {announcement.flowerName}
                {announcement.variety && (
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    ({announcement.variety})
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                Supplier: {announcement.supplier.name}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Harga per Unit</p>
              <p className="text-sm font-semibold text-foreground">
                {formatRupiah(announcement.pricePerUnit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tanggal Panen</p>
              <p className="text-sm font-semibold text-foreground">
                {formatDate(announcement.harvestDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kapasitas Estimasi</p>
              <p className="text-sm font-semibold text-foreground">
                {announcement.estimatedQuantity}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tersedia</p>
              <p className="text-sm font-semibold text-success">{available}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Quantity <span className="text-error">*</span>
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: e.target.value })
            }
            className={`input-field ${formErrors.quantity ? "border-error" : ""}`}
            placeholder="Jumlah yang ingin di-preorder"
            min="1"
          />
          {formErrors.quantity && (
            <p className="mt-1 text-sm text-error">{formErrors.quantity}</p>
          )}
        </div>

        {formData.quantity && !isNaN(parseInt(formData.quantity, 10)) && parseInt(formData.quantity, 10) > 0 && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-sm text-muted-foreground">Estimasi Total</p>
            <p className="text-2xl font-bold text-primary">
              {formatRupiah(
                parseInt(formData.quantity, 10) * announcement.pricePerUnit,
              )}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Catatan (Opsional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={3}
            className="input-field resize-none"
            placeholder="Tambahkan catatan untuk supplier..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn-secondary text-sm"
            disabled={isSubmitting || showSuccess}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || showSuccess}
            className="flex-1 btn-primary text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                Kirim Pre-Order
              </>
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
