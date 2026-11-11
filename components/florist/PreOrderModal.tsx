import React, { useState } from "react";
import { X, Loader2, Calendar, CheckCircle2 } from "lucide-react";
import { formatDate, formatRupiah } from "@/lib/utils/formatters";

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

      const res = await fetch("/api/florist/preorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        // Tangani pesan error spesifik per field dari server
        if (json.errors && Array.isArray(json.errors)) {
          const fieldErrors: Record<string, string> = {};
          json.errors.forEach((err: { path?: string[]; message?: string }) => {
            const field = err.path?.[0] || 'submit';
            fieldErrors[field] = err.message || 'Terjadi kesalahan';
          });
          setFormErrors(fieldErrors);
          return;
        }
        throw new Error(json.message || "Gagal membuat pre-order");
      }

      // Tampilkan notifikasi berhasil
      setShowSuccess(true);
      
      // Reset form dan tutup modal setelah jeda singkat
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

  // Hitung sisa stok bunga yang tersedia untuk dipesan
  const available = announcement.estimatedQuantity - (announcement.totalReservedQuantity ?? announcement._count.preOrders ?? 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="rounded-2xl border border-border bg-card w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
        <div className="sticky top-0 z-50 bg-[#181720] text-white p-5 sm:p-6 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Pengajuan Kuota</p>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white mt-1">
              Buat Pre-Order Panen
            </h2>
            <p className="text-xs text-zinc-300 mt-0.5">
              Ajukan alokasi bunga potong sebelum tanggal panen tiba
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      <form onSubmit={handleSubmit} className="min-h-0 p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
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
              <p className="text-sm font-semibold text-emerald-500 tabular-nums">{available}</p>
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
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors shadow-xs disabled:opacity-50 min-h-11 flex-1"
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
