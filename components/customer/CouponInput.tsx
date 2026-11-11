"use client";

import { CheckCircle } from "lucide-react";

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
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="coupon-heading">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Potongan Harga</p>
        <h2 id="coupon-heading" className="mt-1 text-base font-bold text-foreground">
          Kode Promo (Opsional)
        </h2>
      </div>

      <div aria-live="polite">
        {couponError && (
          <div role="alert" className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3.5 text-sm text-error">
            <span className="font-medium">{couponError}</span>
          </div>
        )}
      </div>

      {appliedCoupon ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <div>
              <p className="font-mono text-sm font-bold tracking-wider text-foreground">
                {appliedCoupon.code}
              </p>
              <p className="text-xs text-muted-foreground">
                Hemat Rp {appliedCoupon.discountAmount.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-semibold text-error underline-offset-4 hover:underline"
          >
            Hapus Kupon
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            aria-label="Kode promo"
            value={couponCode}
            onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
            placeholder="Contoh: FLORA10"
            className="h-11 flex-1 rounded-xl border border-border bg-input px-3.5 font-mono text-sm tracking-wider uppercase text-foreground placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={onApply}
            disabled={isValidatingCoupon || !couponCode.trim()}
            className="btn-primary h-11 px-7 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isValidatingCoupon ? "Mengecek..." : "Terapkan"}
          </button>
        </div>
      )}
    </section>
  );
}
