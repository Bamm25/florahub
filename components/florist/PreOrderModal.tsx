import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/forms/Modal";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";
import { createFloristPreOrder } from "@/lib/api/florist";
import { ApiClientError } from "@/lib/api/client";

// Interface data jadwal pengumuman panen dari supplier
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
  totalReservedQuantity?: number;
}

// Props interface untuk modal pengajuan pre-order
interface PreOrderModalProps {
  announcement: HarvestAnnouncement;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Modal formulir pengajuan pre-order bunga ke supplier
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
  const successTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const qtyValue = parseInt(formData.quantity, 10);
    if (!formData.quantity || isNaN(qtyValue) || qtyValue <= 0) {
      errors.quantity = "Quantity harus berupa angka valid dan lebih dari 0";
    }

    // Hitung sisa kuantitas bunga yang masih dapat dipesan
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
      
      // Validasi akhir kuantitas sebelum pengiriman
      if (isNaN(qtyValue)) {
        throw new Error("Invalid quantity value");
      }
      
      const payload = {
        harvestAnnouncementId: announcement.id,
        quantity: qtyValue,
        notes: formData.notes || null,
      };

      await createFloristPreOrder(payload);

      // Tampilkan notifikasi berhasil
      setShowSuccess(true);

      // Reset form dan tutup modal setelah jeda singkat
      setFormData({ quantity: "", notes: "" });
      setFormErrors({});

      successTimerRef.current = window.setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
      }, 1500);
    } catch (err) {
      if (err instanceof ApiClientError && Array.isArray(err.errors)) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((fieldErr: { path?: (string | number)[]; message?: string }) => {
          const field = String(fieldErr.path?.[0] || "submit");
          fieldErrors[field] = fieldErr.message || "Terjadi kesalahan";
        });
        setFormErrors(fieldErrors);
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      setFormErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hitung sisa stok bunga yang tersedia untuk dipesan
  const available = announcement.estimatedQuantity - (announcement.totalReservedQuantity ?? announcement._count.preOrders ?? 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      headerVariant="dark"
      kicker="Pengajuan Kuota"
      title="Buat Pre-Order Panen"
      subtitle="Ajukan alokasi bunga potong sebelum tanggal panen tiba"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {showSuccess && (
          <div role="status" className="p-4 bg-success/10 border border-success/30 rounded-xl text-success">
            <p className="font-medium">Pre-order berhasil dibuat!</p>
            <p className="text-sm opacity-90">Menunggu konfirmasi dari supplier</p>
          </div>
        )}
        
        {formErrors.submit && (
          <div role="alert" className="p-3 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
            {formErrors.submit}
          </div>
        )}

        <div className="p-4 bg-surface-container-low rounded-xl space-y-3 border border-border/80">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Supplier: {announcement.supplier.name}
            </p>
            <p className="text-base font-semibold text-foreground mt-0.5">
              {announcement.flowerName}
              {announcement.variety && (
                <span className="text-sm text-muted-foreground font-normal ml-1">
                  ({announcement.variety})
                </span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Harga/Unit</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {formatRupiah(announcement.pricePerUnit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tgl Panen</p>
              <p className="text-sm font-semibold text-foreground">
                {formatDate(announcement.harvestDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Kuota</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {announcement.estimatedQuantity}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sisa Tersedia</p>
              <p className="text-sm font-semibold text-primary tabular-nums">{available}</p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="preorder-quantity" className="block text-sm font-medium text-foreground mb-2">
            Quantity <span className="text-error">*</span>
          </label>
          <input
            id="preorder-quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: e.target.value })
            }
            className={`input-field ${formErrors.quantity ? "border-error" : ""}`}
            placeholder="Jumlah yang ingin di-preorder"
            min="1"
            aria-invalid={Boolean(formErrors.quantity) || undefined}
          />
          {formErrors.quantity && (
            <p role="alert" className="mt-1 text-sm text-error">{formErrors.quantity}</p>
          )}
        </div>

        {formData.quantity && !isNaN(parseInt(formData.quantity, 10)) && parseInt(formData.quantity, 10) > 0 && (
          <div className="p-4 bg-surface-container-low border border-border rounded-xl">
            <p className="text-sm text-muted-foreground">Estimasi Total</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatRupiah(
                parseInt(formData.quantity, 10) * announcement.pricePerUnit,
              )}
            </p>
          </div>
        )}

        <div>
          <label htmlFor="preorder-notes" className="block text-sm font-medium text-foreground mb-2">
            Catatan (Opsional)
          </label>
          <textarea
            id="preorder-notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={3}
            className="input-field"
            placeholder="Tambahkan catatan untuk supplier..."
          />
        </div>

        <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary min-h-11 flex-1 text-sm"
            disabled={isSubmitting || showSuccess}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || showSuccess}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors disabled:opacity-50 min-h-11 flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Mengirim...
              </>
            ) : (
              "Kirim Pre-Order"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
