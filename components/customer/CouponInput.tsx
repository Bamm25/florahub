"use client";

import { formatRupiah } from "@/lib/utils/formatters";

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

// Form mandiri untuk menerapkan atau menghapus kode promo di checkout
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
    <section
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      aria-labelledby="coupon-heading"
    >
      <h2
        id="coupon-heading"
        className="mb-4 text-base font-semibold text-foreground"
      >
        Kode Promo{" "}
        <span className="font-normal text-muted-foreground">(opsional)</span>
      </h2>

      <div aria-live="polite">
        {couponError && (
          <div
            id="coupon-error"
            role="alert"
            className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3.5 text-sm text-error"
          >
            <span className="font-medium">{couponError}</span>
          </div>
        )}
      </div>

      {appliedCoupon ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-container-low p-4">
          <div>
            <p className="font-mono text-sm font-bold tracking-wider text-foreground">
              {appliedCoupon.code}
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">
              Hemat {formatRupiah(appliedCoupon.discountAmount)}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="min-h-9 px-2 text-xs font-semibold text-error underline-offset-4 hover:underline"
          >
            Hapus
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isValidatingCoupon) {
              onApply();
            }
          }}
          className="flex flex-col gap-3 sm:flex-row"
          noValidate
        >
          <label htmlFor="coupon-code" className="sr-only">
            Kode promo
          </label>
          <input
            id="coupon-code"
            name="couponCode"
            type="text"
            value={couponCode}
            onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
            placeholder="Contoh: FLORA10"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="done"
            aria-invalid={Boolean(couponError)}
            aria-describedby={couponError ? "coupon-error" : undefined}
            className="h-11 flex-1 rounded-xl border border-border bg-input px-3.5 font-mono text-sm uppercase tracking-wider text-foreground placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={isValidatingCoupon}
            className="btn-primary h-11 px-7 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isValidatingCoupon ? "Mengecek..." : "Terapkan"}
          </button>
        </form>
      )}
    </section>
  );
}
