"use client";

// Interface untuk data kupon yang sudah diapply
interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

// Props interface untuk komponen ringkasan order dan checkout
interface OrderSummaryProps {
  subtotal: number;
  shippingCost: number;
  appliedCoupon: AppliedCoupon | null;
  finalTotal: number;
  isLoading: boolean;
  canCheckout: boolean;
  onCheckout: () => void;
}

// Sticky sidebar dengan breakdown harga dan tombol checkout
export default function OrderSummary({
  subtotal,
  shippingCost,
  appliedCoupon,
  finalTotal,
  isLoading,
  canCheckout,
  onCheckout,
}: OrderSummaryProps) {
  // Calculate discount amount dari kupon yang diapply
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;

  return (
    <div className="lg:col-span-1">
      <section
        className="sticky top-24 min-w-0 overflow-hidden rounded-2xl border border-border bg-card"
        aria-labelledby="order-summary-heading"
      >
        <header className="border-b border-border px-6 py-4">
          <h2 id="order-summary-heading" className="text-base font-semibold text-foreground">
            Ringkasan pembayaran
          </h2>
        </header>

        <dl className="space-y-3 px-6 py-5 text-sm">
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">Subtotal produk</dt>
            <dd className="font-medium tabular-nums text-foreground">
              Rp {subtotal.toLocaleString("id-ID")}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">Ongkos kirim</dt>
            <dd className="font-medium tabular-nums text-foreground">
              Rp {shippingCost.toLocaleString("id-ID")}
            </dd>
          </div>
          {discount > 0 && appliedCoupon && (
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <dt className="text-success">
                Diskon kupon{" "}
                <span className="font-mono text-xs">({appliedCoupon.code})</span>
              </dt>
              <dd className="font-medium tabular-nums text-success">
                -Rp {discount.toLocaleString("id-ID")}
              </dd>
            </div>
          )}
        </dl>

        {/* Total: aksen gelap agar angka akhir paling menonjol */}
        <div className="mx-4 mb-4 rounded-xl bg-[#10121b] px-5 py-4 text-white">
          <p className="text-xs font-medium uppercase tracking-wide text-white/60">
            Total pembayaran
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            Rp {finalTotal.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="px-4 pb-5">
          <button
            onClick={onCheckout}
            disabled={isLoading || !canCheckout}
            className="btn-primary h-12 w-full py-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Memproses pembayaran..." : "Bayar Sekarang"}
          </button>
          <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
            Pembayaran diproses aman melalui Midtrans dengan enkripsi SSL 256-bit.
          </p>
        </div>
      </section>
    </div>
  );
}
