import { formatRupiah } from "@/lib/utils/formatters";

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
  isCalculatingShipping?: boolean;
  hasMultipleFlorists?: boolean;
}

// Ringkasan pembayaran sticky gelap dengan total dan nominal tombol bayar eksplisit
export function CheckoutSummary({
  items,
  subtotal,
  shippingCost,
  appliedCoupon,
  onCheckout,
  isProcessing = false,
  isDisabled = false,
  isCalculatingShipping = false,
  hasMultipleFlorists = false,
}: CheckoutSummaryProps) {
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, subtotal + shippingCost - discount);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const buttonDisabled =
    isProcessing || isDisabled || isCalculatingShipping || hasMultipleFlorists;

  return (
    <section
      className="sticky top-24 overflow-hidden rounded-2xl border border-white/10 bg-surface-dark p-6 text-white sm:p-7"
      aria-labelledby="checkout-summary-heading"
    >
      <h2
        id="checkout-summary-heading"
        className="text-xl font-bold tracking-tight text-white sm:text-2xl"
      >
        Ringkasan Pembayaran
      </h2>

      <dl className="mt-5 space-y-3.5 border-t border-white/10 pt-5 text-sm">
        <div className="flex items-center justify-between text-white/75">
          <dt>Subtotal ({itemCount} produk)</dt>
          <dd className="font-semibold tabular-nums text-white">
            {formatRupiah(subtotal)}
          </dd>
        </div>
        <div className="flex items-center justify-between text-white/75">
          <dt>Ongkos kirim</dt>
          <dd className="font-semibold tabular-nums text-white">
            {isCalculatingShipping ? (
              <span className="text-xs font-normal text-white/60">
                Menghitung...
              </span>
            ) : (
              formatRupiah(shippingCost)
            )}
          </dd>
        </div>
        {discount > 0 && appliedCoupon && (
          <div className="flex items-center justify-between text-success">
            <dt className="text-xs uppercase tracking-wider">
              Diskon ({appliedCoupon.code})
            </dt>
            <dd className="font-semibold tabular-nums">
              -{formatRupiah(discount)}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex items-baseline justify-between border-t border-white/10 pt-6">
        <span className="text-sm font-medium text-white/75">Total</span>
        <p className="text-2xl font-extrabold tracking-tight tabular-nums text-white sm:text-3xl">
          {formatRupiah(finalTotal)}
        </p>
      </div>

      <button
        type="button"
        onClick={onCheckout}
        disabled={buttonDisabled}
        className="btn-primary mt-6 w-full text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {hasMultipleFlorists ? (
          <span>Pilih produk dari 1 toko</span>
        ) : isProcessing ? (
          <span>Memproses...</span>
        ) : finalTotal === 0 ? (
          <span>Selesaikan Pesanan</span>
        ) : (
          <span className="tabular-nums">
            Bayar · {formatRupiah(finalTotal)}
          </span>
        )}
      </button>
    </section>
  );
}
