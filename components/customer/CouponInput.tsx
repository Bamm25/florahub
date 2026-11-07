"use client";

import { Tag, AlertCircle, CheckCircle, Trash2 } from "lucide-react";

// Interface untuk data kupon yang sudah diapply
interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

// Props interface untuk komponen input kupon diskon
interface CouponInputProps {
  couponCode: string;
  isValidatingCoupon: boolean;
  couponError: string | null;
  appliedCoupon: AppliedCoupon | null;
  onCouponCodeChange: (value: string) => void;
  onApply: () => void;
  onRemove: () => void;
}

// Input component untuk apply dan display kupon diskon
export default function CouponInput({
  couponCode,
  isValidatingCoupon,
  couponError,
  appliedCoupon,
  onCouponCodeChange,
  onApply,
  onRemove,
}: CouponInputProps) {
  return (
    <div className="card-elevated">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
          <Tag className="h-6 w-6 text-secondary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Kode Promo (Opsional)
        </h2>
      </div>

      {couponError && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-error/5 p-4 text-sm text-error border border-error/20">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="font-medium">{couponError}</span>
        </div>
      )}

      {appliedCoupon ? (
        <div className="flex items-center justify-between rounded-xl border-2 border-success bg-success/5 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-success" />
            <div>
              <p className="text-base font-bold text-success">
                {appliedCoupon.code}
              </p>
              <p className="text-sm text-success/80">
                Hemat Rp {appliedCoupon.discountAmount.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-2 text-sm font-semibold text-error hover:text-error/80 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
            placeholder="Contoh: FLORA10"
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={onApply}
            disabled={isValidatingCoupon || !couponCode.trim()}
            className="btn-primary px-8 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isValidatingCoupon ? "Mengecek..." : "Terapkan"}
          </button>
        </div>
      )}
    </div>
  );
}
