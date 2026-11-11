import { Lock } from "lucide-react";

// Props interface untuk komponen ringkasan pembayaran checkout
interface CheckoutSummaryProps {
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  shippingCost: number;
  appliedCoupon?: {
    code: string;
    discountAmount: number;
  } | null;
  onCheckout: () => void;
  isProcessing?: boolean;
  isDisabled?: boolean;
}

// Component ringkasan pembayaran dengan detail harga dan tombol checkout
export function CheckoutSummary({
  subtotal,
  shippingCost,
  appliedCoupon,
  onCheckout,
  isProcessing = false,
  isDisabled = false,
}: CheckoutSummaryProps) {
  // Calculate discount dan total akhir
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, subtotal + shippingCost - discount);

  return (
    <section
      className="sticky top-24 overflow-hidden rounded-2xl border border-white/10 bg-[#10121b] p-6 text-white sm:p-7"
      aria-labelledby="checkout-summary-heading"
    >
      <div className="border-b border-white/10 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b4aeff]">
          Pembayaran
        </p>
        <h2 id="checkout-summary-heading" className="mt-1 text-2xl font-bold tracking-tight text-white">
          Ringkasan Pesanan
        </h2>
      </div>

      <dl className="mt-6 space-y-3.5 border-b border-white/10 pb-6 text-sm">
        <div className="flex items-center justify-between text-white/70">
          <dt>Subtotal Produk</dt>
          <dd className="font-semibold tabular-nums text-white">
            Rp {subtotal.toLocaleString("id-ID")}
          </dd>
        </div>
        <div className="flex items-center justify-between text-white/70">
          <dt>Ongkos Kirim</dt>
          <dd className="font-semibold tabular-nums text-white">
            Rp {shippingCost.toLocaleString("id-ID")}
          </dd>
        </div>
        {discount > 0 && appliedCoupon && (
          <div className="flex items-center justify-between text-[#09e354]">
            <dt className="text-xs uppercase tracking-wider">
              Diskon ({appliedCoupon.code})
            </dt>
            <dd className="font-bold tabular-nums">
              -Rp {discount.toLocaleString("id-ID")}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex items-baseline justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-white/60">
            Total Bayar
          </span>
          <p className="text-xs text-white/40">Termasuk ongkir & diskon</p>
        </div>
        <p className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Rp {finalTotal.toLocaleString("id-ID")}
        </p>
      </div>

      <button
        type="button"
        onClick={onCheckout}
        disabled={isProcessing || isDisabled}
        className="btn-primary mt-6 w-full text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? (
          <span>Memproses Pembayaran...</span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Bayar Sekarang
          </span>
        )}
      </button>
    </section>
  );
}
